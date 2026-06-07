output "app_service_url" {
  description = "URL pública do App Service"
  value       = "https://${azurerm_linux_web_app.nemesis.default_hostname}"
}

output "app_service_hostname" {
  description = "Hostname do App Service"
  value       = azurerm_linux_web_app.nemesis.default_hostname
}

output "resource_group_name" {
  description = "Nome do Resource Group"
  value       = azurerm_resource_group.nemesis.name
}

output "app_insights_instrumentation_key" {
  description = "Instrumentation Key do Application Insights"
  value       = azurerm_application_insights.nemesis.instrumentation_key
  sensitive   = true
}

output "key_vault_uri" {
  description = "URI do Key Vault (usar para referenciar segredos na aplicação)"
  value       = azurerm_key_vault.nemesis.vault_uri
}
