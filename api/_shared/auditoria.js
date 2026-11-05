// auditoria.js — registro de AUDITORIA só no back (regra fixa do Léo, 05/11/2026).
// Uma linha por ação do usuário logado (criar, editar, excluir, restaurar, enviar, baixar...). O usuário e o IP vêm do
// servidor (cabeçalho da Static Web App), nunca da tela. Só de acréscimo. NUNCA derruba a operação principal: se falhar, só loga no servidor.
const { LISTS } = require('./schema');
const g = require('./graph');

function _usuario(req) {
  try {
    const h = (req.headers && (req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'])) || '';
    if (!h) return '';
    const p = JSON.parse(Buffer.from(h, 'base64').toString('utf8'));
    return String(p.userDetails || p.userId || '');
  } catch (e) { return ''; }
}
function _ip(req) {
  const h = (req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])) || '';
  return String(h).split(',')[0].trim().replace(/:\d+$/, '').slice(0, 64);
}
const _c = (s, n) => String(s == null ? '' : s).slice(0, n);

// Grava 1 linha. Devolve Promise (pode ser ignorada: nunca rejeita).
function registrar(req, acao, d) {
  d = d || {};
  const linha = {
    Title: _c(d.resumo || acao, 250), quando: new Date().toISOString(), usuario: _usuario(req) || 'sistema (automático)',
    acao: _c(acao, 60), entidade: _c(d.entidade, 60), registroId: _c(d.registroId, 64), registroNome: _c(d.registroNome, 250),
    resumo: _c(d.resumo || acao, 250), detalhe: _c(d.detalhe, 20000), origem: _c(d.origem || 'sistema', 30), ip: _ip(req),
  };
  return (async () => {
    try { const { id } = await g.ensureList(LISTS.auditoria); await g.addItem(id, linha); return { ok: true }; }
    catch (e) { console.error('AUDITORIA_FALHOU', e && (e.message || e)); return { ok: false }; }
  })();
}

module.exports = { registrar };
