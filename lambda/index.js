/**
 * Gold Coast Home Buyers — Lead Submission Lambda
 *
 * Receives form data from API Gateway, writes to S3 (source of truth),
 * then syncs to GoHighLevel CRM in parallel. If GHL fails, the lead
 * is still captured in S3.
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
 * Write lead to S3 (source of truth)
 */
async function writeToS3(lead) {
  const now = new Date();
  const datePrefix = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const key = `${datePrefix}/lead-${timestamp}-${lead.phone.slice(-4)}.json`;

  await s3.send(new PutObjectCommand({
    Bucket: LEADS_BUCKET,
    Key: key,
    Body: JSON.stringify(lead, null, 2),
    ContentType: 'application/json',
    ServerSideEncryption: 'AES256'
  }));

  return key;
}

/**
 * Create or update contact in GoHighLevel
 */
async function syncToGHL(lead, apiKey) {
  const payload = JSON.stringify({
    firstName: lead.fullName.split(' ')[0] || '',
    lastName: lead.fullName.split(' ').slice(1).join(' ') || '',
    email: lead.email,
    phone: '+1' + lead.phone,
    address1: lead.address,
    source: 'Website - gcoffers.com',
    tags: ['website-lead', 'cash-offer-request'],
    customField: {
      property_condition: lead.condition || '',
      sell_timeline: lead.timeline || '',
      tcpa_consent: lead.serviceConsent ? 'yes' : (lead.tcpaConsent ? 'yes' : 'no'),
      marketing_consent: lead.marketingConsent ? 'yes' : 'no',
      tcpa_timestamp: lead.tcpaTimestamp,
      lead_source_page: lead.page || '/'
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
 * Validate the incoming lead data
 */
function validateLead(body) {
  var errors = [];

  if (!body.address || body.address.trim().length < 5) {
    errors.push('Property address is required');
  }
  if (!body.phone || body.phone.replace(/\D/g, '').length !== 10) {
    errors.push('Valid 10-digit phone number is required');
  }
  if (!body.fullName || body.fullName.trim().length < 2) {
    errors.push('Full name is required');
  }
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Valid email is required');
  }
  // Consent checkboxes are optional per A2P feedback

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
    var errors = validateLead(body);
    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: 'Validation failed', details: errors })
      };
    }

    // Clean the data
    var lead = {
      address: body.address.trim(),
      phone: body.phone.replace(/\D/g, ''),
      fullName: body.fullName.trim(),
      email: body.email.trim().toLowerCase(),
      condition: body.condition || null,
      timeline: body.timeline || null,
      serviceConsent: body.serviceConsent || false,
      marketingConsent: body.marketingConsent || false,
      tcpaConsent: body.tcpaConsent || body.serviceConsent || false,
      tcpaTimestamp: body.tcpaTimestamp || new Date().toISOString(),
      source: body.source || 'website',
      page: body.page || '/',
      referrer: body.referrer || null,
      userAgent: body.userAgent || null,
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
    s3Key = await writeToS3(lead);

    // GHL sync (best effort, don't fail the request)
    try {
      var apiKey = await ghlKeyPromise;
      if (apiKey) {
        ghlResult = await syncToGHL(lead, apiKey);
      } else {
        ghlError = 'GHL API key not available';
      }
    } catch (err) {
      ghlError = err.message;
      console.error('GHL sync failed (lead still saved to S3):', err.message);
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        success: true,
        message: 'Lead received successfully',
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
