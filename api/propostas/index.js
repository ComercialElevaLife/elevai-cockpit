// /api/propostas — grava/lê propostas geradas na tela "Propostas" no SharePoint (Graph app-only).
// Pasta (biblioteca padrão do site Comercial): SP_PROPOSTAS_PATH, padrão abaixo.
//   GET  /api/propostas            -> lista os arquivos da pasta
//   GET  /api/propostas?id=ITEMID  -> devolve o conteúdo (JSON) de uma proposta salva
//   POST /api/propostas            -> { nome, estado }  salva JSON editável | { nome, pdfBase64 } salva o PDF final
// Requer a permissão Graph Sites.ReadWrite.All (Application) — já concedida ao app ElevAI Cockpit.
const g = require('../_shared/graph');
const { json, requireDomain } = require('../_shared/crud');

const BASE = (process.env.SP_PROPOSTAS_PATH || '1 - ATENDIMENTO COMERCIAL/2026/1 - PROPOSTAS/Propostas geradas no SIGE').replace(/^\/+|\/+$/g, '');
const GRAPH = 'https://graph.microsoft.com/v1.0';

function safeName(s) { return String(s || 'proposta').replace(/[\\\/:*?"<>|#%~&{}]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || 'proposta'; }
function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }

async function putContent(siteId, name, buf, contentType) {
  const token = await g.getToken();
  const url = `${GRAPH}/sites/${siteId}/drive/root:/${encPath(BASE)}/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=replace`;
  if (buf.length <= 3.5 * 1024 * 1024) {
    const r = await fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': contentType }, body: buf });
    const t = await r.text();
    if (!r.ok) throw Object.assign(new Error('Graph PUT -> ' + r.status + ': ' + t), { status: r.status });
    return JSON.parse(t);
  }
  // arquivo grande: sessão de upload (um único bloco)
  const s = await g.graph('POST', `/sites/${siteId}/drive/root:/${encPath(BASE)}/${encodeURIComponent(name)}:/createUploadSession`, { item: { '@microsoft.graph.conflictBehavior': 'replace' } });
  const r = await fetch(s.uploadUrl, { method: 'PUT', headers: { 'Content-Length': String(buf.length), 'Content-Range': `bytes 0-${buf.length - 1}/${buf.length}` }, body: buf });
  const t = await r.text();
  if (!r.ok) throw Object.assign(new Error('Graph upload -> ' + r.status + ': ' + t), { status: r.status });
  return JSON.parse(t);
}

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const siteId = await g.getSiteId();
    if (req.method === 'GET') {
      const id = req.query && req.query.id;
      if (id) {
        const token = await g.getToken();
        const r = await fetch(`${GRAPH}/sites/${siteId}/drive/items/${encodeURIComponent(id)}/content`, { headers: { Authorization: 'Bearer ' + token }, redirect: 'follow' });
        if (!r.ok) { context.res = json(r.status, { ok: false, error: 'não foi possível ler a proposta' }); return; }
        const txt = await r.text();
        let estado = null; try { estado = JSON.parse(txt); } catch (_) {}
        context.res = json(200, { ok: true, estado });
        return;
      }
      try {
        const j = await g.graph('GET', `/sites/${siteId}/drive/root:/${encPath(BASE)}:/children?$select=id,name,size,lastModifiedDateTime,webUrl,lastModifiedBy&$top=200`);
        const items = (j.value || []).map(x => ({ id: x.id, name: x.name, size: x.size, modificado: x.lastModifiedDateTime, webUrl: x.webUrl, por: (x.lastModifiedBy && x.lastModifiedBy.user && x.lastModifiedBy.user.displayName) || '' }))
          .sort((a, b) => String(b.modificado).localeCompare(String(a.modificado)));
        context.res = json(200, { ok: true, pasta: BASE, items });
      } catch (e) {
        if (e.status === 404) { context.res = json(200, { ok: true, pasta: BASE, items: [] }); return; }
        throw e;
      }
      return;
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const nome = safeName(b.nome);
      let item;
      if (b.pdfBase64) {
        const buf = Buffer.from(String(b.pdfBase64).replace(/^data:application\/pdf;base64,/, ''), 'base64');
        if (buf.length < 1000 || buf.slice(0, 4).toString() !== '%PDF') { context.res = json(400, { ok: false, error: 'arquivo não parece um PDF' }); return; }
        item = await putContent(siteId, nome.replace(/\.pdf$/i, '') + '.pdf', buf, 'application/pdf');
      } else if (b.estado) {
        const buf = Buffer.from(JSON.stringify({ versao: 1, salvoEm: new Date().toISOString(), estado: b.estado }), 'utf8');
        item = await putContent(siteId, nome.replace(/\.json$/i, '') + '.json', buf, 'application/json');
      } else { context.res = json(400, { ok: false, error: 'envie "estado" (JSON) ou "pdfBase64"' }); return; }
      context.res = json(201, { ok: true, id: item.id, name: item.name, webUrl: item.webUrl });
      return;
    }
    context.res = json(405, { ok: false, error: 'Método não suportado' });
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e) });
  }
};
