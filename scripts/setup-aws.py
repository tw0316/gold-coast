#!/usr/bin/env python3
"""
Gold Coast Home Buyers — AWS Infrastructure Setup
Creates all AWS resources for prod and staging environments.
"""

import boto3
import json
import time
import sys
import os

# ---- Config ----
REGION = 'us-east-1'
DOMAIN = 'gcoffers.com'
HOME_IP = '76.128.41.131'

# Read credentials
creds_path = os.path.expanduser('~/.openclaw/workspace/aws-credentials.txt')
with open(creds_path) as f:
    creds_text = f.read()

# Parse credentials
creds = {}
for line in creds_text.strip().split('\n'):
    if '=' in line:
        key, val = line.split('=', 1)
        creds[key.strip()] = val.strip()

AWS_ACCESS_KEY = creds.get('AWS_ACCESS_KEY_ID', creds.get('aws_access_key_id', ''))
AWS_SECRET_KEY = creds.get('AWS_SECRET_ACCESS_KEY', creds.get('aws_secret_access_key', ''))

# Read GHL API key
ghl_path = os.path.expanduser('~/.openclaw/workspace/ghl-api-key.txt')
with open(ghl_path) as f:
    GHL_API_KEY = f.read().strip()

# ---- Boto3 Clients ----
session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=REGION
)

s3 = session.client('s3')
cf = session.client('cloudfront')
route53 = session.client('route53')
acm = session.client('acm', region_name='us-east-1')
lam = session.client('lambda')
apigw = session.client('apigatewayv2')
iam = session.client('iam')
sm = session.client('secretsmanager')
wafv2 = session.client('wafv2', region_name='us-east-1')
sts = session.client('sts')

# ---- Verify credentials ----
print("Verifying AWS credentials...")
identity = sts.get_caller_identity()
print(f"  Account: {identity['Account']}")
print(f"  ARN: {identity['Arn']}")
ACCOUNT_ID = identity['Account']

results = {}

# ---- Step 1: S3 Buckets ----
def create_bucket(name):
    try:
        s3.head_bucket(Bucket=name)
        print(f"  Bucket {name} already exists")
    except:
        s3.create_bucket(Bucket=name)
        print(f"  Created bucket {name}")
    
    # Block public access
    s3.put_public_access_block(
        Bucket=name,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': True,
            'IgnorePublicAcls': True,
            'BlockPublicPolicy': True,
            'RestrictPublicBuckets': True
        }
    )

print("\n1. Creating S3 buckets...")
create_bucket('gcoffers-site')
create_bucket('gcoffers-site-staging')
create_bucket('goldcoast-leads')

# Enable versioning on leads bucket
s3.put_bucket_versioning(
    Bucket='goldcoast-leads',
    VersioningConfiguration={'Status': 'Enabled'}
)

# Enable encryption on leads bucket
s3.put_bucket_encryption(
    Bucket='goldcoast-leads',
    ServerSideEncryptionConfiguration={
        'Rules': [{'ApplyServerSideEncryptionByDefault': {'SSEAlgorithm': 'AES256'}}]
    }
)
print("  Leads bucket: versioning + encryption enabled")

# ---- Step 2: Route 53 Hosted Zone ----
print("\n2. Setting up Route 53...")
zones = route53.list_hosted_zones_by_name(DNSName=DOMAIN, MaxItems='1')
zone_id = None
for zone in zones['HostedZones']:
    if zone['Name'] == DOMAIN + '.':
        zone_id = zone['Id'].split('/')[-1]
        print(f"  Hosted zone already exists: {zone_id}")
        break

if not zone_id:
    resp = route53.create_hosted_zone(
        Name=DOMAIN,
        CallerReference=f'gcoffers-{int(time.time())}'
    )
    zone_id = resp['HostedZone']['Id'].split('/')[-1]
    print(f"  Created hosted zone: {zone_id}")

# Get nameservers
zone_detail = route53.get_hosted_zone(Id=zone_id)
nameservers = zone_detail['DelegationSet']['NameServers']
print(f"  Nameservers: {nameservers}")
results['nameservers'] = nameservers
results['zone_id'] = zone_id

# ---- Step 3: ACM Certificate ----
print("\n3. Requesting SSL certificate...")
certs = acm.list_certificates(CertificateStatuses=['ISSUED', 'PENDING_VALIDATION'])
cert_arn = None
for cert in certs['CertificateSummaryList']:
    if cert['DomainName'] == DOMAIN:
        cert_arn = cert['CertificateArn']
        print(f"  Certificate already exists: {cert_arn}")
        break

if not cert_arn:
    resp = acm.request_certificate(
        DomainName=DOMAIN,
        SubjectAlternativeNames=[f'*.{DOMAIN}'],
        ValidationMethod='DNS'
    )
    cert_arn = resp['CertificateArn']
    print(f"  Requested certificate: {cert_arn}")
    
    # Wait for validation options
    time.sleep(5)
    cert_detail = acm.describe_certificate(CertificateArn=cert_arn)
    
    # Add DNS validation records
    for option in cert_detail['Certificate']['DomainValidationOptions']:
        if 'ResourceRecord' in option:
            rr = option['ResourceRecord']
            route53.change_resource_record_sets(
                HostedZoneId=zone_id,
                ChangeBatch={
                    'Changes': [{
                        'Action': 'UPSERT',
                        'ResourceRecordSet': {
                            'Name': rr['Name'],
                            'Type': rr['Type'],
                            'TTL': 300,
                            'ResourceRecords': [{'Value': rr['Value']}]
                        }
                    }]
                }
            )
            print(f"  Added DNS validation record: {rr['Name']}")

results['cert_arn'] = cert_arn

# ---- Step 4: Secrets Manager (GHL API Key) ----
print("\n4. Storing GHL API key in Secrets Manager...")
try:
    sm.describe_secret(SecretId='goldcoast/ghl-api-key')
    sm.update_secret(SecretId='goldcoast/ghl-api-key', SecretString=GHL_API_KEY)
    print("  Updated existing secret")
except sm.exceptions.ResourceNotFoundException:
    sm.create_secret(Name='goldcoast/ghl-api-key', SecretString=GHL_API_KEY)
    print("  Created secret")

# ---- Step 5: IAM Role for Lambda ----
print("\n5. Creating IAM role for Lambda...")
LAMBDA_ROLE_NAME = 'gcoffers-lambda-role'

trust_policy = json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
})

try:
    role = iam.get_role(RoleName=LAMBDA_ROLE_NAME)
    role_arn = role['Role']['Arn']
    print(f"  Role already exists: {role_arn}")
except iam.exceptions.NoSuchEntityException:
    role = iam.create_role(
        RoleName=LAMBDA_ROLE_NAME,
        AssumeRolePolicyDocument=trust_policy,
        Description='Lambda role for Gold Coast Home Buyers lead handler'
    )
    role_arn = role['Role']['Arn']
    print(f"  Created role: {role_arn}")
    time.sleep(10)  # Wait for role propagation

# Attach inline policy
policy_doc = json.dumps({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": ["s3:PutObject"],
            "Resource": "arn:aws:s3:::goldcoast-leads/*"
        },
        {
            "Effect": "Allow",
            "Action": ["secretsmanager:GetSecretValue"],
            "Resource": f"arn:aws:secretsmanager:{REGION}:{ACCOUNT_ID}:secret:goldcoast/ghl-api-key*"
        }
    ]
})

iam.put_role_policy(
    RoleName=LAMBDA_ROLE_NAME,
    PolicyName='gcoffers-lambda-policy',
    PolicyDocument=policy_doc
)
print("  Attached inline policy")
results['lambda_role_arn'] = role_arn

# ---- Step 6: Lambda Function ----
print("\n6. Creating Lambda function...")

# Create zip of lambda code
import zipfile
import io

lambda_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lambda')
zip_buffer = io.BytesIO()
with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
    for filename in ['index.js', 'package.json']:
        filepath = os.path.join(lambda_dir, filename)
        if os.path.exists(filepath):
            zf.write(filepath, filename)

zip_buffer.seek(0)
zip_bytes = zip_buffer.read()

FUNCTION_NAME = 'gcoffers-lead-handler'
try:
    lam.get_function(FunctionName=FUNCTION_NAME)
    lam.update_function_code(
        FunctionName=FUNCTION_NAME,
        ZipFile=zip_bytes
    )
    print(f"  Updated function: {FUNCTION_NAME}")
except lam.exceptions.ResourceNotFoundException:
    # Wait a bit more for role propagation
    time.sleep(5)
    lam.create_function(
        FunctionName=FUNCTION_NAME,
        Runtime='nodejs20.x',
        Role=role_arn,
        Handler='index.handler',
        Code={'ZipFile': zip_bytes},
        Timeout=15,
        MemorySize=256,
        Environment={
            'Variables': {
                'LEADS_BUCKET': 'goldcoast-leads',
                'GHL_SECRET_NAME': 'goldcoast/ghl-api-key',
                'ENVIRONMENT': 'prod'
            }
        }
    )
    print(f"  Created function: {FUNCTION_NAME}")

# Get function ARN
func = lam.get_function(FunctionName=FUNCTION_NAME)
function_arn = func['Configuration']['FunctionArn']
results['lambda_arn'] = function_arn

# ---- Step 7: API Gateway ----
print("\n7. Creating API Gateway...")
API_NAME = 'gcoffers-api'

# Check existing
apis = apigw.get_apis()
api_id = None
for api in apis['Items']:
    if api['Name'] == API_NAME:
        api_id = api['ApiId']
        api_endpoint = api['ApiEndpoint']
        print(f"  API already exists: {api_id} ({api_endpoint})")
        break

if not api_id:
    api = apigw.create_api(
        Name=API_NAME,
        ProtocolType='HTTP',
        CorsConfiguration={
            'AllowOrigins': [f'https://{DOMAIN}', f'https://staging.{DOMAIN}'],
            'AllowMethods': ['POST', 'OPTIONS'],
            'AllowHeaders': ['Content-Type'],
            'MaxAge': 3600
        }
    )
    api_id = api['ApiId']
    api_endpoint = api['ApiEndpoint']
    print(f"  Created API: {api_id} ({api_endpoint})")

results['api_id'] = api_id
results['api_endpoint'] = api_endpoint

# Create/update integration
integrations = apigw.get_integrations(ApiId=api_id)
integration_id = None
for integ in integrations['Items']:
    if integ.get('IntegrationUri') == function_arn:
        integration_id = integ['IntegrationId']
        break

if not integration_id:
    integ = apigw.create_integration(
        ApiId=api_id,
        IntegrationType='AWS_PROXY',
        IntegrationUri=function_arn,
        IntegrationMethod='POST',
        PayloadFormatVersion='2.0'
    )
    integration_id = integ['IntegrationId']
    print(f"  Created integration: {integration_id}")

# Create route
routes = apigw.get_routes(ApiId=api_id)
route_exists = False
for route in routes['Items']:
    if route['RouteKey'] == 'POST /api/submit-lead':
        route_exists = True
        break

if not route_exists:
    apigw.create_route(
        ApiId=api_id,
        RouteKey='POST /api/submit-lead',
        Target=f'integrations/{integration_id}'
    )
    print("  Created route: POST /api/submit-lead")

# Create default stage
stages = apigw.get_stages(ApiId=api_id)
stage_exists = False
for stage in stages['Items']:
    if stage['StageName'] == '$default':
        stage_exists = True
        break

if not stage_exists:
    apigw.create_stage(
        ApiId=api_id,
        StageName='$default',
        AutoDeploy=True
    )
    print("  Created $default stage")

# Lambda permission for API Gateway
try:
    lam.add_permission(
        FunctionName=FUNCTION_NAME,
        StatementId='AllowAPIGateway',
        Action='lambda:InvokeFunction',
        Principal='apigateway.amazonaws.com',
        SourceArn=f'arn:aws:execute-api:{REGION}:{ACCOUNT_ID}:{api_id}/*/*'
    )
    print("  Added Lambda permission for API Gateway")
except lam.exceptions.ResourceConflictException:
    print("  Lambda permission already exists")

# ---- Step 8: CloudFront OAC ----
print("\n8. Creating CloudFront distributions...")

# Create OAC
oacs = cf.list_origin_access_controls()
oac_id = None
for oac in oacs['OriginAccessControlList'].get('Items', []):
    if oac['Name'] == 'gcoffers-site-oac':
        oac_id = oac['Id']
        print(f"  OAC already exists: {oac_id}")
        break

if not oac_id:
    oac = cf.create_origin_access_control(
        OriginAccessControlConfig={
            'Name': 'gcoffers-site-oac',
            'OriginAccessControlOriginType': 's3',
            'SigningBehavior': 'always',
            'SigningProtocol': 'sigv4'
        }
    )
    oac_id = oac['OriginAccessControl']['Id']
    print(f"  Created OAC: {oac_id}")

results['oac_id'] = oac_id

# Wait for cert validation
print("\n  Waiting for SSL certificate validation...")
cert_status = 'PENDING_VALIDATION'
wait_count = 0
while cert_status != 'ISSUED' and wait_count < 60:
    cert_detail = acm.describe_certificate(CertificateArn=cert_arn)
    cert_status = cert_detail['Certificate']['Status']
    if cert_status == 'ISSUED':
        print("  Certificate validated!")
        break
    wait_count += 1
    if wait_count % 10 == 0:
        print(f"  Still waiting for cert validation... ({wait_count * 10}s)")
    time.sleep(10)

if cert_status != 'ISSUED':
    print(f"  WARNING: Certificate not yet validated (status: {cert_status})")
    print("  CloudFront creation will proceed but may fail. Update Namecheap nameservers first.")
    print(f"  Nameservers to set: {nameservers}")

# ---- Step 9: Create CloudFront distribution for PROD ----
def find_distribution(domain_alias):
    dists = cf.list_distributions()
    for dist in dists['DistributionList'].get('Items', []):
        aliases = dist.get('Aliases', {}).get('Items', [])
        if domain_alias in aliases:
            return dist['Id'], dist['DomainName']
    return None, None

prod_dist_id, prod_cf_domain = find_distribution(DOMAIN)
if prod_dist_id:
    print(f"  Prod distribution already exists: {prod_dist_id}")
else:
    if cert_status == 'ISSUED':
        api_domain = api_endpoint.replace('https://', '')
        dist_config = {
            'CallerReference': f'gcoffers-prod-{int(time.time())}',
            'Aliases': {'Quantity': 1, 'Items': [DOMAIN]},
            'DefaultRootObject': 'index.html',
            'Origins': {
                'Quantity': 2,
                'Items': [
                    {
                        'Id': 's3-site',
                        'DomainName': f'gcoffers-site.s3.{REGION}.amazonaws.com',
                        'OriginAccessControlId': oac_id,
                        'S3OriginConfig': {'OriginAccessIdentity': ''}
                    },
                    {
                        'Id': 'api-gateway',
                        'DomainName': api_domain,
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
                'AllowedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD'], 'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}},
                'ForwardedValues': {'QueryString': False, 'Cookies': {'Forward': 'none'}},
                'MinTTL': 0,
                'DefaultTTL': 3600,
                'MaxTTL': 86400,
                'Compress': True
            },
            'CacheBehaviors': {
                'Quantity': 1,
                'Items': [{
                    'PathPattern': '/api/*',
                    'TargetOriginId': 'api-gateway',
                    'ViewerProtocolPolicy': 'https-only',
                    'AllowedMethods': {'Quantity': 7, 'Items': ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'], 'CachedMethods': {'Quantity': 2, 'Items': ['GET', 'HEAD']}},
                    'ForwardedValues': {
                        'QueryString': True,
                        'Cookies': {'Forward': 'none'},
                        'Headers': {'Quantity': 3, 'Items': ['Origin', 'Access-Control-Request-Headers', 'Access-Control-Request-Method']}
                    },
                    'MinTTL': 0,
                    'DefaultTTL': 0,
                    'MaxTTL': 0
                }]
            },
            'CustomErrorResponses': {
                'Quantity': 2,
                'Items': [
                    {'ErrorCode': 403, 'ResponseCode': '200', 'ResponsePagePath': '/index.html', 'ErrorCachingMinTTL': 10},
                    {'ErrorCode': 404, 'ResponseCode': '200', 'ResponsePagePath': '/index.html', 'ErrorCachingMinTTL': 10}
                ]
            },
            'Comment': 'Gold Coast Home Buyers - Production',
            'Enabled': True,
            'ViewerCertificate': {
                'ACMCertificateArn': cert_arn,
                'SSLSupportMethod': 'sni-only',
                'MinimumProtocolVersion': 'TLSv1.2_2021'
            },
            'Restrictions': {'GeoRestriction': {'RestrictionType': 'none', 'Quantity': 0}},
            'PriceClass': 'PriceClass_100',
            'HttpVersion': 'http2'
        }
        
        dist = cf.create_distribution(DistributionConfig=dist_config)
        prod_dist_id = dist['Distribution']['Id']
        prod_cf_domain = dist['Distribution']['DomainName']
        print(f"  Created prod distribution: {prod_dist_id} ({prod_cf_domain})")
    else:
        print("  SKIPPING prod CloudFront (cert not ready). Re-run after cert validates.")

results['prod_dist_id'] = prod_dist_id
results['prod_cf_domain'] = prod_cf_domain

# ---- Step 10: S3 Bucket Policy for CloudFront ----
if prod_dist_id:
    print("\n9. Setting S3 bucket policies...")
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
    s3.put_bucket_policy(Bucket='gcoffers-site', Policy=bucket_policy)
    print("  Set prod bucket policy")

# ---- Step 11: Route 53 A Record ----
if prod_cf_domain:
    print("\n10. Creating DNS records...")
    route53.change_resource_record_sets(
        HostedZoneId=zone_id,
        ChangeBatch={
            'Changes': [{
                'Action': 'UPSERT',
                'ResourceRecordSet': {
                    'Name': DOMAIN,
                    'Type': 'A',
                    'AliasTarget': {
                        'HostedZoneId': 'Z2FDTNDATAQYW2',  # CloudFront hosted zone ID (constant)
                        'DNSName': prod_cf_domain,
                        'EvaluateTargetHealth': False
                    }
                }
            }]
        }
    )
    print(f"  Created A record: {DOMAIN} -> {prod_cf_domain}")

# ---- Summary ----
print("\n" + "=" * 60)
print("  SETUP COMPLETE")
print("=" * 60)
print(f"  Zone ID: {zone_id}")
print(f"  Nameservers: {', '.join(nameservers)}")
print(f"  Certificate ARN: {cert_arn}")
print(f"  Certificate Status: {cert_status}")
print(f"  Lambda ARN: {function_arn}")
print(f"  API Gateway: {api_endpoint}")
if prod_dist_id:
    print(f"  Prod CloudFront: {prod_dist_id} ({prod_cf_domain})")
print(f"\n  NEXT STEPS:")
print(f"  1. Update Namecheap nameservers to: {', '.join(nameservers)}")
print(f"  2. Wait for cert validation (if pending)")
print(f"  3. Upload site files to S3")
print(f"  4. Update API endpoint in main.js to: {api_endpoint}/api/submit-lead")

# Save results
results_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'infra', 'aws-resources.json')
with open(results_path, 'w') as f:
    json.dump(results, f, indent=2)
print(f"\n  Results saved to: {results_path}")
