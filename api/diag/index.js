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
      // 21/09/2026 -- diagnostico temporario (Leo/Claude): investigar "Field 'obs3' is not
      // recognized" mesmo apos criar a coluna -- lista as colunas reais do SharePoint pra ver
      // se obs3 existe de fato e em que formato (allowMultipleLines, readOnly, hidden etc).
      if (kind === 'leads') {
        try {
          // pagina ate o fim (@odata.nextLink) -- a 1a tentativa desse diagnostico so olhou a
          // 1a pagina e so achou 'obs', o que pode ser paginacao escondendo obs2/obs3, nao
          // necessariamente ausencia real.
          let url = `/sites/${out.siteId}/lists/${id}/columns?$select=id,name,text,readOnly,hidden,columnGroup&$top=200`;
          let all = [];
          let pages = 0;
          while (url) {
            const cols = await g.graph('GET', url);
            all = all.concat(cols.value || []);
            url = cols['@odata.nextLink'] || null;
            pages++;
          }
          out.lists[def.displayName].total_colunas = all.length;
          out.lists[def.displayName].paginas = pages;
          out.lists[def.displayName].colunas_obs = all
            .filter(c => /^obs/i.test(c.name))
            .map(c => ({ name: c.name, text: c.text, readOnly: c.readOnly, hidden: c.hidden, columnGroup: c.columnGroup }));
        } catch (e) {
          out.lists[def.displayName].colunas_obs_erro = String(e.message || e);
        }
      }
    }
  } catch (e) {
    out.ok = false; out.error = String(e.message || e); out.body = e.body;
  }
  context.res = json(out.ok ? 200 : 500, out);
};
