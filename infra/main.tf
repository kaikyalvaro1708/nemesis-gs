# -----------------------------------------------------------------------------
# NEMESIS — infraestrutura descomissionada
#
# Os recursos que existiam aqui (resource group, static web app, log
# analytics, application insights, key vault + secret, action group e
# metric alert) foram movidos para infra/removed.tf usando blocos `removed`,
# para que o `terraform apply` destrua tudo na Azure e zere os custos.
#
# Depois que o apply confirmar o state vazio, infra/removed.tf tambem pode
# ser apagado.
# -----------------------------------------------------------------------------
