const { LISTS, toFields } = require('../_shared/schema');
const g = require('../_shared/graph');
const { json } = require('../_shared/crud');

async function bulkInsert(siteId, listId, records) {
  let done = 0; const errors = [];
  for (let i = 0; i < records.length; i += 20) {
    const chunk = records.slice(i, i + 20);
    const requests = chunk.map((fields, k) => ({
      id: String(k), method: 'POST',
      url: `/sites/${siteId}/lists/${listId}/items`,
      headers: { 'Content-Type': 'application/json' }, body: { fields },
    }));
    const res = await g.graph('POST', '/$batch', { requests });
    for (const r of (res.responses || [])) {
      if (r.status >= 200 && r.status < 300) done++; else errors.push({ status: r.status, body: r.body });
    }
  }
  return { done, errors };
}

// POST /api/migrate?fresh=1  body: { leads:[...], vendas:[...], eventos:[...] }
module.exports = async function (context, req) {
  const fresh = (req.query.fresh === '1');
  const force = (req.query.force === '1');
  const body = req.body || {};
  const report = {};
  try {
    const siteId = await g.getSiteId();
    for (const kind of Object.keys(LISTS)) {
      const data = body[kind];
      if (!Array.isArray(data)) { report[kind] = { skipped: true, reason: 'sem dados no corpo' }; continue; }
      const def = LISTS[kind];
      const { id } = await g.ensureList(def);
      let ids = await g.listItemIds(id);
      let cleared = 0;
      if (ids.length > 0 && fresh) { for (const it of ids) { try { await g.deleteItem(id, it); cleared++; } catch (e) {} } ids = []; }
      if (ids.length > 0 && !force) { report[kind] = { skipped: true, existing: ids.length, hint: '?fresh=1 limpa e recarrega' }; continue; }
      const { done, errors } = await bulkInsert(siteId, id, data.map(r => toFields(kind, r)));
      report[kind] = { cleared, inserted: done, total: data.length, errorCount: errors.length, errors: errors.slice(0, 3) };
    }
    context.res = json(200, { ok: true, mode: fresh ? 'fresh' : (force ? 'force' : 'safe'), report });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e), body: e.body, report });
  }
};
