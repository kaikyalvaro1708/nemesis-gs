variable "project_name" {
  description = "Prefixo dos recursos Azure"
  type        = string
  default     = "nemesis"
}

variable "location" {
  description = "Região Azure"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Ambiente de deploy"
  type        = string
  default     = "production"
}

variable "app_service_sku" {
  description = "SKU do App Service Plan (F1 = free)"
  type        = string
  default     = "F1"
}

variable "github_sp_object_id" {
  description = "Object ID do Service Principal do GitHub Actions"
  type        = string
}

variable "alert_email" {
  description = "E-mail que receberá alertas de monitoramento do Azure Monitor"
  type        = string
  default     = "equipe@nemesis.fiap"
}
