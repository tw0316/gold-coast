/**
 * Gold Coast Home Buyers — Buyer Signup Lambda
 *
 * Receives buyer list signup data from API Gateway,
 * writes to S3 (source of truth), then syncs to GoHighLevel CRM.
 * Same architecture as lambda/index.js (seller leads).
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const https = require('https');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const secrets = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

const LEADS_BUCKET = process.env.LEADS_BUCKET || 'goldcoast-leads';
const GHL_SECRET_NAME = process.env.GHL_SECRET_NAME || 'goldcoast/ghl-api-key';

// Cache the GHL API key across invocations
let cachedGhlKey = null;

async function getGhlApiKey() {
  if (cachedGhlKey) return cachedGhlKey;
  try {
    const result = await secrets.send(new GetSecretValueCommand({ SecretId: GHL_SECRET_NAME }));
    cachedGhlKey = result.SecretString;
    return cachedGhlKey;
  } catch (err) {
    console.error('Failed to retrieve GHL API key from Secrets Manager:', err.message);
    return null;
  }
}

/**
 * Write buyer signup to S3 (source of truth)
 */
async function writeToS3(buyer) {
  const now = new Date();
  const datePrefix = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const key = `buyer-signups/${datePrefix}/buyer-${timestamp}-${buyer.phone.slice(-4)}.json`;

  await s3.send(new PutObjectCommand({
    Bucket: LEADS_BUCKET,
    Key: key,
    Body: JSON.stringify(buyer, null, 2),
    ContentType: 'application/json',
    ServerSideEncryption: 'AES256'
  }));

  return key;
}

/**
 * Create or update contact in GoHighLevel
 * Maps buyer signup fields to GHL contact per PRD Section 8
 */
async function syncToGHL(buyer, apiKey) {
  const nameParts = buyer.fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const payload = JSON.stringify({
    firstName: firstName,
    lastName: lastName,
    email: buyer.email,
    phone: '+1' + buyer.phone,
    source: 'Deals Website - deals.gcoffers.com',
    tags: ['buyer-list', 'deals-website'],
    customField: {
      buyer_type: buyer.buyerType || '',
      buy_areas: (buyer.areas || []).join(', '),
      property_types: (buyer.propertyTypes || []).join(', '),
      price_range: buyer.priceRange || '',
      purchase_method: buyer.purchaseMethod || '',
      service_consent: 'yes',
      marketing_consent: buyer.marketingConsent ? 'yes' : 'no',
      consent_timestamp: buyer.consentTimestamp
    }
  });

  return new Promise(function (resolve, reject) {
    var options = {
      hostname: 'rest.gohighlevel.com',
      path: '/v1/contacts/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000
    };

    var req = https.request(options, function (res) {
      var body = '';
      res.on('data', function (chunk) { body += chunk; });
      res.on('end', function () {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error('GHL API error: ' + res.statusCode + ' ' + body));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy();
      reject(new Error('GHL API timeout'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Validate the incoming buyer signup data
 */
function validateBuyerSignup(body) {
  var errors = [];

  if (!body.fullName || body.fullName.trim().length < 2) {
    errors.push('Full name is required');
  }
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Valid email is required');
  }
  if (!body.phone || body.phone.replace(/\D/g, '').length !== 10) {
    errors.push('Valid 10-digit phone number is required');
  }
  if (!body.buyerType) {
    errors.push('Buyer type is required');
  }
  if (!body.areas || !Array.isArray(body.areas) || body.areas.length === 0) {
    errors.push('At least one area must be selected');
  }
  if (!body.serviceConsent) {
    errors.push('Service SMS consent is required');
  }

  return errors;
}

/**
 * Lambda handler
 */
exports.handler = async function (event) {
  // CORS headers
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  try {
    var body = JSON.parse(event.body || '{}');

    // Validate
    var errors = validateBuyerSignup(body);
    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: 'Validation failed', details: errors })
      };
    }

    // Clean the data
    var buyer = {
      fullName: body.fullName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.replace(/\D/g, ''),
      buyerType: body.buyerType,
      areas: body.areas || [],
      propertyTypes: body.propertyTypes || [],
      priceRange: body.priceRange || null,
      purchaseMethod: body.purchaseMethod || null,
      serviceConsent: true,
      marketingConsent: body.marketingConsent || false,
      consentTimestamp: body.consentTimestamp || new Date().toISOString(),
      source: 'deals-website',
      submittedAt: new Date().toISOString(),
      ip: event.requestContext && event.requestContext.identity
        ? event.requestContext.identity.sourceIp
        : null
    };

    // Write to S3 and GHL in parallel
    // S3 is the source of truth. GHL is best-effort.
    var s3Key = null;
    var ghlResult = null;
    var ghlError = null;

    var ghlKeyPromise = getGhlApiKey();

    // S3 write (must succeed)
    s3Key = await writeToS3(buyer);

    // GHL sync (best effort, don't fail the request)
    try {
      var apiKey = await ghlKeyPromise;
      if (apiKey) {
        ghlResult = await syncToGHL(buyer, apiKey);
      } else {
        ghlError = 'GHL API key not available';
      }
    } catch (err) {
      ghlError = err.message;
      console.error('GHL sync failed (buyer still saved to S3):', err.message);
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        success: true,
        message: 'Buyer signup received successfully',
        s3Key: s3Key,
        ghlSynced: ghlResult ? true : false,
        ghlError: ghlError || undefined
      })
    };

  } catch (err) {
    console.error('Lambda error:', err);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
