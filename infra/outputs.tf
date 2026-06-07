output "app_service_url" {
  description = "URL pública do Static Web App"
  value       = "https://${azurerm_static_web_app.nemesis.default_host_name}"
}

output "app_service_hostname" {
  description = "Hostname do Static Web App"
  value       = azurerm_static_web_app.nemesis.default_host_name
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
  description = "URI do Key Vault"
  value       = azurerm_key_vault.nemesis.vault_uri
}

output "static_web_app_api_key" {
  description = "API key para deploy no Static Web App"
  value       = azurerm_static_web_app.nemesis.api_key
  sensitive   = true
}
