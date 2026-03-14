#!/usr/bin/env python3
"""Create CloudFront distributions for prod and staging"""
import boto3
import time
import json

import os

s = boto3.Session(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    region_name="us-east-1"
)

cf = s.client('cloudfront')
s3_client = s.client('s3')
r53 = s.client('route53')
acm = s.client('acm')
sts = s.client('sts')

ACCOUNT_ID = sts.get_caller_identity()['Account']
CERT_ARN = 'arn:aws:acm:us-east-1:108750423275:certificate/2135d6a8-d734-42d2-aaca-294d30a4f226'
API_DOMAIN = 'nifdys6vre.execute-api.us-east-1.amazonaws.com'
ZONE_ID = 'Z00488533G8QVLLZQK5L6'
OAC_ID = None

# Check cert status
print("Checking certificate status...", flush=True)
cert = acm.describe_certificate(CertificateArn=CERT_ARN)
status = cert['Certificate']['Status']
print(f"  Certificate status: {status}", flush=True)

if status != 'ISSUED':
    print(f"\n❌ Certificate not yet validated. Current status: {status}", flush=True)
    print("Update Namecheap nameservers and wait for validation.", flush=True)
    exit(1)

# Get or create OAC
print("\nChecking OAC...", flush=True)
oacs = cf.list_origin_access_controls()
for oac in oacs['OriginAccessControlList'].get('Items', []):
    if oac['Name'] == 'gcoffers-site-oac':
        OAC_ID = oac['Id']
        print(f"  ✓ Using existing OAC: {OAC_ID}", flush=True)
        break

if not OAC_ID:
    oac = cf.create_origin_access_control(
        OriginAccessControlConfig={
            'Name': 'gcoffers-site-oac',
            'OriginAccessControlOriginType': 's3',
            'SigningBehavior': 'always',
            'SigningProtocol': 'sigv4'
        }
    )
    OAC_ID = oac['OriginAccessControl']['Id']
    print(f"  ✓ Created OAC: {OAC_ID}", flush=True)

# Distribution config template
def distribution_config(domain, bucket, comment):
    return {
        'CallerReference': f'{domain}-{int(time.time())}',
        'Aliases': {'Quantity': 1, 'Items': [domain]},
        'DefaultRootObject': 'index.html',
        'Origins': {
            'Quantity': 2,
            'Items': [
                {
                    'Id': 's3-site',
                    'DomainName': f'{bucket}.s3.us-east-1.amazonaws.com',
                    'OriginAccessControlId': OAC_ID,
                    'S3OriginConfig': {'OriginAccessIdentity': ''}
                },
                {
                    'Id': 'api-gateway',
                    'DomainName': API_DOMAIN,
                    'CustomOriginConfig': {
                        'HTTPPort': 80,
                        'HTTPSPort': 443,
                        'OriginProtocolPolicy': 'https-only',
                        'OriginSslProtocols': {'Quantity': 1, 'Items': ['TLSv1.2']}
                    }
                }
            ]
        },
        'DefaultCacheBehavior': {
            'TargetOriginId': 's3-site',
            'ViewerProtocolPolicy': 'redirect-to-https',
            'AllowedMethods': {
                'Quantity': 2,
                'Items': ['GET', 'HEAD'],
                'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}
            },
            'ForwardedValues': {
                'QueryString': False,
                'Cookies': {'Forward': 'none'}
            },
            'MinTTL': 0,
            'DefaultTTL': 3600,
            'MaxTTL': 86400,
            'Compress': True,
            'TrustedSigners': {'Enabled': False, 'Quantity': 0}
        },
        'CacheBehaviors': {
            'Quantity': 1,
            'Items': [{
                'PathPattern': '/api/*',
                'TargetOriginId': 'api-gateway',
                'ViewerProtocolPolicy': 'https-only',
                'AllowedMethods': {
                    'Quantity': 7,
                    'Items': ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
                    'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}
                },
                'ForwardedValues': {
                    'QueryString': True,
                    'Cookies': {'Forward': 'none'},
                    'Headers': {
                        'Quantity': 3,
                        'Items': ['Origin', 'Access-Control-Request-Headers', 'Access-Control-Request-Method']
                    }
                },
                'MinTTL': 0,
                'DefaultTTL': 0,
                'MaxTTL': 0,
                'TrustedSigners': {'Enabled': False, 'Quantity': 0}
            }]
        },
        'CustomErrorResponses': {
            'Quantity': 2,
            'Items': [
                {'ErrorCode': 403, 'ResponseCode': '200', 'ResponsePagePath': '/index.html', 'ErrorCachingMinTTL': 10},
                {'ErrorCode': 404, 'ResponseCode': '200', 'ResponsePagePath': '/index.html', 'ErrorCachingMinTTL': 10}
            ]
        },
        'Comment': comment,
        'Enabled': True,
        'ViewerCertificate': {
            'ACMCertificateArn': CERT_ARN,
            'SSLSupportMethod': 'sni-only',
            'MinimumProtocolVersion': 'TLSv1.2_2021'
        },
        'Restrictions': {'GeoRestriction': {'RestrictionType': 'none', 'Quantity': 0}},
        'PriceClass': 'PriceClass_100',
        'HttpVersion': 'http2'
    }

# Create prod distribution
print("\nCreating production distribution...", flush=True)
prod_config = distribution_config('gcoffers.com', 'gcoffers-site', 'Gold Coast Home Buyers - Production')
prod = cf.create_distribution(DistributionConfig=prod_config)
prod_dist_id = prod['Distribution']['Id']
prod_cf_domain = prod['Distribution']['DomainName']
print(f"  ✓ Created: {prod_dist_id} ({prod_cf_domain})", flush=True)

# Set bucket policy for prod
print("\nSetting bucket policy for gcoffers-site...", flush=True)
bucket_policy = json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "AllowCloudFrontOAC",
        "Effect": "Allow",
        "Principal": {"Service": "cloudfront.amazonaws.com"},
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::gcoffers-site/*",
        "Condition": {
            "StringEquals": {
                "AWS:SourceArn": f"arn:aws:cloudfront::{ACCOUNT_ID}:distribution/{prod_dist_id}"
            }
        }
    }]
})
s3_client.put_bucket_policy(Bucket='gcoffers-site', Policy=bucket_policy)
print("  ✓ Bucket policy set", flush=True)

# Create DNS record for prod
print("\nCreating DNS record for gcoffers.com...", flush=True)
r53.change_resource_record_sets(
    HostedZoneId=ZONE_ID,
    ChangeBatch={
        'Changes': [{
            'Action': 'UPSERT',
            'ResourceRecordSet': {
                'Name': 'gcoffers.com',
                'Type': 'A',
                'AliasTarget': {
                    'HostedZoneId': 'Z2FDTNDATAQYW2',
                    'DNSName': prod_cf_domain,
                    'EvaluateTargetHealth': False
                }
            }
        }]
    }
)
print("  ✓ DNS record created", flush=True)

print("\n" + "="*60, flush=True)
print("✅ DEPLOYMENT COMPLETE", flush=True)
print("="*60, flush=True)
print(f"Production URL: https://gcoffers.com", flush=True)
print(f"CloudFront ID: {prod_dist_id}", flush=True)
print(f"\nWait ~15 minutes for CloudFront to propagate globally.", flush=True)
print(f"\nTest checklist:", flush=True)
print(f"  1. Visit https://gcoffers.com", flush=True)
print(f"  2. Fill out Step 1 form (address + phone)", flush=True)
print(f"  3. Fill out Step 2 form (name + email + TCPA)", flush=True)
print(f"  4. Check S3 goldcoast-leads bucket for lead JSON", flush=True)
print(f"  5. Check GoHighLevel CRM for new contact", flush=True)
