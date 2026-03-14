#!/usr/bin/env python3
import boto3
import sys

import os

print("Connecting to AWS...", flush=True)
s = boto3.Session(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    region_name="us-east-1"
)

print("Creating S3 client...", flush=True)
s3 = s.client('s3')

print("Creating buckets...", flush=True)
for bucket in ['gcoffers-site', 'gcoffers-site-staging', 'goldcoast-leads']:
    try:
        s3.head_bucket(Bucket=bucket)
        print(f"  {bucket}: exists", flush=True)
    except:
        print(f"  {bucket}: creating...", flush=True)
        s3.create_bucket(Bucket=bucket)
        print(f"  {bucket}: created", flush=True)

print("Done!", flush=True)
