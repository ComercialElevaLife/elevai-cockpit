#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo ">> Obtendo deployment token via az..."
TOKEN=$(az staticwebapp secrets list -n elevai-cockpit -g rg-elevai-cockpit --query "properties.apiKey" -o tsv)
[ -n "$TOKEN" ] || { echo "!! Sem token (permissão/nome). Portal → SWA elevai-cockpit → Manage deployment token."; exit 1; }
echo ">> Publicando frontend + api (enxuta, sem dados embutidos)..."
npx -y @azure/static-web-apps-cli deploy ./frontend --api-location ./api --deployment-token "$TOKEN" --env production
echo ">> OK. Migração: abra  https://red-mushroom-08695330f.7.azurestaticapps.net/  (recarregue com Ctrl+F5 e valide gráficos, kanban, filtros e cadastro)"
