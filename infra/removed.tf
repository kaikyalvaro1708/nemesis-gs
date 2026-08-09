# -----------------------------------------------------------------------------
# Descomissionamento — NEMESIS
#
# Cada bloco `removed` abaixo tira o recurso do state E manda destruir o
# objeto real na Azure (lifecycle.destroy = true e o padrao, mas deixamos
# explicito de proposito). Requer Terraform >= 1.7.
#
# Os `resource` blocks correspondentes foram retirados de main.tf — nao pode
# existir um `resource` e um `removed` para o mesmo endereco ao mesmo tempo.
#
# Ordem: do mais dependente para o mais "raiz" (resource group por ultimo),
# so por legibilidade — o Terraform calcula a ordem real pelo grafo.
#
# Depois de um `terraform apply` limpo (plan sem nenhum recurso restante),
# este arquivo pode ser apagado.
# -----------------------------------------------------------------------------

removed {
  from = azurerm_monitor_metric_alert.request_failures

  lifecycle {
    destroy = true
  }
}

removed {
  from = azurerm_monitor_action_group.nemesis_alerts

  lifecycle {
    destroy = true
  }
}

removed {
  from = azurerm_key_vault_secret.sentinel_api_key

  lifecycle {
    destroy = true
  }
}

removed {
  from = azurerm_key_vault.nemesis

  lifecycle {
    destroy = true
  }
}

removed {
  from = azurerm_application_insights.nemesis

  lifecycle {
    destroy = true
  }
}

removed {
  from = azurerm_log_analytics_workspace.nemesis

  lifecycle {
    destroy = true
  }
}

removed {
  from = azurerm_static_web_app.nemesis

  lifecycle {
    destroy = true
  }
}

removed {
  from = azurerm_resource_group.nemesis

  lifecycle {
    destroy = true
  }
}
