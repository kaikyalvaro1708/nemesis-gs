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

  features {}
}
