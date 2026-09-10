const { LISTS, toFields } = require('../_shared/schema');
const g = require('../_shared/graph');
const { json, requireDomain } = require('../_shared/crud');

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

// GET/POST /api/migrate?dedup=1        -> PREVIA (nao apaga; mostra o que removeria)
// GET/POST /api/migrate?dedup=1&commit=1 -> APLICA (remove as copias extras)
// Regra: agrupa por TODOS os campos do schema EXCETO auditoria (alteradoEm/alteradoPor).
//        Em cada grupo repetido mantem 1 (prioriza o que tem alteradoEm; senao o de menor id) e apaga o resto.
async function dedupLists(commit) {
  const report = {};
  for (const kind of Object.keys(LISTS)) {
    const def = LISTS[kind];
    const id = await g.findList(def.displayName);
    if (!id) { report[kind] = { skipped: true, reason: 'lista nao existe' }; continue; }
    const items = await g.listItemsMeta(id); // [{id, fields}]
    const keyCols = def.columns.map(c => c.name).filter(n => n !== 'alteradoEm' && n !== 'alteradoPor');
    const groups = {};
    for (const it of items) {
      const f = it.fields || {};
      const key = keyCols.map(n => { const v = f[n]; return (v === undefined || v === null) ? '' : String(v).trim(); }).join('|');
      (groups[key] = groups[key] || []).push(it);
    }
    let dupGroups = 0, extras = 0, removed = 0; const amostra = [];
    for (const k of Object.keys(groups)) {
      const arr = groups[k];
      if (arr.length <= 1) continue;
      dupGroups++; extras += arr.length - 1;
      arr.sort((a, b) => {
        const ea = (a.fields && a.fields.alteradoEm) ? 1 : 0, eb = (b.fields && b.fields.alteradoEm) ? 1 : 0;
        if (ea !== eb) return eb - ea;                 // manter o editado
        return (Number(a.id) || 0) - (Number(b.id) || 0); // senao o mais antigo
      });
      const drop = arr.slice(1);
      if (amostra.length < 8) amostra.push({ manter: arr[0].id, remover: drop.map(x => x.id) });
      if (commit) { for (const d of drop) { try { await g.deleteItem(id, d.id); removed++; } catch (e) {} } }
    }
    report[kind] = { total: items.length, gruposDuplicados: dupGroups, linhasExtras: extras, removidas: commit ? removed : 0, aplicado: !!commit, amostra };
  }
  return json(200, { ok: true, mode: commit ? 'dedup-commit' : 'dedup-previa', report });
}

// POST /api/migrate?fresh=1  body: { leads:[...], vendas:[...], eventos:[...] }
module.exports = async function (context, req) {
  if (!requireDomain(context, req)) return;
  const fresh = (req.query.fresh === '1');
  const force = (req.query.force === '1');
  const dedup = (req.query.dedup === '1');   // deduplicacao: remove linhas identicas repetidas
  const commit = (req.query.commit === '1'); // sem commit = previa (dry-run), nao apaga nada
  const body = req.body || {};
  const report = {};
  try {
    if (dedup) { context.res = await dedupLists(commit); return; }
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
