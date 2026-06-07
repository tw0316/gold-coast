resource "random_id" "media_bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "media" {
  bucket        = local.media_bucket_name
  force_destroy = var.media_force_destroy

  tags = {
    Name        = local.media_bucket_name
    DataClass   = "payload-media"
    PublicMedia = "app-mediated-only"
  }
}

resource "aws_s3_bucket_ownership_controls" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "media-cost-and-multipart-controls"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = var.media_noncurrent_version_expiration_days
    }
  }
}

# Optional successor source-of-truth bucket. Defaults off because legacy static stack
# already owns the legacy goldcoast-leads bucket. Referencing the bucket in IAM
# is safe; creating it must be an explicit migration decision.
resource "aws_s3_bucket" "form_submissions" {
  count = var.create_form_submissions_bucket ? 1 : 0

  bucket        = local.form_submissions_bucket_name
  force_destroy = false

  tags = {
    Name      = local.form_submissions_bucket_name
    DataClass = "form-submissions-source-of-truth"
  }
}

resource "aws_s3_bucket_public_access_block" "form_submissions" {
  count = var.create_form_submissions_bucket ? 1 : 0

  bucket = aws_s3_bucket.form_submissions[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "form_submissions" {
  count = var.create_form_submissions_bucket ? 1 : 0

  bucket = aws_s3_bucket.form_submissions[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "form_submissions" {
  count = var.create_form_submissions_bucket ? 1 : 0

  bucket = aws_s3_bucket.form_submissions[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "form_submissions" {
  count = var.create_form_submissions_bucket ? 1 : 0

  bucket = aws_s3_bucket.form_submissions[0].id

  rule {
    id     = "form-submission-retention-and-multipart-controls"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
