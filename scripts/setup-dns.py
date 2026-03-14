#!/usr/bin/env python3
import boto3
import json

import os

s = boto3.Session(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    region_name="us-east-1"
)

r53 = s.client('route53')
acm = s.client('acm')

# Get zone
zone_id = 'Z00488533G8QVLLZQK5L6'
zone = r53.get_hosted_zone(Id=zone_id)
nameservers = zone['DelegationSet']['NameServers']

print("Route 53 Nameservers (set these in Namecheap):", flush=True)
for ns in nameservers:
    print(f"  {ns}", flush=True)

# Get cert validation records
cert_arn = 'arn:aws:acm:us-east-1:108750423275:certificate/2135d6a8-d734-42d2-aaca-294d30a4f226'
cert = acm.describe_certificate(CertificateArn=cert_arn)

print("\nACM Validation Records:", flush=True)
changes = []
for opt in cert['Certificate']['DomainValidationOptions']:
    if 'ResourceRecord' in opt:
        rr = opt['ResourceRecord']
        print(f"  Domain: {opt['DomainName']}", flush=True)
        print(f"  Type: {rr['Type']}", flush=True)
        print(f"  Name: {rr['Name']}", flush=True)
        print(f"  Value: {rr['Value']}", flush=True)
        print(flush=True)
        
        changes.append({
            'Action': 'UPSERT',
            'ResourceRecordSet': {
                'Name': rr['Name'],
                'Type': rr['Type'],
                'TTL': 300,
                'ResourceRecords': [{'Value': rr['Value']}]
            }
        })

if changes:
    print("Adding validation records to Route 53...", flush=True)
    r53.change_resource_record_sets(
        HostedZoneId=zone_id,
        ChangeBatch={'Changes': changes}
    )
    print("  ✓ Added validation records", flush=True)
else:
    print("No validation records to add (already exist or not available yet)", flush=True)

print("\nNext steps:", flush=True)
print("1. Go to Namecheap and set custom DNS to the nameservers above", flush=True)
print("2. Wait 5-30 minutes for cert validation to complete", flush=True)
print("3. Run setup-cloudfront.py to create distributions", flush=True)
