# postar_fila.py -- usado pelo workflow scan-notificacoes.yml.
# Lê um arquivo JSON (um objeto de notificação, ou uma lista deles) e aplica cada um em
# /api/notificacoes. Roda no runner do GitHub Actions (rede sem a restrição de egress que
# bloqueia a sessão do Claude que gera a fila).
#
# Cada item é POST (cria notificação nova) por padrão. Um item com "_metodo": "PATCH" vira
# PATCH (atualiza campos de uma notificação já existente -- precisa de "id" e "fields"; ver
# formato em /api/notificacoes e notifPatch() no frontend) -- usado p/ correções pontuais
# (ex.: limpar texto de uma notificação já publicada) sem precisar reprocessar a fila toda.
import json
import sys
import urllib.request


def main():
    if len(sys.argv) != 3:
        print('uso: postar_fila.py <arquivo.json> <url>', file=sys.stderr)
        sys.exit(1)

    caminho, url = sys.argv[1], sys.argv[2]
    with open(caminho, encoding='utf-8') as fh:
        itens = json.load(fh)
    if not isinstance(itens, list):
        itens = [itens]

    for item in itens:
        metodo = item.get('_metodo', 'POST')
        corpo_dict = {k: v for k, v in item.items() if k != '_metodo'}
        corpo = json.dumps(corpo_dict).encode('utf-8')
        req = urllib.request.Request(
            url, data=corpo, headers={'Content-Type': 'application/json'}, method=metodo
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            rotulo = str(corpo_dict.get('titulo', corpo_dict.get('id', '')))[:80]
            print(metodo, resp.status, rotulo)


if __name__ == '__main__':
    main()
