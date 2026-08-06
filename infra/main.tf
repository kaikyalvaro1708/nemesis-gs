# -----------------------------------------------------------------------------
# NEMESIS — projeto encerrado.
#
# Todos os recursos foram removidos deste arquivo de proposito: como eles nao
# existem mais na configuracao, o proximo "terraform apply" (rodado pelo job
# deploy-infra do cd.yml ao chegar na main) vai DESTRUIR tudo que ainda
# existir no Azure (rg-nemesis e todo o seu conteudo), deixando a conta sem
# custos residuais desta infraestrutura.
#
# O storage do tfstate remoto (rg-nemesis-tfstate / stnemesisgs26) NAO e
# gerenciado por este arquivo — ele continua existindo (custo irrisorio) a
# menos que seja removido manualmente depois que este destroy for aplicado.
# -----------------------------------------------------------------------------
