const { LISTS } = require('../_shared/schema');
const g = require('../_shared/graph');
const { json, requireDomain } = require('../_shared/crud');

module.exports = async function (context, req) {
  if (!requireDomain(context, req)) return;
  const out = { ok: true, env: {
    hasClientId: !!process.env.AAD_CLIENT_ID,
    hasSecret: !!process.env.AAD_CLIENT_SECRET,
    tenant: process.env.TENANT_ID || '(default)',
    hostname: g.HOSTNAME, sitePath: g.SITEPATH,
  }, lists: {} };
  try {
    await g.getToken(); out.tokenOk = true;
    out.siteId = await g.getSiteId();
    for (const kind of Object.keys(LISTS)) {
      const def = LISTS[kind];
      const id = await g.findList(def.displayName);
      if (!id) { out.lists[def.displayName] = { exists: false }; continue; }
      const items = await g.listItems(id);
      out.lists[def.displayName] = { exists: true, id, count: items.length };
    }
  } catch (e) {
    out.ok = false; out.error = String(e.message || e); out.body = e.body;
  }
  context.res = json(out.ok ? 200 : 500, out);
};
