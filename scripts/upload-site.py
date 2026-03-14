#!/usr/bin/env python3
import boto3
import os
import mimetypes
from pathlib import Path

import os

s = boto3.Session(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    region_name="us-east-1"
)

s3 = s.client('s3')
BUCKET = 'gcoffers-site'
SITE_DIR = Path('/Users/jarvis/Projects/goldcoast-website/site')

print(f"Uploading site to s3://{BUCKET}/", flush=True)

file_count = 0
for filepath in SITE_DIR.rglob('*'):
    if filepath.is_file() and not filepath.name.startswith('.'):
        relative = filepath.relative_to(SITE_DIR)
        key = str(relative)
        
        # Guess content type
        content_type, _ = mimetypes.guess_type(str(filepath))
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Cache control
        if filepath.suffix in ['.css', '.js']:
            cache = 'public, max-age=31536000, immutable'
        elif filepath.suffix in ['.html']:
            cache = 'public, max-age=3600'
        else:
            cache = 'public, max-age=86400'
        
        print(f"  {key} ({content_type})", flush=True)
        
        with open(filepath, 'rb') as f:
            s3.put_object(
                Bucket=BUCKET,
                Key=key,
                Body=f,
                ContentType=content_type,
                CacheControl=cache
            )
        file_count += 1

print(f"\n✓ Uploaded {file_count} files", flush=True)
print(f"\nSite URL (once CloudFront is set up): https://gcoffers.com", flush=True)
print(f"S3 URL (for testing): http://{BUCKET}.s3-website-us-east-1.amazonaws.com", flush=True)
