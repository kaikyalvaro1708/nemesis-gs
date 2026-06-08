# NEMESIS — Vigilância Orbital contra o Trabalho Escravo

<p align="center">
  <img src="src/img/logomarca.png" width="340" alt="NEMESIS logo" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FIAP-Global%20Solution%202026-red?style=flat-square" alt="FIAP"/>
  <img src="https://img.shields.io/badge/Azure-Static%20Web%20Apps-0078D4?style=flat-square&logo=microsoft-azure" alt="Azure"/>
  <img src="https://img.shields.io/badge/IaC-Terraform-7B42BC?style=flat-square&logo=terraform" alt="Terraform"/>
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=flat-square&logo=github-actions" alt="GitHub Actions"/>
  <img src="https://img.shields.io/badge/ODS-8%20%7C%2010-orange?style=flat-square" alt="ODS"/>
</p>

<p align="center">
  <strong>🌐 <a href="https://polite-cliff-076a5cc0f.7.azurestaticapps.net">polite-cliff-076a5cc0f.7.azurestaticapps.net</a></strong>
</p>

---

## O que é o NEMESIS

Existem mais de **40 milhões de pessoas** em situação de escravidão moderna no mundo hoje. A maioria está escondida em regiões remotas, longe de fiscais e autoridades. Mas essas operações deixam marcas físicas na terra — fornos de tijolo, garimpos ilegais, acampamentos isolados, embarcações suspeitas — que são **visíveis do espaço**.

O **NEMESIS** usa imagens de satélite (ESA Sentinel-1/2 e NASA Landsat-8) e visão computacional para detectar automaticamente essas estruturas, gerar um **score de risco por região** e alertar autoridades e ONGs. Tudo sem capturar dados de pessoas — o sistema analisa a paisagem, não indivíduos.

> Projeto acadêmico desenvolvido para a **FIAP Global Solution 2026 — Secure DevOps Tools e Cloud Computing**.

---

## 👥 Equipe

| Nome                     | RM     |
| ------------------------ | ------ |
| Kaiky Alvaro de Miranda  | 98118  |
| Lucas Rodrigues da Silva | 98344  |
| Juan Pinheiro de França  | 552202 |

---

## Sumário

1. [Como o sistema funciona](#como-o-sistema-funciona)
2. [Estrutura do repositório](#estrutura-do-repositório)
3. [Tecnologias utilizadas](#tecnologias-utilizadas)
4. [Infraestrutura na nuvem (Azure)](#infraestrutura-na-nuvem-azure)
5. [Rodando localmente](#rodando-localmente)
6. [Deploy no Azure](#deploy-no-azure)
7. [Pipelines de CI/CD](#pipelines-de-cicd)
8. [Alinhamento com os ODS da ONU](#alinhamento-com-os-ods-da-onu)
9. [Referências](#referências)

---

## Como o sistema funciona

O NEMESIS segue um fluxo de 4 etapas:

```
1. SATÉLITE captura imagem da região (10m por pixel, a cada 6 dias)
        ↓
2. IA analisa a imagem em janelas de 60×60m procurando padrões suspeitos
   → Forno de tijolo?  → Garimpo ilegal?  → Acampamento remoto?  → Embarcação suspeita?
        ↓
3. SCORE DE RISCO é calculado por região, cruzando as detecções com dados
   socioeconômicos (IDH, isolamento geográfico, dados da OIT)
        ↓
4. ALERTA georreferenciado é enviado para ONGs, Ministério do Trabalho e Polícia Federal
```

O dashboard publicado no Azure exibe esse mapa de risco em tempo real para qualquer pessoa com o link.

---

## Estrutura do repositório

```
nemesis/
│
├── src/                        ← Frontend da aplicação (o dashboard)
│   ├── index.html              ← Página principal
│   ├── style.css               ← Estilo visual
│   ├── app.js                  ← Simulador de detecção e animações
│   └── img/
│       ├── logomarca.png
│       └── logo_nemesis.png
│
├── infra/                      ← Infraestrutura como código (Terraform)
│   ├── main.tf                 ← Todos os recursos Azure
│   ├── variables.tf            ← Variáveis configuráveis
│   ├── outputs.tf              ← Valores retornados após o deploy
│   └── providers.tf            ← Configuração do provider Azure + backend remoto
│
├── .github/workflows/
│   ├── ci.yml                  ← CI: valida o código a cada push fora da main
│   └── cd.yml                  ← CD: provisiona infra + faz deploy ao chegar na main
│
├── .gitignore
└── README.md
```

---

## Tecnologias utilizadas

| O que faz | Tecnologia |
| --- | --- |
| Interface do usuário | HTML5, CSS3 e JavaScript puro — sem frameworks |
| Infraestrutura como código | Terraform `~> 3.0` com backend remoto no Azure Storage |
| Hospedagem | Azure Static Web Apps (HTTPS nativo + CDN global) |
| Segredos | Azure Key Vault (`kv-nemesis-swd26`) |
| Monitoramento | Azure Application Insights + Log Analytics Workspace |
| Alertas | Azure Monitor Alert Rule + Action Group (e-mail) |
| Pipelines | GitHub Actions (CI + CD) |
| Imagens de satélite | ESA Sentinel-1/2 · NASA Landsat-8 (gratuitos, acesso público) |

---

## Infraestrutura na nuvem (Azure)

Todos os recursos abaixo são criados **automaticamente** pelo Terraform quando o CD roda. O Terraform state é armazenado remotamente no Azure Storage (`stnemesisgs26/tfstate`).

| Recurso | Nome no Azure | Para que serve |
| --- | --- | --- |
| **Resource Group** | `rg-nemesis` | Agrupa todos os recursos do projeto |
| **Static Web App** | `nemesis-app` | Hospeda o dashboard com HTTPS nativo e CDN global — sem servidor para gerenciar |
| **Log Analytics Workspace** | `law-nemesis` | Base centralizada para logs e métricas |
| **Application Insights** | `ai-nemesis` | Monitora requisições, falhas e performance em tempo real |
| **Key Vault** | `kv-nemesis-swd26` | Cofre digital para a chave da API do Sentinel Hub — nunca no código |
| **Key Vault Secret** | `sentinel-api-key` | Chave de acesso às imagens de satélite do Sentinel Hub |
| **Monitor Action Group** | `ag-nemesis-alerts` | Grupo de notificação por e-mail da equipe |
| **Monitor Alert Rule** | `alert-request-failures` | Dispara alerta se houver mais de 10 requisições com falha em 5 minutos |

> **Por que Static Web Apps e não App Service?**  
> O frontend do NEMESIS é HTML/CSS/JS puro — não há processamento server-side. O Azure Static Web Apps é a solução recomendada pela Microsoft para este workload: oferece HTTPS nativo, CDN global, deploy integrado ao GitHub Actions e custo zero no tier Free.

---

## Rodando localmente

Você não precisa do Azure para ver o dashboard funcionando.

```bash
# 1. Clone o repositório
git clone https://github.com/kaikyalvaro1708/nemesis-gs.git
cd nemesis-gs

# 2. Suba um servidor local dentro da pasta src/
npx serve src

# 3. Acesse no navegador
# → http://localhost:3000
```

O simulador de detecção, o painel de monitoramento e todas as seções funcionam localmente sem nenhuma conta Azure.

---

## Deploy no Azure

### Pré-requisitos

- Conta no [Azure](https://azure.microsoft.com/free)
- [Terraform 1.6+](https://developer.hashicorp.com/terraform/install)
- [Azure CLI](https://learn.microsoft.com/pt-br/cli/azure/install-azure-cli)

---

### Passo 1 — Criar o Service Principal (uma vez só)

```bash
az login

az ad sp create-for-rbac \
  --name "sp-nemesis-github" \
  --role Contributor \
  --scopes /subscriptions/<SEU_SUBSCRIPTION_ID>
```

Anote os valores retornados: `appId` (= Client ID), `password` (= Client Secret), `tenant`.

---

### Passo 2 — Criar o storage para o Terraform state

```bash
az group create --name rg-nemesis-tfstate --location brazilsouth

az storage account create \
  --name stnemesisgs26 \
  --resource-group rg-nemesis-tfstate \
  --location brazilsouth \
  --sku Standard_LRS

az storage container create \
  --name tfstate \
  --account-name stnemesisgs26
```

---

### Passo 3 — Configurar os Secrets no GitHub

Em **Settings → Secrets and variables → Actions**, adicione:

| Secret | Valor |
| --- | --- |
| `ARM_SUBSCRIPTION_ID` | ID da sua subscription Azure |
| `ARM_CLIENT_ID` | `appId` do Service Principal |
| `ARM_CLIENT_SECRET` | `password` do Service Principal |
| `ARM_TENANT_ID` | `tenant` do Service Principal |
| `ALERT_EMAIL` | E-mail que receberá alertas do Azure Monitor |

---

### Passo 4 — Fazer push na main

```bash
git checkout main
git push origin main
```

O pipeline de CD vai rodar automaticamente: provisiona a infra via Terraform e publica o site.  
Acompanhe em: **GitHub → aba Actions**

---

## Pipelines de CI/CD

### CI — Integração Contínua (`ci.yml`)

**Quando roda:** em todo `git push` fora da `main` e em Pull Requests para a `main`.  
**O que faz:** garante que o código está correto antes de chegar em produção.

| Job | Etapas |
| --- | --- |
| `validar-terraform` | `terraform fmt -check` → `terraform init` → `terraform validate` → `terraform plan` |
| `validar-frontend` | Verifica se `index.html`, `style.css` e `app.js` existem em `src/` |

---

### CD — Entrega Contínua (`cd.yml`)

**Quando roda:** toda vez que código chega na branch `main`.  
**O que faz:** 3 jobs em sequência.

| Job | O que faz |
| --- | --- |
| `verificar-secrets` | Valida que todos os 5 secrets obrigatórios estão configurados no repositório |
| `deploy-infra` | Cria/atualiza o storage de tfstate (idempotente) + `terraform apply` |
| `deploy-app` | Busca o token do Static Web App via Azure CLI + publica `src/` via `Azure/static-web-apps-deploy@v1` |

O token de deploy é obtido dinamicamente via `az staticwebapp secrets list` — sem precisar de um secret adicional no GitHub.

---

## Alinhamento com os ODS da ONU

| ODS | Como o NEMESIS contribui |
| --- | --- |
| **8 — Trabalho Decente** | Detecta infraestrutura de trabalho forçado por vigilância orbital contínua, complementando a fiscalização humana em regiões remotas |
| **10 — Redução das Desigualdades** | Protege populações vulneráveis com monitoramento não invasivo — o sistema analisa a paisagem, nunca dados individuais |

---

## Referências

- [ESA Copernicus — Sentinel Hub](https://sentinel.esa.int)
- [NASA Earthdata — Landsat](https://earthdata.nasa.gov)
- [OIT — Relatório Global sobre Trabalho Forçado 2024](https://www.ilo.org)
- [Universidade de Nottingham — Detecção de fornos de tijolo com CNN](https://doi.org/10.1098/rspb.2021.2093)
- [Walk Free Foundation — Global Slavery Index 2023](https://www.globalslaveryindex.org)
- [Terraform — Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Static Web Apps — Documentação](https://learn.microsoft.com/pt-br/azure/static-web-apps/)
