variable "project_name" {
  description = "Prefixo dos recursos Azure"
  type        = string
  default     = "nemesis"
}

variable "location" {
  description = "Região Azure"
  type        = string
  default     = "brazilsouth"
}

variable "environment" {
  description = "Ambiente de deploy"
  type        = string
  default     = "production"
}

variable "app_service_sku" {
  description = "SKU do App Service Plan (B1 = Basic pago, usa creditos Azure)"
  type        = string
  default     = "B1"
}

variable "alert_email" {
  description = "E-mail que receberá alertas de monitoramento do Azure Monitor"
  type        = string
  default     = "equipe@nemesis.fiap"
}
