output "ecr_repository_url" {
  value = aws_ecr_repository.data_lake.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.data_lake.name
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.refresh.arn
}

output "lock_table_name" {
  value = aws_dynamodb_table.refresh_lock.name
}

output "schedule_name" {
  value = aws_scheduler_schedule.refresh.name
}

output "schedule_enabled" {
  value = var.schedule_enabled
}

output "schedule_expression" {
  value = var.schedule_expression
}

output "reporting_glue_database" {
  value = aws_glue_catalog_database.reporting.name
}
