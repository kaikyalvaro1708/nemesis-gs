locals {
  tags = {
    project     = var.project_name
    environment = var.environment
    team        = "FIAP-GS2026"
  }
}

resource "azurerm_resource_group" "nemesis" {
  name     = "rg-${var.project_name}"
  location = var.location
  tags     = local.tags
}

resource "azurerm_service_plan" "nemesis" {
  name                = "plan-${var.project_name}"
  resource_group_name = azurerm_resource_group.nemesis.name
  location            = azurerm_resource_group.nemesis.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  tags                = local.tags
}

resource "azurerm_log_analytics_workspace" "nemesis" {
  name                = "law-${var.project_name}"
  resource_group_name = azurerm_resource_group.nemesis.name
  location            = azurerm_resource_group.nemesis.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_application_insights" "nemesis" {
  name                = "ai-${var.project_name}"
  resource_group_name = azurerm_resource_group.nemesis.name
  location            = azurerm_resource_group.nemesis.location
  application_type    = "web"
  retention_in_days   = 30
  workspace_id        = azurerm_log_analytics_workspace.nemesis.id
  tags                = local.tags
}

resource "azurerm_linux_web_app" "nemesis" {
  name                = "${var.project_name}-app"
  resource_group_name = azurerm_resource_group.nemesis.name
  location            = azurerm_resource_group.nemesis.location
  service_plan_id     = azurerm_service_plan.nemesis.id
  https_only          = true

  site_config {
    application_stack {
      node_version = "18-lts"
    }
    always_on           = false
    ftps_state          = "Disabled"
    minimum_tls_version = "1.2"
    http2_enabled       = true
  }

  app_settings = {
    "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.nemesis.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"      = azurerm_application_insights.nemesis.connection_string
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "NODE_ENV"                                   = var.environment
    "WEBSITE_RUN_FROM_PACKAGE"                   = "1"
  }

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Key Vault — armazena segredos (chave da API Sentinel Hub)
# Nome precisa ser globalmente único no Azure: adicione sufixo se já existir
# -----------------------------------------------------------------------------
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "nemesis" {
  name                       = "kv-${var.project_name}-gs"
  resource_group_name        = azurerm_resource_group.nemesis.name
  location                   = azurerm_resource_group.nemesis.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  tags                       = local.tags

  # Permite que o usuário/SP que executa o Terraform gerencie segredos
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = ["Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"]
  }

}

resource "azurerm_key_vault_secret" "sentinel_api_key" {
  name         = "sentinel-api-key"
  value        = "SENTINEL2-DEMO-KEY-2026"
  key_vault_id = azurerm_key_vault.nemesis.id
  content_type = "text/plain"
  tags         = local.tags

  depends_on = [azurerm_key_vault.nemesis]
}

# -----------------------------------------------------------------------------
# Monitoramento — Action Group + Alert Rule (erros HTTP 5xx)
# -----------------------------------------------------------------------------
resource "azurerm_monitor_action_group" "nemesis_alerts" {
  name                = "ag-${var.project_name}-alerts"
  resource_group_name = azurerm_resource_group.nemesis.name
  short_name          = "nemesis-ag"
  tags                = local.tags

  email_receiver {
    name                    = "equipe-nemesis"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }
}

resource "azurerm_monitor_metric_alert" "http_errors" {
  name                = "alert-http-5xx"
  resource_group_name = azurerm_resource_group.nemesis.name
  scopes              = [azurerm_linux_web_app.nemesis.id]
  description         = "NEMESIS: mais de 10 erros HTTP 5xx em 5 minutos"
  severity            = 1      # Critical
  frequency           = "PT1M" # avalia a cada 1 minuto
  window_size         = "PT5M" # janela de agregação: 5 minutos
  enabled             = true
  tags                = local.tags

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = azurerm_monitor_action_group.nemesis_alerts.id
  }
}
