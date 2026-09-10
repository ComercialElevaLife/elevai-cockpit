# postar_fila.py -- usado pelo workflow scan-notificacoes.yml.
# Lê um arquivo JSON (um objeto de notificação, ou uma lista deles) e faz POST de cada um
# em /api/notificacoes. Roda no runner do GitHub Actions (rede sem a restrição de egress
# que bloqueia a sessão do Claude que gera a fila).
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
        corpo = json.dumps(item).encode('utf-8')
        req = urllib.request.Request(
            url, data=corpo, headers={'Content-Type': 'application/json'}, method='POST'
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            titulo = str(item.get('titulo', ''))[:80]
            print('POST', resp.status, titulo)


if __name__ == '__main__':
    main()
