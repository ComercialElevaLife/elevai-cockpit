// /api/propostas-enviar — envia a proposta por e-mail (Graph app-only, sendMail) e
// cria/atualiza a oportunidade no Kanban (lista Leads_Comercial).
//  Remetente = usuário logado (@elevalife.com.br); se a caixa dele não aceitar envio app-only,
//  cai para PROP_SENDER (padrão leonardo@) com Reply-To do usuário.
//  CC fixo = PROP_CC (padrão leonardo@ + rafael@) + extras informados.
//  Ordem: 1) e-mail  2) Kanban. Se o e-mail falha, o Kanban NÃO é tocado.
//  Requer Mail.Send (Application) — já usado por /api/enviar-renovacao.
const g = require('../_shared/graph');
const { LISTS, toFields, fromFields } = require('../_shared/schema');
const { json, requireDomain, readUser } = require('../_shared/crud');

const SENDER_PADRAO = process.env.PROP_SENDER || 'leonardo@elevalife.com.br';
const CC_FIXO = (process.env.PROP_CC || 'leonardo@elevalife.com.br,rafael@elevalife.com.br')
  .split(',').map(s => s.trim()).filter(Boolean);
const MAX_PDF = 3 * 1024 * 1024; // sendMail aceita anexo inline até ~3 MB

function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function nl2br(s){ return esc(s).replace(/\r?\n/g,'<br>'); }
const fs = require('fs');
const path = require('path');
let ASSIN_B64 = null;
function assinaturaB64(){ if (ASSIN_B64 === null) { try { ASSIN_B64 = fs.readFileSync(path.join(__dirname, 'assinatura.jpg')).toString('base64'); } catch (e) { ASSIN_B64 = ''; } } return ASSIN_B64; }

// Layout no padrão dos e-mails do S.I.G.E. (faixa vinho, corpo com borda suave), com a assinatura padrão ElevaLife.
function montarHtml(corpo, temAssin) {
  const blocos = String(corpo || '').replace(/\r/g, '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const P = 'font-size:14.5px;line-height:1.65;margin:0 0 14px;color:#2a1a1a';
  const html = blocos.map(b => {
    const ls = b.split('\n');
    const itens = ls.filter(l => /^\s*[•\-\*]\s+/.test(l));
    if (itens.length && itens.length === ls.length) {
      return '<ul style="font-size:14.5px;line-height:1.65;margin:0 0 14px;padding-left:20px;color:#2a1a1a">' +
        itens.map(l => '<li style="margin:0 0 6px">' + esc(l.replace(/^\s*[•\-\*]\s+/, '')) + '</li>').join('') + '</ul>';
    }
    return '<p style="' + P + '">' + ls.map(esc).join('<br>') + '</p>';
  }).join('');
  const assin = temAssin
    ? '<div style="margin-top:22px;padding-top:16px;border-top:1px solid #e5d9d9"><p style="font-size:14.5px;margin:0 0 10px;color:#2a1a1a">Atenciosamente,</p>' +
      '<img src="cid:assinatura-elevalife" alt="Leonardo Scaccabarozzi | Executivo de Novos Negócios | ElevaLife" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0">' +
      '<p style="font-size:12.5px;color:#7a6a6a;margin:10px 0 0">Siga nossas redes sociais: <a href="https://www.linkedin.com/in/leonardo-santana-scaccabarozzi-b39767169" style="color:#8b3a42">LinkedIn</a></p></div>'
    : '';
  return '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#2a1a1a">' +
    '<div style="background:#5c1a2b;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0"><div style="font-weight:700;font-size:18px">ElevaLife</div>' +
    '<div style="font-size:12px;opacity:.85">15 anos elevando pessoas e resultados</div></div>' +
    '<div style="border:1px solid #e5d9d9;border-top:none;border-radius:0 0 10px 10px;padding:24px">' + html + assin + '</div></div>';
}
function addr(a){ return { emailAddress: { address: String(a).trim() } }; }
function lista(v){ return String(Array.isArray(v) ? v.join(',') : (v || '')).split(/[;,\s]+/).map(s => s.trim()).filter(s => s.indexOf('@') > 0); }
function hojeISO(){ return new Date().toISOString().slice(0, 10); }
function nomeDoEmail(e){ const p = String(e || '').split('@')[0].split('.')[0]; return p ? p.charAt(0).toUpperCase() + p.slice(1) : ''; }

async function enviar(remetente, msg) {
  await g.graph('POST', '/users/' + encodeURIComponent(remetente) + '/sendMail', msg);
}

module.exports = async function (context, req) {
  try {
    if (!requireDomain(context, req)) return;
    const user = String(readUser(req) || '').toLowerCase();
    if (!user || !user.endsWith('@elevalife.com.br')) {
      context.res = json(401, { ok: false, error: 'login @elevalife.com.br necessário para enviar' }); return;
    }
    const b = req.body || {};
    const para = lista(b.para);
    if (!para.length) { context.res = json(400, { ok: false, error: 'informe ao menos um e-mail válido em "Para"' }); return; }
    const assunto = String(b.assunto || '').trim();
    if (!assunto) { context.res = json(400, { ok: false, error: 'faltou o assunto' }); return; }
    if (!b.pdfBase64) { context.res = json(400, { ok: false, error: 'anexe o PDF da proposta' }); return; }
    const pdfBytes = Buffer.from(String(b.pdfBase64), 'base64').length;
    if (pdfBytes > MAX_PDF) { context.res = json(413, { ok: false, error: 'PDF acima de 3 MB — comprima o arquivo' }); return; }

    // CC: fixos + extras, sem repetir destinatários
    const paraSet = new Set(para.map(s => s.toLowerCase()));
    const cc = Array.from(new Set(CC_FIXO.concat(lista(b.cc)).map(s => s.toLowerCase())))
      .filter(a => !paraSet.has(a) && a !== user);

    const assinB64 = assinaturaB64();
    const corpoHtml = montarHtml(b.corpo || '', !!assinB64);
    const nomePdf = String(b.pdfNome || 'Proposta ElevaLife.pdf').replace(/[\\/:*?"<>|]/g, '-');
    const mk = (replyTo) => {
      const m = {
        message: {
          subject: assunto,
          body: { contentType: 'HTML', content: corpoHtml },
          toRecipients: para.map(addr),
          ccRecipients: cc.map(addr),
          attachments: [{ '@odata.type': '#microsoft.graph.fileAttachment', name: nomePdf, contentType: 'application/pdf', contentBytes: String(b.pdfBase64) }]
            .concat(assinB64 ? [{ '@odata.type': '#microsoft.graph.fileAttachment', name: 'assinatura-elevalife.jpg', contentType: 'image/jpeg', contentBytes: assinB64, isInline: true, contentId: 'assinatura-elevalife' }] : []),
        },
        saveToSentItems: true,
      };
      if (replyTo) m.message.replyTo = [addr(replyTo)];
      return m;
    };

    // 1) E-MAIL
    let de = user, fallback = false;
    try {
      await enviar(user, mk(null));
    } catch (e) {
      if (user === SENDER_PADRAO.toLowerCase()) throw e;
      de = SENDER_PADRAO; fallback = true;
      await enviar(SENDER_PADRAO, mk(user));
    }

    // 2) KANBAN
    const resp = { ok: true, email: { de, para, cc, fallback }, kanban: null };
    try {
      resp.kanban = await atualizarKanban(b.lead || {}, b, user);
    } catch (e) {
      resp.kanban = { ok: false, error: String(e.message || e) };
    }
    context.res = json(200, resp);
  } catch (e) {
    context.res = json(e.status || 500, { ok: false, error: String(e.message || e), body: e.body });
  }
};

function histAppend(raw, texto, por) {
  let arr = [];
  try { arr = JSON.parse(raw || '[]'); if (!Array.isArray(arr)) arr = []; } catch (e) { arr = []; }
  arr.unshift({ ts: new Date().toISOString(), texto, por });
  return JSON.stringify(arr.slice(0, 50));
}

async function atualizarKanban(lead, b, user) {
  const def = LISTS.leads;
  const { id: listId } = await g.ensureList(def);
  const hoje = hojeISO();
  const valorMensal = Number(lead.valorMensal) || 0;
  const numMeses = Number(lead.numMeses) || 0;
  const valor = Number(lead.valor) || (valorMensal && numMeses ? Math.round(valorMensal * numMeses * 100) / 100 : 0);
  const serv = String(lead.serv || '').trim();
  const por = user;
  const texto = 'Proposta enviada por e-mail para ' + lista(b.para).join(', ') + (valor ? ' · ' + valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '') + (serv ? ' · ' + serv : '');

  if (lead.id) {
    const itens = await g.listItemsMeta(listId);
    const it = itens.find(r => String(r.id) === String(lead.id));
    if (!it) throw new Error('oportunidade não encontrada no Kanban');
    const atual = fromFields('leads', it.fields);
    if (['VENDIDA', 'PERDIDA', 'PAUSADA'].includes(String(atual.status || '').toUpperCase())) {
      throw new Error('oportunidade está em ' + atual.status + ' — reative no Kanban ou crie uma nova');
    }
    const campos = {
      status: 'EM NEGOCIAÇÃO', subEtapa: 'Proposta', prop: 'SIM', envio: hoje,
      histEventosJson: histAppend(atual.histEventosJson, texto, por),
      alteradoEm: new Date().toISOString(), alteradoPor: por,
    };
    if (valor) campos.valor = valor;
    if (valorMensal) campos.valorMensal = valorMensal;
    if (numMeses) campos.numMeses = numMeses;
    if (serv) campos.serv = serv;
    if (lead.tipo) campos.tipo = lead.tipo;
    await g.updateItem(listId, it.id, campos);
    return { ok: true, acao: 'atualizada', id: it.id, de: atual.status, para: 'EM NEGOCIAÇÃO · Proposta' };
  }

  const d = new Date();
  const rec = {
    y: d.getFullYear(), m: d.getMonth() + 1, dt: hoje,
    nome: String(lead.nome || '').trim(), cliente: String(lead.cliente || '').trim(),
    unidade: String(lead.unidade || '').trim(), fonte: String(lead.fonte || 'Proposta SIGE'),
    cons: String(lead.cons || nomeDoEmail(user)), serv, prop: 'SIM', valor, tipo: String(lead.tipo || 'N/A'),
    envio: hoje, status: 'EM NEGOCIAÇÃO', subEtapa: 'Proposta', origemFunil: 'NOVO',
    email: lista(b.para)[0] || '',
    histEventosJson: histAppend('[]', 'Oportunidade criada pelo envio de proposta · ' + texto, por),
  };
  if (valorMensal) rec.valorMensal = valorMensal;
  if (numMeses) rec.numMeses = numMeses;
  if (!rec.cliente) throw new Error('informe a empresa para criar a oportunidade');
  const created = await g.addItem(listId, toFields('leads', rec));
  return { ok: true, acao: 'criada', id: created.id, para: 'EM NEGOCIAÇÃO · Proposta' };
}
