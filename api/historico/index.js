// GET /api/historico?entidade=leads&registroId=<id do item>   -> trilha de auditoria de um registro
// Só leitura (function.json aceita apenas GET): o histórico nunca é editado nem apagado por esta API.
// Migração automática: na 1a abertura do histórico de uma negociação, importa (uma única vez) os eventos
// que já existiam na coluna histEventosJson, anteriores à criação da lista Historico_Comercial.
const { LISTS, fromFields } = require('../_shared/schema');
const g = require('../_shared/graph');
const H = require('../_shared/historico');
const { json, requireDomain } = require('../_shared/crud');

const ENTIDADES = { leads: 1, empresas: 1, contatos: 1, vendas: 1, contratos: 1 };
const _migrando = {}; // trava em memória: evita importar 2x se duas abas abrirem ao mesmo tempo

async function migrarLead(histListId, registroId) {
  if (_migrando[registroId]) return;
  _migrando[registroId] = true;
  try {
    const marcas = await g.listItemsFiltered(histListId, "fields/registroId eq '" + registroId + "' and fields/origem eq 'migracao'", 1);
    if (marcas.length) return;
    const { id: leadsId } = await g.ensureList(LISTS.leads);
    let lead = null;
    try { lead = await g.getItem(leadsId, registroId); } catch (e) { if (e.status === 404) return; throw e; }
    const meta = await g.getListMeta(histListId);
    const corte = meta && meta.createdDateTime ? Date.parse(meta.createdDateTime) : Date.now();
    let eventos = [];
    try { const a = JSON.parse(lead.histEventosJson || '[]'); if (Array.isArray(a)) eventos = a; } catch (e) { /* coluna vazia/inválida */ }
    const nome = String(lead.Title || lead.cliente || lead.nome || '').slice(0, 250);
    const antigos = eventos.filter(e => e && e.ts && Date.parse(e.ts) < corte);
    const linhas = antigos.map(e => H._linha('leads', registroId, nome,
      (e.por && e.por !== '(você)') ? e.por : 'não registrado (antes do histórico completo)', 'evento',
      { campo: 'histórico anterior', resumo: String(e.texto || ''), antes: '', depois: '', quando: e.ts }, 'migracao'));
    linhas.push(H._linha('leads', registroId, nome, 'sistema', 'migracao',
      { campo: '', resumo: 'Histórico anterior importado: ' + antigos.length + ' evento(s)', antes: '', depois: '' }, 'migracao'));
    await H.gravar(linhas);
  } finally { delete _migrando[registroId]; }
}

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const q = req.query || {};
    const entidade = String(q.entidade || 'leads');
    const registroId = String(q.registroId || '');
    if (!ENTIDADES[entidade]) { context.res = json(400, { ok: false, error: 'entidade inválida' }); return; }
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(registroId)) { context.res = json(400, { ok: false, error: 'registroId inválido' }); return; }
    const { id: histListId } = await g.ensureList(LISTS.historico);
    if (entidade === 'leads') {
      try { await migrarLead(histListId, registroId); } catch (e) { console.error('HISTORICO: migração falhou', e.message || e); }
    }
    const itens = await g.listItemsFiltered(histListId, "fields/registroId eq '" + registroId + "' and fields/entidade eq '" + entidade + "'", 5000);
    const linhas = itens.map(it => fromFieldsHist(it.fields));
    linhas.sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
    context.res = json(200, { ok: true, entidade, registroId, count: linhas.length, items: linhas });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e) });
  }
};

function fromFieldsHist(f) {
  const out = {};
  LISTS.historico.columns.forEach(c => { out[c.name] = (f[c.name] === undefined || f[c.name] === null) ? '' : f[c.name]; });
  return out;
}
