terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  name_prefix    = var.environment == "prod" ? "gold-coast-data-lake" : format("gold-coast-data-lake-%s", var.environment)
  container_name = "ghl-batch-refresh"
  s3_allowed_prefixes = [
    "raw/ghl/*",
    "checkpoints/ghl/*",
    "manifests/ghl/*",
    "recordings/ghl/*",
    "curated/ghl/*",
    "run-status/ghl/*",
    "athena-results/ghl/*"
  ]
}

resource "aws_ecr_repository" "data_lake" {
  name                 = local.name_prefix
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_cloudwatch_log_group" "refresh" {
  name              = format("/gold-coast/data-lake/%s/ghl-refresh", var.environment)
  retention_in_days = var.log_retention_days
}

resource "aws_dynamodb_table" "refresh_lock" {
  name         = format("%s-refresh-lock", local.name_prefix)
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "lock_name"

  attribute {
    name = "lock_name"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at_epoch"
    enabled        = true
  }
}

resource "aws_ecs_cluster" "data_lake" {
  name = local.name_prefix
}

resource "aws_security_group" "refresh_task" {
  name        = format("%s-refresh-task", local.name_prefix)
  description = "Gold Coast data lake refresh task. No inbound access."
  vpc_id      = var.vpc_id

  egress {
    description = "HTTPS egress only"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "task_execution" {
  name = format("%s-task-execution", local.name_prefix)
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "task_execution_secrets" {
  name = "read-refresh-secrets"
  role = aws_iam_role.task_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = concat([var.ghl_api_key_secret_arn, var.ghl_location_id_secret_arn], var.slack_webhook_secret_arn == null ? [] : [var.slack_webhook_secret_arn])
    }]
  })
}

resource "aws_iam_role" "task" {
  name = format("%s-task", local.name_prefix)
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "task" {
  name = "data-lake-refresh"
  role = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DataLakeBucketList"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = format("arn:aws:s3:::%s", var.data_lake_bucket)
        Condition = {
          StringLike = {
            "s3:prefix" = local.s3_allowed_prefixes
          }
        }
      },
      {
        Sid      = "DataLakeBucketObjects"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = [for prefix in local.s3_allowed_prefixes : format("arn:aws:s3:::%s/%s", var.data_lake_bucket, prefix)]
      },
      {
        Sid    = "GlueGoldCoast"
        Effect = "Allow"
        Action = ["glue:GetDatabase", "glue:GetTable", "glue:GetPartition", "glue:CreateTable", "glue:UpdateTable", "glue:CreatePartition", "glue:UpdatePartition"]
        Resource = [
          format("arn:aws:glue:%s:%s:catalog", data.aws_region.current.name, data.aws_caller_identity.current.account_id),
          format("arn:aws:glue:%s:%s:database/%s", data.aws_region.current.name, data.aws_caller_identity.current.account_id, var.glue_database),
          format("arn:aws:glue:%s:%s:table/%s/*", data.aws_region.current.name, data.aws_caller_identity.current.account_id, var.glue_database)
        ]
      },
      {
        Sid      = "AthenaGoldCoastWorkgroup"
        Effect   = "Allow"
        Action   = ["athena:StartQueryExecution", "athena:GetQueryExecution", "athena:GetQueryResults"]
        Resource = format("arn:aws:athena:%s:%s:workgroup/%s", data.aws_region.current.name, data.aws_caller_identity.current.account_id, var.athena_workgroup)
      },
      {
        Sid      = "RefreshLock"
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"]
        Resource = aws_dynamodb_table.refresh_lock.arn
      }
    ]
  })
}

resource "aws_ecs_task_definition" "refresh" {
  family                   = format("%s-ghl-refresh", local.name_prefix)
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.task_cpu)
  memory                   = tostring(var.task_memory)
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  lifecycle {
    precondition {
      condition     = var.alert_mode == "off" || try(trimspace(var.slack_webhook_secret_arn) != "", false)
      error_message = "slack_webhook_secret_arn is required when alert_mode is not off."
    }
    precondition {
      condition     = var.alert_mode != "launch-window" || try(trimspace(var.success_alert_until) != "", false)
      error_message = "success_alert_until is required when alert_mode is launch-window."
    }
  }

  container_definitions = jsonencode([
    {
      name      = local.container_name
      image     = format("%s:%s", aws_ecr_repository.data_lake.repository_url, var.image_tag)
      essential = true
      command = concat(
        ["--execute", "--s3-bucket", var.data_lake_bucket, "--download-recordings"],
        var.data_lake_s3_prefix == "" ? [] : ["--s3-prefix", var.data_lake_s3_prefix]
      )
      environment = [
        { name = "AWS_REGION", value = var.region },
        { name = "DATA_LAKE_BUCKET", value = var.data_lake_bucket },
        { name = "DATA_LAKE_S3_PREFIX", value = var.data_lake_s3_prefix },
        { name = "GLUE_DATABASE", value = var.glue_database },
        { name = "ATHENA_WORKGROUP", value = var.athena_workgroup },
        { name = "LOCK_TABLE_NAME", value = aws_dynamodb_table.refresh_lock.name },
        { name = "SOURCE_ENVIRONMENT", value = var.environment },
        { name = "ALERT_MODE", value = var.alert_mode },
        { name = "SUCCESS_ALERT_UNTIL", value = var.success_alert_until == null ? "" : var.success_alert_until }
      ]
      secrets = concat(
        [
          { name = "GHL_API_KEY", valueFrom = var.ghl_api_key_secret_arn },
          { name = "GHL_LOCATION_ID", valueFrom = var.ghl_location_id_secret_arn }
        ],
        var.slack_webhook_secret_arn == null ? [] : [{ name = "SLACK_WEBHOOK_URL", valueFrom = var.slack_webhook_secret_arn }]
      )
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.refresh.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_iam_role" "scheduler" {
  name = format("%s-scheduler", local.name_prefix)
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "scheduler.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler" {
  name = "run-refresh-task"
  role = aws_iam_role.scheduler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecs:RunTask"
        Resource = aws_ecs_task_definition.refresh.arn
      },
      {
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = [aws_iam_role.task_execution.arn, aws_iam_role.task.arn]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_scheduler_schedule" "refresh" {
  name       = format("%s-ghl-refresh", local.name_prefix)
  group_name = "default"
  state      = var.schedule_enabled ? "ENABLED" : "DISABLED"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression = "rate(30 minutes)"

  target {
    arn      = aws_ecs_cluster.data_lake.arn
    role_arn = aws_iam_role.scheduler.arn

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.refresh.arn
      launch_type         = "FARGATE"
      platform_version    = "LATEST"

      network_configuration {
        subnets          = var.public_subnet_ids
        security_groups  = [aws_security_group.refresh_task.id]
        assign_public_ip = true
      }
    }
  }
}
