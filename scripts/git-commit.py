#!/usr/bin/env python3
import subprocess
import os

os.chdir('/Users/jarvis/Projects/goldcoast-website')

print("Adding files...", flush=True)
subprocess.run(['git', 'add', '-A'], check=True)

print("Committing...", flush=True)
subprocess.run([
    'git', 'commit', '-m',
    '''Initial commit: Gold Coast Home Buyers website

- Static HTML/CSS/JS lead gen site
- Lambda function for form submissions
- S3 + CloudFront + Route 53 infrastructure setup
- Two-step form with TCPA compliance
- Privacy policy and terms of service'''
], check=True)

print("Done!", flush=True)
