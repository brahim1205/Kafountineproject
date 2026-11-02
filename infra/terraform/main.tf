terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "kafontine-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway = true
  enable_vpn_gateway = true
}

# RDS PostgreSQL
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier           = "kafontine-db"
  engine               = "postgres"
  engine_version       = "16"
  family               = "postgres16"
  instance_class       = "db.t4g.micro"
  allocated_storage    = 20
  max_allocated_storage = 100
  storage_type         = "gp3"
  storage_encrypted    = true
  db_name              = "kafontine"
  username             = var.db_username
  password             = var.db_password
  port                 = 5432

  vpc_security_group_ids = [module.rds.security_group_id]
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier_prefix = "kafontine-db-final"

  backup_retention_period = var.db_backup_retention_days
  multi_az                = var.db_multi_az
  publicly_accessible     = false

  performance_insights_enabled = true
  monitoring_interval         = "5"
  monitoring_role_arn         = module.rds.enhanced_monitoring_role_arn
}

# ECS Fargate Backend
resource "aws_ecs_cluster" "kafontine" {
  name = "kafontine-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ... (Full ECS task def, service, ALB, security groups - minimal for demo)
# See variables.tf for vars
