terraform {
  required_version = ">= 1.7.0" # blocos `removed` (infra/removed.tf) exigem 1.7+

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # Backend vazio — configuracao passada via flags no CI/CD
  # Estado guardado no Azure Storage para persistir entre execucoes
  backend "azurerm" {}
}

provider "azurerm" {
  skip_provider_registration = true

  features {
    resource_group {
      # O Application Insights cria sozinho um Action Group
      # ("Application Insights Smart Detection") dentro do RG, fora do
      # nosso controle/state. Sem isso, o destroy do resource group falha
      # porque acha esse recurso "nao gerenciado" la dentro.
      prevent_deletion_if_contains_resources = false
    }
  }
}
