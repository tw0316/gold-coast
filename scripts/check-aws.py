#!/usr/bin/env python3
import boto3
import json
import os

s = boto3.Session(
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    region_name='us-east-1'
)

resources = {}

# S3
print("Checking S3...", flush=True)
s3 = s.client('s3')
for bucket in ['gcoffers-site', 'gcoffers-site-staging', 'goldcoast-leads']:
    try:
        s3.head_bucket(Bucket=bucket)
        print(f"  ✓ {bucket}", flush=True)
        resources[f's3_{bucket}'] = True
    except:
        print(f"  ✗ {bucket}", flush=True)
        resources[f's3_{bucket}'] = False

# Route 53
print("\nChecking Route 53...", flush=True)
r53 = s.client('route53')
zones = r53.list_hosted_zones_by_name(DNSName='gcoffers.com', MaxItems='1')
if zones['HostedZones'] and zones['HostedZones'][0]['Name'] == 'gcoffers.com.':
    zone = zones['HostedZones'][0]
    zone_id = zone['Id'].split('/')[-1]
    print(f"  ✓ Hosted zone: {zone_id}", flush=True)
    resources['route53_zone'] = zone_id
else:
    print("  ✗ No hosted zone", flush=True)
    resources['route53_zone'] = None

# ACM
print("\nChecking ACM certificates...", flush=True)
acm = s.client('acm')
certs = acm.list_certificates(CertificateStatuses=['ISSUED', 'PENDING_VALIDATION'])
found_cert = False
for cert in certs['CertificateSummaryList']:
    if cert['DomainName'] == 'gcoffers.com':
        print(f"  ✓ Certificate: {cert['CertificateArn']}", flush=True)
        detail = acm.describe_certificate(CertificateArn=cert['CertificateArn'])
        print(f"    Status: {detail['Certificate']['Status']}", flush=True)
        resources['acm_cert'] = cert['CertificateArn']
        resources['acm_status'] = detail['Certificate']['Status']
        found_cert = True
        break
if not found_cert:
    print("  ✗ No certificate", flush=True)
    resources['acm_cert'] = None

# Lambda
print("\nChecking Lambda...", flush=True)
lam = s.client('lambda')
try:
    func = lam.get_function(FunctionName='gcoffers-lead-handler')
    print(f"  ✓ Function: {func['Configuration']['FunctionArn']}", flush=True)
    resources['lambda'] = func['Configuration']['FunctionArn']
except lam.exceptions.ResourceNotFoundException:
    print("  ✗ No function", flush=True)
    resources['lambda'] = None

# API Gateway
print("\nChecking API Gateway...", flush=True)
apigw = s.client('apigatewayv2')
apis = apigw.get_apis()
found_api = False
for api in apis['Items']:
    if api['Name'] == 'gcoffers-api':
        print(f"  ✓ API: {api['ApiId']} ({api['ApiEndpoint']})", flush=True)
        resources['api_gateway'] = api['ApiId']
        resources['api_endpoint'] = api['ApiEndpoint']
        found_api = True
        break
if not found_api:
    print("  ✗ No API", flush=True)
    resources['api_gateway'] = None

# CloudFront
print("\nChecking CloudFront...", flush=True)
cf = s.client('cloudfront')
dists = cf.list_distributions()
for dist in dists.get('DistributionList', {}).get('Items', []):
    aliases = dist.get('Aliases', {}).get('Items', [])
    if 'gcoffers.com' in aliases:
        print(f"  ✓ Prod distribution: {dist['Id']} ({dist['DomainName']})", flush=True)
        resources['cloudfront_prod'] = dist['Id']
    if 'staging.gcoffers.com' in aliases:
        print(f"  ✓ Staging distribution: {dist['Id']} ({dist['DomainName']})", flush=True)
        resources['cloudfront_staging'] = dist['Id']

if 'cloudfront_prod' not in resources:
    print("  ✗ No prod distribution", flush=True)
    resources['cloudfront_prod'] = None
if 'cloudfront_staging' not in resources:
    print("  ✗ No staging distribution", flush=True)
    resources['cloudfront_staging'] = None

# Secrets Manager
print("\nChecking Secrets Manager...", flush=True)
sm = s.client('secretsmanager')
try:
    sm.describe_secret(SecretId='goldcoast/ghl-api-key')
    print("  ✓ GHL API key stored", flush=True)
    resources['secrets'] = True
except sm.exceptions.ResourceNotFoundException:
    print("  ✗ No secret", flush=True)
    resources['secrets'] = False

print("\n" + "="*60, flush=True)
print("Summary:", flush=True)
print(json.dumps(resources, indent=2), flush=True)
