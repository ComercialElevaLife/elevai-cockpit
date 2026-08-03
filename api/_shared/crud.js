// crud.js — fábrica de handler GET/POST/PATCH por tipo (leads|vendas|eventos)
const { LISTS, toFields, fromFields } = require('./schema');
const g = require('./graph');

// Identidade do usuário logado, injetada pela SWA no header x-ms-client-principal (base64 JSON)
function readUser(req) {
  try {
    const h = (req.headers && (req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'])) || '';
    if (!h) return '';
    const p = JSON.parse(Buffer.from(h, 'base64').toString('utf8'));
    return p.userDetails || p.userId || '';
  } catch (e) { return ''; }
}

function makeHandler(kind) {
  const def = LISTS[kind];
  return async function (context, req) {
    try {
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
    if (allowed.has(k) && v !== undefined) fields[k] = (v === null ? '' : v);
  }
  fields.alteradoEm = new Date().toISOString();
  fields.alteradoPor = readUser(req) || 'desconhecido';
  await g.updateItem(listId, itemId, fields);
  context.res = json(200, { ok: true, kind, id: itemId, updated: fields });
}

function json(status, obj) {
  return { status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: obj };
}

module.exports = { makeHandler, json };
