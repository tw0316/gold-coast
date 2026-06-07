data "aws_iam_policy_document" "ecs_tasks_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${local.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  count = length(local.ecs_injected_secret_arns) > 0 ? 1 : 0

  name = "${local.name}-execution-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid      = "ReadInjectedSecrets"
          Effect   = "Allow"
          Action   = ["secretsmanager:GetSecretValue"]
          Resource = local.ecs_injected_secret_arns
        }
      ],
      length(var.secret_kms_key_arns) > 0 ? [
        {
          Sid      = "DecryptInjectedSecrets"
          Effect   = "Allow"
          Action   = ["kms:Decrypt"]
          Resource = var.secret_kms_key_arns
        }
      ] : []
    )
  })
}

resource "aws_iam_role" "ecs_task" {
  name               = "${local.name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json
}

resource "aws_iam_role_policy" "ecs_task_app" {
  name = "${local.name}-app"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "PayloadMediaBucketList"
          Effect = "Allow"
          Action = ["s3:ListBucket"]
          Resource = [
            aws_s3_bucket.media.arn,
          ]
        },
        {
          Sid    = "PayloadMediaObjectsPrivate"
          Effect = "Allow"
          Action = [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:AbortMultipartUpload",
          ]
          Resource = ["${aws_s3_bucket.media.arn}/*"]
        },
        {
          Sid    = "FormSubmissionBucketListByApprovedPrefixes"
          Effect = "Allow"
          Action = ["s3:ListBucket"]
          Resource = [
            "arn:aws:s3:::${local.form_submissions_bucket_name}",
          ]
          Condition = {
            StringLike = {
              "s3:prefix" = var.form_submissions_prefixes
            }
          }
        },
        {
          Sid    = "FormSubmissionSourceOfTruthObjects"
          Effect = "Allow"
          Action = [
            "s3:GetObject",
            "s3:PutObject",
            "s3:AbortMultipartUpload",
          ]
          Resource = local.form_submission_object_arns
        },
        {
          Sid      = "ReadRuntimeSecrets"
          Effect   = "Allow"
          Action   = ["secretsmanager:GetSecretValue"]
          Resource = local.task_secret_read_arns
        },
        {
          Sid      = "PublishNonPiiAppMetrics"
          Effect   = "Allow"
          Action   = ["cloudwatch:PutMetricData"]
          Resource = "*"
          Condition = {
            StringEquals = {
              "cloudwatch:namespace" = var.metrics_namespace
            }
          }
        }
      ],
      length(var.secret_kms_key_arns) > 0 ? [
        {
          Sid      = "DecryptRuntimeSecrets"
          Effect   = "Allow"
          Action   = ["kms:Decrypt"]
          Resource = var.secret_kms_key_arns
        }
      ] : []
    )
  })
}
