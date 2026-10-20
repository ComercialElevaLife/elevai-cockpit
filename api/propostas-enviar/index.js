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
const A = require('../_shared/assinatura'); // assinatura por usuário (SharePoint + cadastro da aplicação)
const AG = require('../_shared/agenda'); // compromisso no calendário (emitente = usuário logado) + link do card

// Layout no padrão dos e-mails do S.I.G.E. (faixa vinho, corpo com borda suave), com a assinatura padrão ElevaLife.
function montarHtml(corpo, sig) {
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
  const quem = [sig.nome, sig.cargo, 'ElevaLife'].filter(Boolean).join(' | ');
  const assin = sig.tem
    ? '<div style="margin-top:22px;padding-top:16px;border-top:1px solid #e5d9d9"><p style="font-size:14.5px;margin:0 0 10px;color:#2a1a1a">Atenciosamente,</p>' +
      '<img src="cid:assinatura-elevalife" alt="' + esc(quem) + '" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0">' +
      (sig.linkedin ? '<p style="font-size:12.5px;color:#7a6a6a;margin:10px 0 0">Siga nossas redes sociais: <a href="' + esc(sig.linkedin) + '" style="color:#8b3a42">LinkedIn</a></p>' : '') + '</div>'
    : '<div style="margin-top:22px;padding-top:16px;border-top:1px solid #e5d9d9"><p style="font-size:14.5px;margin:0 0 4px;color:#2a1a1a">Atenciosamente,</p>' +
      '<p style="font-size:14.5px;margin:0;color:#2a1a1a"><b>' + esc(sig.nome) + '</b><br>ElevaLife · www.elevalife.com.br</p></div>';
  return '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#2a1a1a">' +
    '<div style="background:#5c1a2b;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0"><div style="font-weight:700;font-size:18px">ElevaLife</div>' +
    '<div style="font-size:12px;opacity:.85">15 anos elevando pessoas e resultados</div></div>' +
    '<div style="border:1px solid #e5d9d9;border-top:none;border-radius:0 0 10px 10px;padding:24px">' + html + assin + '</div></div>';
}
function addr(a){ return { emailAddress: { address: String(a).trim() } }; }
function lista(v){ return String(Array.isArray(v) ? v.join(',') : (v || '')).split(/[;,\s]+/).map(s => s.trim()).filter(s => s.indexOf('@') > 0); }
function hojeISO(){ return new Date().toISOString().slice(0, 10); }
const CONS_POR_EMAIL = { 'leonardo@elevalife.com.br': 'LS', 'joao@elevalife.com.br': 'JB', 'rafael@elevalife.com.br': 'RP', 'clara@elevalife.com.br': 'MKT', 'contato@elevalife.com.br': 'COM' };
function consDoUsuario(user, informado){ return CONS_POR_EMAIL[String(user || '').toLowerCase()] || (['LS','JB','RP','MKT','COM','OPER'].includes(String(informado || '')) ? informado : nomeDoEmail(user)); }
function nomeDoEmail(e){ const p = String(e || '').split('@')[0].split('.')[0]; return p ? p.charAt(0).toUpperCase() + p.slice(1) : ''; }

// ---- Agradecimento padrão (entra sozinho se o texto do e-mail foi editado sem ele) ----
const AGRADECIMENTO = 'Agradecemos a oportunidade de apresentar nosso trabalho e a atenção dedicada ao nosso time. Ficamos à disposição para esclarecer dúvidas e ajustar o que for necessário à rotina de vocês.';

// ---- FUP 1 automático: mesmo ciclo do Kanban (proposta enviada → sub-etapa FUP, 1º FUP em 2 dias) ----
// Responsável e emitente do lembrete = usuário logado que criou/enviou a proposta.
const FUP_DIAS = 2;
function dataBRT(dias){ return new Date(Date.now() - 3 * 3600000 + dias * 86400000).toISOString().slice(0, 10); } // data em Brasília
function montarFup(user, para){
  return { tipo: 'Tarefa', titulo: 'FUP 1', resp: consDoUsuario(user, ''), email: user, data: dataBRT(FUP_DIAS), hora: '09:00', dur: 30, part: '',
    conteudo: 'Follow-up automático (playbook comercial) — proposta enviada por e-mail para ' + (para || []).join(', ') + '.', feito: false };
}
function tarefasDe(it){
  try { const a = JSON.parse((it && (it.tarefasJson2 || it.tarefasJson)) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
// Lança a tarefa no calendário de quem enviou, com resumo + link do card. Falha aqui NÃO desfaz o envio: volta no resultado.
async function agendarFup(user, t, card){
  const res = { titulo: t.titulo, data: t.data, hora: t.hora, responsavel: t.email, agenda: null };
  try {
    const r = await AG.criarEvento({ organizador: user, tipo: t.tipo, titulo: t.titulo, inicioLocal: t.data + 'T' + t.hora, duracaoMin: t.dur,
      responsavelEmail: t.email, participantes: '', conteudo: t.conteudo, card });
    res.agenda = { ok: true, webLink: r.webLink || null };
  } catch (e) {
    res.agenda = { ok: false, error: AG.explicarErro(e, user) };
  }
  return res;
}

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

    const sig = await A.obter(user, { log: (m) => context.log(m) });
    // Agradecimento: se o texto foi apagado/editado sem ele, acrescenta o padrão ElevaLife
    const corpoTxt = String(b.corpo || '').trim();
    const corpoFinal = /agradec/i.test(corpoTxt) ? corpoTxt : (corpoTxt ? corpoTxt + '\n\n' : '') + AGRADECIMENTO;
    const corpoHtml = montarHtml(corpoFinal, sig);
    const nomePdf = String(b.pdfNome || 'Proposta ElevaLife.pdf').replace(/[\\/:*?"<>|]/g, '-');
    const mk = (replyTo) => {
      const m = {
        message: {
          subject: assunto,
          body: { contentType: 'HTML', content: corpoHtml },
          toRecipients: para.map(addr),
          ccRecipients: cc.map(addr),
          attachments: [{ '@odata.type': '#microsoft.graph.fileAttachment', name: nomePdf, contentType: 'application/pdf', contentBytes: String(b.pdfBase64) }]
            .concat(sig.tem ? [{ '@odata.type': '#microsoft.graph.fileAttachment', name: 'assinatura-elevalife.' + sig.ext, contentType: sig.mime, contentBytes: sig.b64, isInline: true, contentId: 'assinatura-elevalife' }] : []),
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
    const resp = { ok: true, email: { de, para, cc, fallback, assinatura: sig.tem ? sig.nome : null }, kanban: null };
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
    const iniciarFup = !(Number(atual.fupSeq) > 0); // 1ª proposta da oportunidade: abre o ciclo de FUP (igual ao Kanban)
    let hist = histAppend(atual.histEventosJson, texto, por);
    const campos = {
      status: 'EM NEGOCIAÇÃO', prop: 'SIM', envio: hoje,
      alteradoEm: new Date().toISOString(), alteradoPor: por,
    };
    let tarefaFup = null;
    if (iniciarFup) {
      tarefaFup = montarFup(user, lista(b.para));
      campos.subEtapa = 'FUP'; campos.fupSeq = 1;
      campos.tarefasJson2 = JSON.stringify(tarefasDe(atual).concat([tarefaFup]));
      hist = histAppend(hist, 'Proposta enviada — sub-etapa FUP iniciada, FUP 1 agendado automaticamente', por);
    }
    campos.histEventosJson = hist;
    if (valor) campos.valor = valor;
    if (valorMensal) campos.valorMensal = valorMensal;
    if (numMeses) campos.numMeses = numMeses;
    if (serv) campos.serv = serv;
    if (lead.tipo) campos.tipo = lead.tipo;
    await g.updateItem(listId, it.id, campos);
    const resFup = tarefaFup ? await agendarFup(user, tarefaFup, { id: it.id, cliente: atual.cliente || lead.cliente, unidade: atual.unidade || lead.unidade,
      serv: campos.serv || atual.serv, valor: campos.valor || atual.valor, status: 'EM NEGOCIAÇÃO', subEtapa: 'FUP', cons: atual.cons,
      contato: atual.nome || lead.nome, contatoEmail: atual.email || lista(b.para)[0], telefone: atual.tel || atual.telefone }) : null;
    return { ok: true, acao: 'atualizada', id: it.id, de: atual.status, para: 'EM NEGOCIAÇÃO · ' + (tarefaFup ? 'FUP' : 'Proposta'), fup: resFup };
  }

  const d = new Date();
  const tarefaFup = montarFup(user, lista(b.para)); // FUP 1 nasce junto com a oportunidade
  const rec = {
    y: d.getFullYear(), m: d.getMonth() + 1, dt: hoje,
    nome: String(lead.nome || '').trim(), cliente: String(lead.cliente || '').trim(),
    unidade: String(lead.unidade || '').trim(), fonte: String(lead.fonte || 'Proposta SIGE'),
    cons: consDoUsuario(user, lead.cons), serv, prop: 'SIM', valor, tipo: String(lead.tipo || 'N/A'),
    envio: hoje, status: 'EM NEGOCIAÇÃO', subEtapa: 'FUP', fupSeq: 1, origemFunil: 'NOVO',
    email: lista(b.para)[0] || '',
    histEventosJson: histAppend(histAppend('[]', 'Oportunidade criada pelo envio de proposta · ' + texto, por), 'Proposta enviada — sub-etapa FUP iniciada, FUP 1 agendado automaticamente', por),
    tarefasJson2: JSON.stringify([tarefaFup]),
  };
  if (valorMensal) rec.valorMensal = valorMensal;
  if (numMeses) rec.numMeses = numMeses;
  if (!rec.cliente) throw new Error('informe a empresa para criar a oportunidade');
  const created = await g.addItem(listId, toFields('leads', rec));
  const resFup = await agendarFup(user, tarefaFup, { id: created.id, cliente: rec.cliente, unidade: rec.unidade, serv, valor, status: rec.status,
    subEtapa: 'FUP', cons: rec.cons, contato: rec.nome, contatoEmail: rec.email });
  return { ok: true, acao: 'criada', id: created.id, para: 'EM NEGOCIAÇÃO · FUP', fup: resFup };
}
