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

# -----------------------------------------------------------------------------
# Static Web App — hospeda o frontend estatico (HTML/CSS/JS)
# Tier Free: HTTPS nativo, CDN global, deploy via GitHub Actions
# Nao requer VM — funciona em qualquer subscription Azure
# -----------------------------------------------------------------------------
resource "azurerm_static_web_app" "nemesis" {
  name                = "${var.project_name}-app"
  resource_group_name = azurerm_resource_group.nemesis.name
  location            = "eastus2"
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.tags
}

# -----------------------------------------------------------------------------
# Monitoramento — Log Analytics Workspace + Application Insights
# -----------------------------------------------------------------------------
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

# -----------------------------------------------------------------------------
# Key Vault — armazena segredos (chave da API Sentinel Hub)
# -----------------------------------------------------------------------------
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "nemesis" {
  name                       = "kv-${var.project_name}-swd26"
  resource_group_name        = azurerm_resource_group.nemesis.name
  location                   = azurerm_resource_group.nemesis.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  tags                       = local.tags

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
# Monitoramento — Action Group + Alert Rule
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

resource "azurerm_monitor_metric_alert" "request_failures" {
  name                = "alert-request-failures"
  resource_group_name = azurerm_resource_group.nemesis.name
  scopes              = [azurerm_application_insights.nemesis.id]
  description         = "NEMESIS: mais de 10 requisicoes com falha em 5 minutos"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"
  enabled             = true
  tags                = local.tags

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/failed"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = azurerm_monitor_action_group.nemesis_alerts.id
  }
}
