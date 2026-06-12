# Gold Coast Data Lake V1.1 Cleanup Plan

Status: completed 2026-05-19 after explicit Tej approval

## Rule

Do not blind-purge the S3 bucket. Do not delete old generated V1 snapshot data until V1.1 passes validation and Tej explicitly approves cleanup.

Cleanup was approved by Tej in Slack thread `1779234305.097569` and executed through the JKS cleanup slice. Evidence: `.jks/v1-1-approved-cleanup-evidence.md`.

## Keep

- All Git code, SQL, docs, Terraform, and evidence.
- run-status/ghl/ historical run rows, pointers, and logs.
- manifests/ghl/ and checkpoints/ghl/ until rollback confidence is no longer needed.
- recordings/ghl/ because V1.1 reuses stable recording objects by call/message ID.
- curated/ghl/v1_1/ current V1.1 core/reporting outputs.
- snapshots/ghl/daily/ internal audit snapshots.

## Candidate Old Generated Prefixes

Status: deleted. Post-cleanup listings returned zero current objects for each prefix.

These are old V1 repeated snapshot output prefixes, not the V1.1 query surface:

- s3://gcoffers-data-lake/curated/ghl/contacts/
- s3://gcoffers-data-lake/curated/ghl/opportunities/
- s3://gcoffers-data-lake/curated/ghl/messages/
- s3://gcoffers-data-lake/curated/ghl/calls/
- s3://gcoffers-data-lake/curated/ghl/call_recordings/
- s3://gcoffers-data-lake/curated/ghl/opportunity_stage_history/
- s3://gcoffers-data-lake/curated/ghl/mart_lead_response/
- s3://gcoffers-data-lake/curated/ghl/mart_rep_activity_daily/

## Candidate Old Glue Tables

Status: dropped after validating each table still pointed at the old V1 prefix.

These old partitioned tables may be dropped only after approval:

- gold_coast.contacts
- gold_coast.opportunities
- gold_coast.mart_lead_response
- gold_coast.mart_rep_activity_daily

The shared table names calls, messages, call_recordings, and opportunity_stage_history now point to V1.1 core locations, so do not drop those table names.

## Dry-Run Inventory Commands

Use these before asking for cleanup approval:

```bash
aws s3 ls s3://gcoffers-data-lake/curated/ghl/ --recursive --summarize
aws glue get-tables --database-name gold_coast --region us-east-1 \
  --query 'TableList[].{Name:Name,Location:StorageDescriptor.Location,PartitionKeys:PartitionKeys[].Name}'
```

## Approval-Gated Deletion Commands

Do not run these until Tej explicitly approves deletion after V1.1 scheduled validation:

```bash
# Example only. Replace <prefix> one at a time from the approved candidate list.
aws s3 rm s3://gcoffers-data-lake/<prefix> --recursive --dryrun
aws s3 rm s3://gcoffers-data-lake/<prefix> --recursive

# Drop only old partitioned V1 table names after approval.
aws glue delete-table --database-name gold_coast --name contacts --region us-east-1
aws glue delete-table --database-name gold_coast --name opportunities --region us-east-1
aws glue delete-table --database-name gold_coast --name mart_lead_response --region us-east-1
aws glue delete-table --database-name gold_coast --name mart_rep_activity_daily --region us-east-1
```
