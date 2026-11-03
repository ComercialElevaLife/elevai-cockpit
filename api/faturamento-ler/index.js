// faturamento-ler — FASE 1 da integração SIGE-novasreceitas <-> Faturamento de Serviços (03/11/2026).
// SOMENTE LEITURA. Lê FAT_Clientes, FAT_Contratos e FAT_Itens do site BPM (SharePoint) com a identidade do próprio
// servidor (Graph app-only, a mesma de _shared/graph.js) e devolve só o que o comunicado de venda precisa:
// cliente, Nº do contrato, vigência, status e serviços. NUNCA devolve valores (ValorMensal, retenções, rateio),
// porque o Faturamento restringe isso por permissão de pessoa e aqui a leitura é feita pelo servidor.
// Acesso: somente contas @elevalife.com.br logadas (requireDomain + regra /api/* do staticwebapp.config.json).
const g = require('../_shared/graph');
const { json, requireDomain } = require('../_shared/crud');

const BPM_HOST = process.env.FAT_SP_HOSTNAME || 'elevalife.sharepoint.com';
const BPM_PATH = process.env.FAT_SP_SITEPATH || '/sites/BUSINESSPROCESSMANAGEMENT';
const TTL_MS = 60000;
let _siteId = null;
let _cache = null; // { t, body }

async function siteId() {
  if (_siteId) return _siteId;
  const j = await g.graph('GET', '/sites/' + BPM_HOST + ':' + BPM_PATH);
  _siteId = j.id;
  return _siteId;
}

async function lerLista(nome) {
  const sid = await siteId();
  const f = await g.graph('GET', '/sites/' + sid + '/lists?$filter=displayName eq ' + "'" + encodeURIComponent(nome) + "'" + '&$select=id,displayName');
  const lista = (f.value || [])[0];
  if (!lista) return [];
  const out = [];
  let url = '/sites/' + sid + '/lists/' + lista.id + '/items?expand=fields&$top=200';
  while (url) {
    const j = await g.graph('GET', url);
    (j.value || []).forEach(function (it) { out.push({ id: String(it.id), f: it.fields || {} }); });
    url = j['@odata.nextLink'] || null;
  }
  return out;
}

const s = function (v) { return v == null ? '' : String(v); };

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    if (_cache && Date.now() - _cache.t < TTL_MS) { context.res = json(200, _cache.body); return; }
    const r = await Promise.all([lerLista('FAT_Clientes'), lerLista('FAT_Contratos'), lerLista('FAT_Itens')]);
    const body = {
      ok: true,
      fonte: 'FAT_* (site BPM)',
      lidoEm: new Date().toISOString(),
      clientes: r[0].map(function (x) {
        return { id: x.id, nome: s(x.f.Title), razao: s(x.f.RazaoSocial), cnpj: s(x.f.CNPJ), unidade: s(x.f.Unidade), area: s(x.f.Area),
          coordenador: s(x.f.Coordenador), coordenadorEmail: s(x.f.CoordenadorEmail), aprovador: s(x.f.AprovadorNome), aprovadorEmail: s(x.f.AprovadorEmail), ativo: x.f.Ativo !== false };
      }),
      contratos: r[1].map(function (x) {
        return { id: x.id, clienteId: s(x.f.ClienteId), numero: s(x.f.Title), versao: Number(x.f.Versao) || 1, inicio: s(x.f.Inicio), fim: s(x.f.Fim),
          status: s(x.f.Status), indice: s(x.f.IndiceReajuste), mesReajuste: s(x.f.MesReajuste), diaLimiteNF: x.f.DiaLimiteNF == null ? '' : s(x.f.DiaLimiteNF) };
      }),
      itens: r[2].map(function (x) {
        return { id: x.id, contratoId: s(x.f.ContratoId), clienteId: s(x.f.ClienteId), servico: s(x.f.Title), cargo: s(x.f.Cargo),
          codigoServico: s(x.f.CodigoServicoNF), prazoFaturamento: x.f.PrazoFaturamento == null ? '' : s(x.f.PrazoFaturamento), numPedido: s(x.f.NumPedido) };
      })
    };
    _cache = { t: Date.now(), body: body };
    context.res = json(200, body);
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String((e && e.message) || e).slice(0, 300) });
  }
};
