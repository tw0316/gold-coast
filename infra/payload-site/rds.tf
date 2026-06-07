resource "aws_db_subnet_group" "payload" {
  name       = "${local.name}-db"
  subnet_ids = local.database_subnet_ids

  tags = {
    Name = "${local.name}-db"
  }
}

resource "aws_db_instance" "payload" {
  identifier = substr(replace(local.name, "_", "-"), 0, 63)

  engine         = "postgres"
  engine_version = var.rds_engine_version
  instance_class = var.rds_instance_class

  db_name  = var.database_name
  username = var.database_username

  manage_master_user_password = true

  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.payload.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = var.rds_multi_az

  backup_retention_period = local.rds_backup_retention_days
  backup_window           = "07:00-08:00"
  maintenance_window      = "sun:08:00-sun:09:00"
  copy_tags_to_snapshot   = true

  deletion_protection       = local.rds_deletion_protection
  skip_final_snapshot       = local.rds_skip_final_snapshot
  final_snapshot_identifier = local.rds_skip_final_snapshot ? null : (var.rds_final_snapshot_identifier != "" ? var.rds_final_snapshot_identifier : "${local.name}-final")

  auto_minor_version_upgrade = true
  apply_immediately          = false

  tags = {
    Name       = local.name
    DataClass  = "payload-postgres"
    BackupDays = tostring(local.rds_backup_retention_days)
  }
}
