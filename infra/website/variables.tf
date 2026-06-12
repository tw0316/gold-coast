variable "domain" {
  description = "Primary domain name"
  type        = string
  default     = "gcoffers.com"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (prod or staging)"
  type        = string
  default     = "prod"
}

variable "home_ip" {
  description = "Home IP address for staging access restriction"
  type        = string
  default     = "76.128.41.131"
}

variable "ghl_api_key" {
  description = "GoHighLevel API key"
  type        = string
  sensitive   = true
}
