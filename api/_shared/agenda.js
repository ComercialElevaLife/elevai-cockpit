// _shared/agenda.js — cria compromissos (tarefa / ligação / WhatsApp / reunião Teams) no
// Microsoft 365 (Graph app-only).
//  - QUEM EMITE é sempre o usuário logado no S.I.G.E.: o evento nasce na caixa dele e o
//    responsável e os participantes entram como convidados (recebem o convite no calendário/e-mail).
//  - O corpo traz o resumo do card (cliente, serviço, valor, etapa, consultor, contato) e um
//    botão/link que abre o card direto no S.I.G.E. (?card=<id do item no SharePoint>).
//  - Se a criação COM convidados falhar com erro 400 (ex.: e-mail inválido), tenta de novo só na
//    agenda do emitente, para o compromisso não se perder, e avisa na resposta.
// Requer no app Entra a permissão Graph "Calendars.ReadWrite" (Application) + consentimento.
const g = require('./graph');

const TZ = 'E. South America Standard Time'; // Brasília
const BASE = String(process.env.SIGE_BASE_URL || 'https://sige-novasreceitas.elevalife.com.br').replace(/\/+$/, '');

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function nl2br(s) { return esc(s).replace(/\r?\n/g, '<br>'); }

function computeEnd(startLocal, mins) {
  const m = String(startLocal || '').match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return startLocal;
  let d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  d = new Date(d.getTime() + (mins || 30) * 60000);
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
}

// Link que abre o card no S.I.G.E. (o id é o do item no SharePoint; só caracteres seguros)
function cardUrl(id) {
  const s = String(id == null ? '' : id).trim();
  return s ? BASE + '/?card=' + encodeURIComponent(s) : BASE + '/';
}
function moeda(v) {
  const n = Number(v);
  return n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
}

function linha(rotulo, valor) {
  if (!valor) return '';
  return '<tr><td style="padding:5px 14px 5px 0;color:#8a7a78;font-size:13px;white-space:nowrap;vertical-align:top">' + esc(rotulo) +
    '</td><td style="padding:5px 0;color:#3a2a2e;font-size:13.5px">' + esc(valor) + '</td></tr>';
}

// Corpo do convite: faixa vinho, resumo do card em tabela, conteúdo da tarefa e botão para abrir o card.
function buildBody(o) {
  const c = o.card || {};
  const cliente = [c.cliente, c.unidade].filter(Boolean).join(' — ');
  const etapa = [c.status, c.subEtapa].filter(Boolean).join(' · ');
  const contato = [c.contato, c.contatoEmail, c.telefone].filter(Boolean).join(' · ');
  const url = cardUrl(c.id);
  const tabela = [
    linha('Cliente', cliente), linha('Serviço', c.serv), linha('Valor', moeda(c.valor)),
    linha('Etapa no Kanban', etapa), linha('Consultor', c.cons), linha('Contato', contato),
  ].join('');
  return '<div style="font-family:Montserrat,Segoe UI,Arial,sans-serif;max-width:620px;color:#3a2a2e">' +
    '<div style="background:#5e2a30;color:#fff;padding:16px 22px;border-radius:10px 10px 0 0">' +
    '<div style="font-weight:700;font-size:16px">' + esc(o.tipo || 'Tarefa') + ' · ' + esc(o.titulo || '') + '</div>' +
    '<div style="font-size:12px;opacity:.85">S.I.G.E. · Novas Receitas</div></div>' +
    '<div style="border:1px solid #eaddE0;border-top:none;border-radius:0 0 10px 10px;padding:20px 22px;background:#fff">' +
    (tabela ? '<div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8b3a42;margin:0 0 6px">Resumo do card</div>' +
      '<table role="presentation" style="border-collapse:collapse;margin:0 0 14px">' + tabela + '</table>' : '') +
    (o.conteudo ? '<p style="font-size:14px;line-height:1.6;margin:0 0 16px">' + nl2br(o.conteudo) + '</p>' : '') +
    '<p style="margin:0 0 8px"><a href="' + esc(url) + '" style="display:inline-block;background:#8b3a42;color:#fff;text-decoration:none;font-weight:700;font-size:13.5px;padding:10px 18px;border-radius:8px">Abrir o card no S.I.G.E.</a></p>' +
    '<p style="font-size:12px;color:#8a7a78;margin:0 0 14px;word-break:break-all">' + esc(url) + '</p>' +
    '<p style="font-size:12px;color:#8a7a78;margin:0;border-top:1px solid #eaddE0;padding-top:10px">Criado no S.I.G.E. por ' + esc(o.criador || '') + '.</p>' +
    '</div></div>';
}

function erro(status, msg) { const e = new Error(msg); e.status = status; return e; }

// Traduz o erro bruto do Graph para uma mensagem que o usuário entende (o bruto vai em "detalhe").
function explicarErro(e, organizador) {
  const st = e && e.status;
  const txt = String((e && e.message) || e || '');
  if (st === 403 || /ErrorAccessDenied|Authorization_RequestDenied|Access is denied/i.test(txt)) {
    return 'sem permissão para gravar no calendário de ' + organizador + ' (o aplicativo precisa da permissão Calendars.ReadWrite no Entra, com consentimento do administrador)';
  }
  if (st === 404 || /ErrorInvalidUser|MailboxNotEnabledForRESTAPI|ResourceNotFound|MailboxNotFound/i.test(txt)) {
    return 'a caixa de ' + organizador + ' não aceita eventos pela API (sem licença Exchange Online ativa ou caixa não encontrada)';
  }
  if (st === 401) return 'sessão inválida para emitir o evento — entre novamente no S.I.G.E.';
  return String((e && e.message) || e || 'falha ao criar o evento');
}

// o: { organizador (e-mail do usuário logado), tipo, titulo, inicioLocal 'YYYY-MM-DDTHH:MM', duracaoMin,
//      responsavelEmail, participantes 'a@x,b@y', conteudo, card:{id,cliente,unidade,serv,valor,status,subEtapa,cons,contato,contatoEmail,telefone},
//      dryRun }
async function criarEvento(o) {
  const organizador = String(o.organizador || '').trim().toLowerCase();
  if (!organizador || organizador.indexOf('@') < 1) throw erro(401, 'sem usuário logado para emitir o evento');
  const start = String(o.inicioLocal || '');
  if (start.length < 16) throw erro(400, 'sem data/hora');
  const tipo = o.tipo || 'Tarefa';
  const dur = (tipo === 'Reunião') ? (parseInt(o.duracaoMin, 10) || 30) : 30;
  const end = computeEnd(start, dur);

  // convidados: responsável + participantes (o emitente não se convida; sem repetir)
  // Tarefa, ligação e WhatsApp são de quem vai fazer: o compromisso nasce SÓ na agenda do responsável
  // (não aparece na de quem criou). Reunião nasce na agenda de quem criou, com os convidados e o link do Teams.
  const resp = String(o.responsavelEmail || '').trim().toLowerCase();
  const dono = (tipo !== 'Reunião' && /^[^@\s]+@elevalife\.com\.br$/.test(resp)) ? resp : organizador;
  const seen = {}; seen[organizador] = 1; seen[dono] = 1;
  const attendees = [];
  const push = a => {
    a = String(a || '').trim();
    if (a && a.indexOf('@') > 0 && !seen[a.toLowerCase()]) { seen[a.toLowerCase()] = 1; attendees.push({ emailAddress: { address: a }, type: 'required' }); }
  };
  push(o.responsavelEmail);
  String(o.participantes || '').split(/[;,]/).forEach(push);

  const card = o.card || {};
  const sufixo = card.cliente && String(o.titulo || '').toLowerCase().indexOf(String(card.cliente).toLowerCase()) < 0
    ? ' — ' + card.cliente + (card.unidade ? ' (' + card.unidade + ')' : '') : '';
  const ev = {
    subject: '[' + tipo + '] ' + (o.titulo || 'ElevaLife') + sufixo,
    body: { contentType: 'HTML', content: buildBody({ tipo, titulo: o.titulo, conteudo: o.conteudo, card, criador: organizador }) },
    start: { dateTime: start + ':00', timeZone: TZ },
    end: { dateTime: end + ':00', timeZone: TZ },
    isReminderOn: true, reminderMinutesBeforeStart: (tipo === 'Reunião' || tipo === 'Ligação') ? 15 : 60,
    attendees,
  };
  if (tipo === 'Reunião') { ev.isOnlineMeeting = true; ev.onlineMeetingProvider = 'teamsForBusiness'; }
  if (o.dryRun) return { dryRun: true, organizador, evento: ev, link: cardUrl(card.id) };

  const caminho = '/users/' + encodeURIComponent(dono) + '/events';
  let created, semConvidados = false;
  try {
    created = await g.graph('POST', caminho, ev);
  } catch (e) {
    e.mailbox = dono;
    if (attendees.length && e.status === 400) {
      ev.attendees = []; semConvidados = true;
      try { created = await g.graph('POST', caminho, ev); } catch (e2) { e2.mailbox = dono; throw e2; } // se falhar de novo, o erro sobe
    } else throw e;
  }
  return {
    ok: true, id: created.id, tipo, organizador, calendarioDe: dono, semConvidados,
    convidados: semConvidados ? [] : attendees.map(a => a.emailAddress.address),
    webLink: created.webLink || null,
    joinUrl: (created.onlineMeeting && created.onlineMeeting.joinUrl) || null,
  };
}

module.exports = { criarEvento, buildBody, cardUrl, explicarErro, computeEnd, BASE };
