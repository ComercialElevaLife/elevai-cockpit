// variaveis/index.js — dados da tela "Variáveis" (remuneração variável).
// 29/10/2026 — Léo: tela restrita a 3 usuários. A trava é AQUI, no servidor: qualquer outro e-mail
// recebe 403, mesmo que digite o endereço da API direto. Esconder o menu no frontend é só visual.
// Os dados de remuneração NÃO ficam em arquivo estático: só saem desta rota.
const { LISTS, fromFields } = require('../_shared/schema');
const g = require('../_shared/graph');
const { json, requireDomain, readUser } = require('../_shared/crud');

const PERMITIDOS = ['leonardo@elevalife.com.br', 'rafael@elevalife.com.br', 'joao@elevalife.com.br'];
function permitido(req) { return PERMITIDOS.includes(String(readUser(req) || '').toLowerCase()); }

// Lista própria (criada pelo sistema na primeira chamada): classificação de cada venda para a remuneração.
const DEF = {
  displayName: 'Variaveis_Classificacao',
  titleFrom: 'cliente',
  columns: [
    { name: 'chave', type: 'text' },
    { name: 'cliente', type: 'text' },
    { name: 'valor', type: 'number' },
    { name: 'fator', type: 'text' },   // PROPRIA | INDIRETA | NAO_PAGA | FORA | IGNORAR
    { name: 'nota', type: 'text' },
    { name: 'alteradoEm', type: 'text' },
    { name: 'alteradoPor', type: 'text' },
  ],
};
const FATORES = ['PROPRIA', 'INDIRETA', 'NAO_PAGA', 'FORA', 'IGNORAR'];

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const chave = (cli, serv, tipo, valor) => [norm(cli), serv, tipo, Math.round(Number(valor) || 0)].join('|');

// Classificações informadas por Léo em 29/10/2026 (ponto de partida; o que for salvo na tela prevalece).
// [cliente, serv, tipo, valor, fator, extras]
const SEMENTE = [
  ['Aliança Metalúrgica', 'ERGO', 'P', 3749, 'INDIRETA'], ['BMS', 'ERGO', 'P', 8218, 'PROPRIA'],
  ['SERASA', 'GL', 'P', 7750, 'INDIRETA'], ['Givaudan', 'ERGO', 'P', 16047, 'INDIRETA'],
  ['NSK', 'ENF', 'R', 470199, 'INDIRETA'], ['NSK', 'MED TRAB', 'R', 122500, 'INDIRETA'], ['NSK', 'MED TRAB', 'R', 297500, 'INDIRETA'],
  ['SAINT GOBAIN', 'ERGO', 'P', 5997, 'INDIRETA'], ['Saint Gobain', 'ERGO', 'P', 4692, 'PROPRIA'],
  ['Imerys', 'ERGO', 'P', 6820, 'PROPRIA'], ['Imerys', 'ERGO', 'P', 27913, 'PROPRIA'],
  ['VERZANI & SANDRINI', 'ERGO', 'P', 111721, 'PROPRIA'], ['ACRISURE', 'FISIO', 'R', 315000, 'PROPRIA'],
  ['Givaudan', 'ERGO', 'R', 24000, 'INDIRETA'], ['Bartira', 'ERGO', 'R', 53653, 'INDIRETA'],
  ['VALLOUREC', 'ERGO', 'R', 64554, 'INDIRETA'], ['VALLOUREC', 'ERGO', 'P', 100767, 'INDIRETA'],
  ['Kolben', 'ERGO', 'P', 29150, 'INDIRETA'], ['LYB', 'ERGO', 'R', 63600, 'INDIRETA'], ['LYB', 'ERGO', 'P', 25500, 'INDIRETA'],
  ['CTG', 'ERGO', 'P', 40162, 'PROPRIA'], ['G2L', 'ERGO', 'R', 144955, 'PROPRIA', { data: '2026-06-22' }],
  ['CNH', 'GL', 'P', 10600, 'INDIRETA'], ['ZF', 'GL', 'R', 1122433, 'INDIRETA', { data: '2026-08-14', zf: true }],
  ['EMS - Grupo NC', 'AET', 'P', 1450, 'PROPRIA'],
  ['GERDAU', 'ERGO', 'R', 115800, 'NAO_PAGA'],                      // up-sell (Cosigua): regra não prevê comissão
  ['Imerys', 'ERGO', 'P', 6400, 'IGNORAR'], ['DSM', 'GL', 'R', 66168, 'IGNORAR'], ['DSM', 'ERGO', 'R', 18000, 'IGNORAR'], // duplicidades
];
const SEED = {};
SEMENTE.forEach(s => { SEED[chave(s[0], s[1], s[2], s[3])] = Object.assign({ fator: s[4] }, s[5] || {}); });

function padrao(x) {
  if (String(x.cons) !== 'LS') return 'FORA';
  if (x.tc === 'ATUAL') return 'NAO_PAGA';
  const f = String(x.fonte || '').toLowerCase();
  if (x.origem === 'SÓCIOS' || /indica|evento|mkt/.test(f)) return 'INDIRETA';
  return 'PROPRIA';
}

async function carregarVendas() {
  const mapa = new Map();
  for (const kind of ['vendas', 'leads']) {
    const { id } = await g.ensureList(LISTS[kind]);
    const raw = await g.listItemsMeta(id);
    for (const r of raw) {
      const x = fromFields(kind, r.fields);
      if (kind === 'leads' && x.status !== 'VENDIDA') continue;
      if (!x.cliente || x.serv === 'N/A' || x.tipo === 'N/A' || !x.valor) continue;
      const d = String((kind === 'leads' ? (x.dataVenda || x.dt) : x.dt) || '');
      if (d < '2025-11-01') continue;
      const k = chave(x.cliente, x.serv, x.tipo, x.valor);
      const item = { k, cliente: x.cliente, unidade: x.unidade, serv: x.serv, tipo: x.tipo, valor: Number(x.valor), d, cons: x.cons, origem: x.origem, tc: x.tc, fonte: x.fonte };
      const ant = mapa.get(k);
      if (!ant) mapa.set(k, item);
      else for (const f of Object.keys(item)) if (ant[f] == null || ant[f] === '') ant[f] = item[f]; // junta campos vazios
    }
  }
  return Array.from(mapa.values());
}

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    if (!permitido(req)) { context.res = json(403, { ok: false, error: 'Acesso restrito' }); return; }
    const { id: listId } = await g.ensureList(DEF);
    const method = (req.method || 'GET').toUpperCase();

    if (method === 'GET') {
      const [vendas, raw] = await Promise.all([carregarVendas(), g.listItemsMeta(listId)]);
      const salvos = {};
      raw.forEach(r => { const f = r.fields || {}; if (f.chave) salvos[f.chave] = { id: r.id, fator: f.fator, nota: f.nota || '' }; });
      const itens = vendas.map(v => {
        const sv = salvos[v.k], sd = SEED[v.k];
        const o = Object.assign({}, v);
        if (sd && sd.data) o.d = sd.data;
        o.zf = !!(sd && sd.zf);
        o.fator = sv ? sv.fator : (sd ? sd.fator : padrao(v));
        o.origemFator = sv ? 'salvo' : (sd ? 'informado' : 'padrao');
        o.nota = sv ? sv.nota : '';
        return o;
      }).sort((a, b) => a.d.localeCompare(b.d));
      context.res = json(200, { ok: true, usuario: readUser(req), count: itens.length, items: itens });
      return;
    }

    if (method === 'POST') {
      const b = req.body || {};
      if (!b.k || !FATORES.includes(b.fator)) { context.res = json(400, { ok: false, error: 'dados inválidos' }); return; }
      const raw = await g.listItemsMeta(listId);
      const ex = raw.find(r => (r.fields || {}).chave === b.k);
      const campos = { chave: b.k, cliente: String(b.cliente || ''), valor: Number(b.valor) || 0, fator: b.fator, nota: String(b.nota || '').slice(0, 250), alteradoEm: new Date().toISOString(), alteradoPor: readUser(req) || 'desconhecido' };
      if (ex) await g.updateItem(listId, ex.id, campos);
      else await g.addItem(listId, Object.assign({ Title: campos.cliente || '(sem titulo)' }, campos));
      context.res = json(200, { ok: true, k: b.k, fator: b.fator });
      return;
    }

    context.res = json(405, { ok: false, error: 'Método não suportado' });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e) });
  }
};
