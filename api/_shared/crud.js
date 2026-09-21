// crud.js — fábrica de handler GET/POST/PATCH por tipo (leads|vendas|eventos)
const { LISTS, toFields, fromFields } = require('./schema');
const g = require('./graph');

// Identidade do usuário logado, injetada pela SWA no header x-ms-client-principal (base64 JSON)
function readPrincipal(req) {
  try {
    const h = (req.headers && (req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'])) || '';
    if (!h) return null;
    return JSON.parse(Buffer.from(h, 'base64').toString('utf8'));
  } catch (e) { return null; }
}

function readUser(req) {
  const p = readPrincipal(req);
  if (!p) return '';
  return p.userDetails || p.userId || '';
}

// 11/09/2026 -- Léo: trava de domínio. Por padrão o provedor AAD pré-configurado da SWA aceita
// QUALQUER conta Microsoft (pessoal ou de outra empresa), não só do nosso domínio -- não dá pra
// restringir por tenant sem um app registration próprio (fora do nosso alcance sem acesso ao
// portal do Azure). Este guard fecha a brecha na camada da API: bloqueia qualquer usuário LOGADO
// cujo e-mail não termine em @elevalife.com.br. Requisições sem login (as rotas explicitamente
// anônimas, ex.: POST /api/lead-publico e POST /api/notificacoes) não são afetadas -- a decisão de
// permitir anônimo ali já é do staticwebapp.config.json, este guard só olha pra quem FEZ login.
const DOMINIO_PERMITIDO = '@elevalife.com.br';
function domainOk(req) {
  const p = readPrincipal(req);
  if (!p) return true;
  const email = String(p.userDetails || '').toLowerCase();
  return email.endsWith(DOMINIO_PERMITIDO);
}
function requireDomain(context, req) {
  if (domainOk(req)) return true;
  context.res = json(403, { ok: false, error: 'Acesso restrito a contas @elevalife.com.br' });
  return false;
}

function makeHandler(kind) {
  const def = LISTS[kind];
  return async function (context, req) {
    try {
      if (!requireDomain(context, req)) return;
      const { id: listId } = await g.ensureList(def); // provisão + garante colunas (inclui auditoria)
      const method = (req.method || 'GET').toUpperCase();

      if (method === 'GET') {
        const raw = await g.listItemsMeta(listId);
        const items = raw.map(r => Object.assign({ __id: r.id }, fromFields(kind, r.fields)));
        context.res = json(200, { ok: true, kind, count: items.length, items });
        return;
      }

      if (method === 'POST') {
        const rec = req.body || {};
        // POST com __id/id = atualização (mesmo efeito do PATCH), senão cria
        if (rec.__id || rec.id) { return await doUpdate(context, req, kind, listId, rec.__id || rec.id, rec.fields || rec); }
        const created = await g.addItem(listId, toFields(kind, rec));
        context.res = json(201, { ok: true, kind, id: created.id, item: Object.assign({ __id: created.id }, fromFields(kind, created.fields || {})) });
        return;
      }

      if (method === 'PATCH') {
        const body = req.body || {};
        const itemId = body.id || body.__id;
        if (!itemId) { context.res = json(400, { ok: false, error: 'faltou id do item' }); return; }
        return await doUpdate(context, req, kind, listId, itemId, body.fields || {});
      }

      if (method === 'DELETE') {
        const body = req.body || {};
        const itemId = body.id || body.__id || (req.query && req.query.id);
        if (!itemId) { context.res = json(400, { ok: false, error: 'faltou id do item' }); return; }
        await g.deleteItem(listId, itemId);
        context.res = json(200, { ok: true, kind, deleted: itemId });
        return;
      }

      context.res = json(405, { ok: false, error: 'Método não suportado' });
    } catch (e) {
      context.res = json(e.status || 500, { ok: false, error: String(e.message || e), body: e.body });
    }
  };
}

// Atualiza campos + carimba alteradoEm (ISO) e alteradoPor (usuário logado)
async function doUpdate(context, req, kind, listId, itemId, patchFields) {
  const def = LISTS[kind];
  const allowed = new Set(def.columns.map(c => c.name));
  const fields = {};
  for (const [k, v] of Object.entries(patchFields || {})) {
    if (k === '__id' || k === 'id' || k === 'fields') continue;
    // 11/09/2026 -- Léo (caso Caldic): leads.obs é coluna legada de linha única (255 chars) que
    // 21/09/2026 -- URGENTE (Léo): obs2 parou de ser reconhecida pelo Graph nesse endpoint
    // ("Field 'obs2' is not recognized"), quebrando TODO PATCH de lead -- ver comentário na coluna
    // obs3 em schema.js (mesmíssimo padrão de historicoJson/tarefasJson: Graph/SharePoint não
    // reaproveita nome interno de coluna de forma confiável). Todo PATCH de "obs" agora vai pra
    // obs3; obs2 fica só como fallback de leitura (ver fromFields em schema.js).
    const key = (kind === 'leads' && k === 'obs') ? 'obs3' : k;
    if (allowed.has(key) && v !== undefined) fields[key] = (v === null ? '' : v);
  }
  fields.alteradoEm = new Date().toISOString();
  fields.alteradoPor = readUser(req) || 'desconhecido';
  await g.updateItem(listId, itemId, fields);
  context.res = json(200, { ok: true, kind, id: itemId, updated: fields });
}

function json(status, obj) {
  return { status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: obj };
}

module.exports = { makeHandler, json, requireDomain, domainOk, readUser };
