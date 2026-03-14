import boto3
import os

s = boto3.Session(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    region_name="us-east-1"
)
sts = s.client("sts")
i = sts.get_caller_identity()
print("Account:", i["Account"])
print("ARN:", i["Arn"])
