// evidencia/index.js — print de tela (JPEG/PNG) como evidência de venda.
// 03/11/2026 — Léo: o cliente às vezes confirma a compra por e-mail/WhatsApp; o print vira evidência.
// POST {lead, mime, b64} -> grava o arquivo no SharePoint do Comercial e devolve {ok, nome}.
// GET  ?n=<nome>        -> devolve a imagem (só usuários @elevalife.com.br logados).
// No card fica só "print:<nome>" (cabe nos 255 caracteres do campo Evidência).
const g = require('../_shared/graph');
const { json, requireDomain, readUser } = require('../_shared/crud');

const GRAPH = 'https://graph.microsoft.com/v1.0';
const BASE_PROP = (process.env.SP_PROPOSTAS_PATH || '1 - ATENDIMENTO COMERCIAL/2026/1 - PROPOSTAS/Propostas geradas no SIGE').replace(/^\/+|\/+$/g, '');
const BASE_EV = (process.env.SP_EVIDENCIAS_PATH || BASE_PROP.split('/').slice(0, -1).concat('Evidencias de venda').join('/')).replace(/^\/+|\/+$/g, '');
const MAX = 4 * 1024 * 1024;
const MIME = { jpg: 'image/jpeg', png: 'image/png' };
const encPath = p => p.split('/').map(encodeURIComponent).join('/');
function tipoDe(b) {
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.length > 8 && b.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  return null;
}

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const method = (req.method || 'GET').toUpperCase();
    const siteId = await g.getSiteId();
    const token = await g.getToken();
    if (method === 'GET') {
      const n = String((req.query && req.query.n) || '');
      if (!/^[A-Za-z0-9_.-]{3,120}\.(jpg|png)$/.test(n)) { context.res = json(400, { ok: false, error: 'nome inválido' }); return; }
      const r = await fetch(GRAPH + '/sites/' + siteId + '/drive/root:/' + encPath(BASE_EV) + '/' + encodeURIComponent(n) + ':/content', { headers: { Authorization: 'Bearer ' + token }, redirect: 'follow' });
      if (r.status === 404) { context.res = json(404, { ok: false, error: 'arquivo não encontrado' }); return; }
      if (!r.ok) { context.res = json(502, { ok: false, error: 'falha ao ler o arquivo (' + r.status + ')' }); return; }
      const buf = Buffer.from(await r.arrayBuffer());
      context.res = { status: 200, isRaw: true, headers: { 'Content-Type': MIME[n.split('.').pop()], 'Cache-Control': 'private, max-age=3600' }, body: buf };
      return;
    }
    if (method !== 'POST') { context.res = json(405, { ok: false, error: 'método não permitido' }); return; }
    const b = req.body || {};
    const buf = Buffer.from(String(b.b64 || ''), 'base64');
    const ext = tipoDe(buf);
    if (!ext) { context.res = json(400, { ok: false, error: 'envie uma imagem JPEG ou PNG' }); return; }
    if (buf.length > MAX) { context.res = json(413, { ok: false, error: 'imagem acima de 4 MB' }); return; }
    const lead = String(b.lead || 'lead').replace(/[^A-Za-z0-9]/g, '').slice(0, 20) || 'lead';
    const nome = 'ev_' + lead + '_' + Date.now() + '.' + ext;
    const r = await fetch(GRAPH + '/sites/' + siteId + '/drive/root:/' + encPath(BASE_EV) + '/' + encodeURIComponent(nome) + ':/content?@microsoft.graph.conflictBehavior=rename', { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': MIME[ext] }, body: buf });
    const t = await r.text();
    if (!r.ok) { context.log && context.log('evidencia PUT ' + r.status + ': ' + t); context.res = json(502, { ok: false, error: 'não foi possível gravar no SharePoint (' + r.status + ')' }); return; }
    context.log && context.log('evidencia gravada por ' + readUser(req) + ': ' + nome);
    context.res = json(200, { ok: true, nome });
  } catch (e) {
    context.res = json(500, { ok: false, error: String((e && e.message) || e) });
  }
};
