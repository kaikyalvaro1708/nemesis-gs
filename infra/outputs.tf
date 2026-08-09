# -----------------------------------------------------------------------------
# NEMESIS — sem outputs
#
# Todos os outputs referenciavam recursos que foram descomissionados (ver
# infra/removed.tf). Sem os recursos no state, essas referencias quebrariam
# o plan, entao os outputs foram removidos junto.
# -----------------------------------------------------------------------------
