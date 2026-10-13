// Assinaturas de e-mail por usuário (usadas em /api/propostas-enviar e /api/propostas-assinatura).
// Ordem de busca para o usuário logado:
//   1) SharePoint, pasta de assinaturas (SP_ASSIN_PATH; padrão: irmã da pasta das propostas) —
//      arquivo <email>.jpg|.png (+ <email>.json com nome/cargo). É onde entram assinaturas cadastradas depois.
//   2) Cadastro que acompanha a aplicação: api/_shared/assinaturas/index.json + imagens.
// Sem assinatura em nenhum dos dois: tem=false (o envio usa uma assinatura em texto e a tela pede o arquivo).
const fs = require('fs');
const path = require('path');
const g = require('./graph');

const DIR = path.join(__dirname, 'assinaturas');
const GRAPH = 'https://graph.microsoft.com/v1.0';
const BASE_PROP = (process.env.SP_PROPOSTAS_PATH || '1 - ATENDIMENTO COMERCIAL/2026/1 - PROPOSTAS/Propostas geradas no SIGE').replace(/^\/+|\/+$/g, '');
const BASE_ASSIN = (process.env.SP_ASSIN_PATH || (BASE_PROP.split('/').slice(0, -1).concat('Assinaturas').join('/'))).replace(/^\/+|\/+$/g, '');
const MIME = { jpg: 'image/jpeg', png: 'image/png' };
const MAX_IMG = 700 * 1024;

function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
function chave(email) { return String(email || '').trim().toLowerCase(); }
function nomeDoEmail(e) { const p = String(e || '').split('@')[0].split('.').map(s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '').filter(Boolean); return p.join(' '); }
function tipoDe(buf) {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.length > 8 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  return null;
}

let CAT = null;
function catalogo() {
  if (CAT === null) { try { CAT = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8')); } catch (e) { CAT = {}; } }
  return CAT;
}

async function lerSP(siteId, nome) {
  const token = await g.getToken();
  const r = await fetch(`${GRAPH}/sites/${siteId}/drive/root:/${encPath(BASE_ASSIN)}/${encodeURIComponent(nome)}:/content`, { headers: { Authorization: 'Bearer ' + token }, redirect: 'follow' });
  if (r.status === 404) return null;
  if (!r.ok) throw Object.assign(new Error('Graph GET assinatura -> ' + r.status), { status: r.status });
  return Buffer.from(await r.arrayBuffer());
}
async function gravarSP(siteId, nome, buf, contentType) {
  const token = await g.getToken();
  const r = await fetch(`${GRAPH}/sites/${siteId}/drive/root:/${encPath(BASE_ASSIN)}/${encodeURIComponent(nome)}:/content?@microsoft.graph.conflictBehavior=replace`, { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': contentType }, body: buf });
  const t = await r.text();
  if (!r.ok) throw Object.assign(new Error('Graph PUT assinatura -> ' + r.status + ': ' + t), { status: r.status });
  return JSON.parse(t);
}

// Devolve { tem, email, nome, cargo, linkedin, b64, mime, ext, origem }
async function obter(email, opts) {
  const k = chave(email), out = { tem: false, email: k, nome: nomeDoEmail(k), cargo: '', linkedin: '', origem: '' };
  if (!k) return out;
  // 1) SharePoint
  try {
    const siteId = await g.getSiteId();
    for (const ext of ['jpg', 'png']) {
      const buf = await lerSP(siteId, k + '.' + ext);
      if (buf && tipoDe(buf)) {
        let meta = {};
        try { const m = await lerSP(siteId, k + '.json'); if (m) meta = JSON.parse(m.toString('utf8')); } catch (e) { /* sem metadados */ }
        return Object.assign(out, { tem: true, nome: meta.nome || out.nome, cargo: meta.cargo || '', linkedin: meta.linkedin || '', b64: buf.toString('base64'), mime: MIME[ext], ext, origem: 'sharepoint' });
      }
    }
  } catch (e) { if (opts && opts.log) opts.log('assinatura SP: ' + (e.message || e)); }
  // 2) cadastro da aplicação
  const c = catalogo()[k];
  if (c && c.file) {
    try {
      const buf = fs.readFileSync(path.join(DIR, c.file)), ext = tipoDe(buf);
      if (ext) return Object.assign(out, { tem: true, nome: c.nome || out.nome, cargo: c.cargo || '', linkedin: c.linkedin || '', b64: buf.toString('base64'), mime: MIME[ext], ext, origem: 'aplicacao' });
    } catch (e) { /* arquivo ausente: segue como sem assinatura */ }
  }
  return out;
}

// Cadastra/atualiza a assinatura do próprio usuário (imagem JPG/PNG)
async function salvar(email, buf, meta) {
  const k = chave(email), ext = tipoDe(buf);
  if (!k) throw Object.assign(new Error('usuário não identificado'), { status: 401 });
  if (!ext) throw Object.assign(new Error('a assinatura deve ser uma imagem JPG ou PNG'), { status: 400 });
  if (buf.length > MAX_IMG) throw Object.assign(new Error('imagem acima de 700 KB — reduza o tamanho'), { status: 413 });
  const siteId = await g.getSiteId();
  const outra = ext === 'jpg' ? 'png' : 'jpg';
  await gravarSP(siteId, k + '.' + ext, buf, MIME[ext]);
  // se havia a outra extensão no SharePoint, ela teria prioridade pela ordem de busca (jpg primeiro): sobrescreve para evitar versão antiga
  try { if (await lerSP(siteId, k + '.' + outra)) await gravarSP(siteId, k + '.' + outra, buf, MIME[ext]); } catch (e) { /* ignora */ }
  const m = { nome: String((meta && meta.nome) || '').trim().slice(0, 80), cargo: String((meta && meta.cargo) || '').trim().slice(0, 100), atualizadoEm: new Date().toISOString() };
  await gravarSP(siteId, k + '.json', Buffer.from(JSON.stringify(m), 'utf8'), 'application/json');
  return true;
}

// Marca que o usuário acessou sem assinatura cadastrada (lista de pendências para o administrador)
async function marcarPendente(email) {
  const k = chave(email);
  const siteId = await g.getSiteId();
  await gravarSP(siteId, '_pendente-' + k + '.txt', Buffer.from('Sem assinatura cadastrada. Último acesso: ' + new Date().toISOString() + '\n', 'utf8'), 'text/plain');
}

module.exports = { obter, salvar, marcarPendente, nomeDoEmail, BASE_ASSIN };
