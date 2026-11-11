/* campanhas-module.js — tela de Campanhas do SIGE-novasreceitas (10/11/2026, Léo)
   "Sala de espera" da prospecção (LinkedIn etc.): gere contatos, calcula o lead scoring (nota 0–100) e,
   por botão, promove o contato qualificado ao Kanban como LEAD (Fonte LinkedIn). Regras: manual.html, seção 7.
   Dados: lista própria /api/campanhas (Campanhas_Comercial). Só LÊ empresas/contatos/leads; escreve em leads e
   contatos apenas ao promover. Carregado sob demanda pelo index.html (mesmo padrão do módulo Propostas). */
(function () {
  'use strict';

  var ESTADOS = ['Na fila', 'Convite enviado', 'Conectado', 'Em conversa', 'Qualificado', 'Sem fit', 'Não contatar'];
  var PASSOS = ['', 'Agradecimento', 'Follow-up', 'Encerramento'];
  /* tipos de interação registrados no histórico do contato (coluna historicoJson) */
  var TIPOS = ['Convite enviado', 'Aceite', 'Agradecimento', 'Retomada', 'Follow-up', 'Encerramento', 'Material enviado', 'Resposta recebida', 'Interação', 'Observação'];
  var SAIDAS = ['Convite enviado', 'Agradecimento', 'Retomada', 'Follow-up', 'Encerramento', 'Material enviado']; /* mensagens/ações enviadas por nós */
  /* ordem dos materiais ricos por público (decisão do Léo, 10/11/2026); intervalo mínimo de 15 dias corridos entre materiais */
  var MATERIAIS = { med: ['Radar de Saúde', 'E-book NR-1', 'Carrossel AEP/AET'], sst: ['Carrossel AEP/AET', 'E-book NR-1', 'Radar de Saúde'], rh: ['E-book NR-1', 'Carrossel AEP/AET', 'Radar de Saúde'] };
  /* 10/11/2026 (Léo): o tipo da resposta decide o peso. Só "dor/necessidade declarada" pontua cheio e promove ao Kanban;
     pedido de orçamento ou de material pesa pouco e resposta subjetiva/cortesia não pontua (nenhum dos três promove sozinho). */
  var TR_DOR = 'Dor/necessidade declarada';
  var TRESP = [TR_DOR, 'Pedido de orçamento', 'Pedido de material', 'Resposta subjetiva (sem dor)'];
  var TRESP_PTS = {}; TRESP_PTS[TR_DOR] = 30; TRESP_PTS['Pedido de orçamento'] = 8; TRESP_PTS['Pedido de material'] = 5; TRESP_PTS['Resposta subjetiva (sem dor)'] = 0;
  var NOTA_MIN = 60;
  var LIMITE_DIA = 20; /* convites por dia útil (decisão do Léo, 10/11/2026; sem sáb, dom e feriados nacionais) */
  /* feriados nacionais (AAAA-MM-DD) usados no cálculo de dias úteis */
  var FERIADOS = ['2026-11-15', '2026-11-20', '2026-12-25', '2027-01-01', '2027-03-26', '2027-04-21', '2027-05-01', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25'];
  var S = { itens: [], empresas: [], contatos: [], leads: [], host: null, aba: 'op', f: { q: '', campanha: '', estado: '', acao: '', qual: '', ord: '' }, msg: '' };

  var QUALS = [['TARGET', 'TARGET'], ['ICP A', 'ICP A'], ['FORA', 'Fora do critério'], ['SEM EMPRESA', 'Sem empresa']];
  var QORD = ['TARGET', 'ICP A', 'FORA', 'SEM EMPRESA'];
  var ORDS = [['prox', 'Próxima ação (mais urgente)'], ['qual', 'Qualificação da empresa'], ['empresa', 'Empresa (A–Z)'], ['nome', 'Nome (A–Z)'], ['estado', 'Estado do funil'], ['conv', 'Convite mais recente']];

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); } /* data LOCAL (não UTC) */
  function hoje() { return ymd(new Date()); }
  function dt(s) { return new Date(String(s).slice(0, 10) + 'T12:00:00'); }
  function addDias(s, n) { var d = dt(s); d.setDate(d.getDate() + n); return ymd(d); }
  function addDU(s, n) { var d = dt(s), k = 0; while (k < n) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6 && FERIADOS.indexOf(ymd(d)) < 0) k++; } return ymd(d); } /* dias úteis (sem sáb, dom e feriados nacionais) */
  function difDias(a, b) { return Math.round((dt(a) - dt(b)) / 86400000); } /* a - b em dias */
  function br(s) { return s ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) : ''; }

  async function api(url, opt) {
    var r = await fetch(url, Object.assign({ cache: 'no-store' }, opt || {}));
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.ok === false) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }
  function jpost(url, method, body) { return api(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }

  /* ---------- regras (lead scoring e bloqueios) ---------- */
  function empresaDe(it) {
    var id = String(it.empresaId || '');
    var e = id ? S.empresas.find(function (x) { return String(x.__id) === id; }) : null;
    if (e) return e;
    var n = norm(it.empresaNome); if (!n) return null;
    return S.empresas.find(function (x) { return [x.cliente, x.razaoSocial, x.nomeFantasia].some(function (v) { return norm(v) === n; }); }) || null;
  }
  function leadsDaEmpresa(it, emp) {
    var id = emp ? String(emp.__id) : String(it.empresaId || '');
    var nomes = emp ? [emp.cliente, emp.razaoSocial, emp.nomeFantasia].map(norm).filter(Boolean) : [norm(it.empresaNome)];
    return S.leads.filter(function (l) {
      if (l.lixeiraEm) return false;
      return (id && String(l.empresaId || '') === id) || (nomes.indexOf(norm(l.cliente)) > -1);
    });
  }
  /* REGRA DE OURO (10/11/2026, Léo): só entra na campanha contato de empresa TARGET ou ICP A.
     TARGET = empresas.target 'TARGET' no SIGE, ou empresaTag gravada a partir da lista TARGET_RP; ICP A = icpA SIM, empresaTag 'ICP A' ou lead com icp A na empresa. */
  function qualif(it) {
    var emp = empresaDe(it), tg = String(it.empresaTag || '').toUpperCase();
    if (tg === 'TARGET' || tg === 'ICP A' || tg === 'FORA') return tg; /* classificação gravada (headcount, multisites e SESMT) vale mais que os campos antigos */
    if (emp && String(emp.target || '').toUpperCase() === 'TARGET') return 'TARGET';
    if (tg === 'TARGET') return 'TARGET';
    if (it.icpA === 'SIM' || tg === 'ICP A') return 'ICP A';
    if (!emp && !it.empresaNome) return 'SEM EMPRESA';
    if (leadsDaEmpresa(it, emp).some(function (l) { return String(l.icp || '').toUpperCase() === 'A'; })) return 'ICP A';
    return 'FORA';
  }
  function qualOk(q) { return q === 'TARGET' || q === 'ICP A'; }
  function pontosCargo(cargo) {
    var t = norm(cargo); if (!t) return 0;
    if (!/(medic|sst|seguranca|ehs|saude|\brh\b|recursos humanos|pessoas|gente|ergonom|fisioterap|enfermag|qualidade de vida|beneficio)/.test(t)) return 0;
    return /(analista|tecnic|assistente|auxiliar|estagi)/.test(t) ? 10 : 20;
  }
  function calc(it) {
    var emp = empresaDe(it);
    var qual = qualif(it);
    var fitEmp = qualOk(qual) ? 25 : 0;
    var fitCargo = pontosCargo(it.cargo);
    var fitSetor = it.setorPorte === 'SIM' ? 15 : 0;
    var aceitou = !!(it.dataAceite || ['Conectado', 'Em conversa', 'Qualificado'].indexOf(it.estado) > -1) ? 10 : 0;
    var tr = it.tipoResposta || '';
    var resp = it.respondeu === 'SIM' ? (TRESP_PTS[tr] || 0) : 0;
    var inter = 0; /* "pediu conversa/material" deixou de pontuar à parte: entra pelo tipo da resposta */
    var fit = fitEmp + fitCargo + fitSetor, eng = aceitou + resp + inter;
    var bloqueio = '', aviso = '';
    var ls = leadsDaEmpresa(it, emp).filter(function (l) { return l.inativo !== 'SIM'; });
    if (it.estado === 'Não contatar') bloqueio = 'Marcado como não contatar.';
    else if (ls.some(function (l) { return l.status === 'EM NEGOCIAÇÃO'; })) bloqueio = 'Empresa em negociação: sem abordagem fria; alinhar com o consultor responsável.';
    else if (ls.some(function (l) { return l.status === 'VENDIDA' && String(l.dataVenda || l.dt || '').slice(0, 4) === '2026'; })) bloqueio = 'Cliente com venda em 2026: sem abordagem fria; alinhar com o consultor responsável.';
    if (!bloqueio) {
      var hist = ls.filter(function (l) { return ['PAUSADA', 'PERDIDA', 'REATIVAR'].indexOf(l.status) > -1; });
      var ativ = ls.filter(function (l) { return ['LEAD', 'OPORTUNIDADE'].indexOf(l.status) > -1; });
      if (hist.length) aviso = 'Histórico no SIGE: ' + hist.map(function (l) { return l.status + (l.serv && l.serv !== 'NA' ? ' (' + l.serv + ')' : ''); }).join(', ') + '.';
      if (ativ.length) aviso = (aviso ? aviso + ' ' : '') + 'Já existe ' + ativ.length + ' lead/oportunidade ativa nesta empresa.';
    }
    var total = fit + eng, motivo = '';
    var partes = [];
    if (fitEmp) partes.push('empresa TARGET/ICP A'); if (fitCargo) partes.push('cargo ' + (fitCargo === 20 ? 'decisor' : 'técnico'));
    if (fitSetor) partes.push('setor/porte'); if (aceitou) partes.push('aceitou'); if (resp) partes.push(tr.toLowerCase());
    motivo = partes.join(' + ');
    var razao = '';
    if (it.estado === 'Qualificado') razao = 'Já promovido.';
    else if (bloqueio) razao = bloqueio;
    else if (!qualOk(qual)) razao = 'Fora do critério (Regra de Ouro): só empresas TARGET ou ICP A entram na campanha.';
    else if (it.respondeu !== 'SIM') razao = 'Falta resposta registrada.';
    else if (!tr) razao = 'Classifique o tipo da resposta (dor/necessidade, orçamento, material ou subjetiva).';
    else if (tr !== TR_DOR) razao = 'Resposta sem dor/necessidade declarada (' + tr.toLowerCase() + '): peso menor e não promove; levantar a dor antes.';
    else if (total < NOTA_MIN) razao = 'Nota abaixo de ' + NOTA_MIN + '.';
    return { emp: emp, qual: qual, fit: fit, eng: eng, total: total, bloqueio: bloqueio, aviso: aviso, motivo: motivo, razao: razao, ok: !razao };
  }

  /* ---------- histórico de interações e próxima ação (regras do playbook) ---------- */
  /* historicoJson = lista de {ts, tipo, texto, por}. Contatos antigos, sem histórico, ganham eventos derivados de dataConvite/dataAceite. */
  function eventos(it) {
    var ev = [];
    try { var a = JSON.parse(it.historicoJson || '[]'); if (Array.isArray(a)) ev = a.filter(function (e) { return e && e.ts && e.tipo; }); } catch (e) { }
    var tem = function (t) { return ev.some(function (e) { return e.tipo === t; }); };
    if (it.dataConvite && !tem('Convite enviado')) ev.push({ ts: it.dataConvite, tipo: 'Convite enviado', texto: '', por: '', derivado: 1 });
    if (it.dataAceite && !tem('Aceite')) ev.push({ ts: it.dataAceite, tipo: 'Aceite', texto: '', por: '', derivado: 1 });
    return ev.sort(function (a, b) { return String(a.ts).localeCompare(String(b.ts)); });
  }
  function publico(it) {
    var t = norm((it.listaOrigem || '') + ' ' + (it.campanha || ''));
    if (/medic|\bmed\b/.test(t) && !/nao med/.test(t)) return 'med';
    if (/sst|seguranca|ehs|nao med/.test(t)) return 'sst';
    var c = norm(it.cargo || '');
    if (/medic/.test(c)) return 'med';
    if (/seguranca|ehs|sst|\bshe\b|enfermag/.test(c)) return 'sst';
    return 'rh';
  }
  function ultima(it) { var ev = eventos(it); return ev.length ? ev[ev.length - 1] : null; }
  /* Próxima ação: { txt, data, nivel } — nivel: bad (vencida), warn (hoje), ok (futura), '' (sem prazo) */
  function proxima(it) {
    var est = it.estado || 'Na fila', h = hoje(), ev = eventos(it), r = null;
    var ult = function (ts) { for (var i = ev.length - 1; i >= 0; i--) if (ts.indexOf(ev[i].tipo) > -1) return ev[i]; return null; };
    if (est === 'Qualificado') return { txt: 'No Kanban', data: '', nivel: '' };
    if (est === 'Sem fit' || est === 'Não contatar') return { txt: 'Encerrado', data: '', nivel: '' };
    if (['Na fila', 'Convite enviado', 'Conectado'].indexOf(est) > -1 && it.respondeu !== 'SIM' && !qualOk(qualif(it))) return { txt: 'Fora do critério (Regra de Ouro): sem abordagem' + (est === 'Convite enviado' ? '; avaliar retirar o convite' : ''), data: '', nivel: '' };
    if (est === 'Em conversa' || it.respondeu === 'SIM') r = { txt: it.respondeu === 'SIM' && !it.tipoResposta ? 'Ler a resposta, classificar o tipo (dor, orçamento, material ou subjetiva) e avisar o Léo' : (it.respondeu === 'SIM' && it.tipoResposta !== TR_DOR ? 'Resposta sem dor declarada: avisar o Léo e levantar a dor/necessidade' : 'Ler a resposta e avisar o Léo'), data: h };
    else if (est === 'Na fila') r = { txt: 'Enviar convite sem nota', data: h };
    else if (est === 'Convite enviado') {
      var c = ult(['Convite enviado']); var base = c ? String(c.ts).slice(0, 10) : (it.dataConvite || '');
      r = base ? { txt: 'Aguardar aceite (retirar o convite se passar de 30 dias)', data: addDias(base, 30) } : { txt: 'Aguardar aceite', data: '' };
    } else if (est === 'Conectado') {
      var msg = ult(['Agradecimento', 'Retomada']);
      if (!msg) { var ac = ult(['Aceite']); var d0 = ac ? String(ac.ts).slice(0, 10) : (it.dataAceite || ''); if (!d0) r = { txt: 'Enviar agradecimento', data: h }; else { var ini = addDU(d0, 1), fim = addDU(d0, 2); r = h > fim ? { txt: 'Agradecimento atrasado (a janela de 24h a 48h terminou em ' + br(fim) + '): enviar hoje', data: fim } : { txt: 'Enviar agradecimento (janela de ' + br(ini) + ' a ' + br(fim) + ', 24h a 48h após o aceite)', data: ini }; } }
      else {
        var base0 = String(msg.ts).slice(0, 10), fu = ult(['Follow-up']), enc = ult(['Encerramento']), mat = ev.filter(function (e) { return e.tipo === 'Material enviado'; });
        if (mat.length) {
          var seq = MATERIAIS[publico(it)], prox = seq[mat.length];
          r = prox ? { txt: 'Nutrição: enviar ' + prox, data: addDias(String(mat[mat.length - 1].ts).slice(0, 10), 15) } : { txt: 'Sequência de materiais concluída', data: '' };
        } else if (enc) { r = { txt: 'Nutrição: enviar ' + MATERIAIS[publico(it)][0], data: addDias(String(enc.ts).slice(0, 10), 15) }; }
        else if (!fu) r = { txt: 'Follow-up (uma pergunta curta, sem oferta)', data: addDU(base0, 7) };
        else r = { txt: 'Encerramento (mensagem breve, sem cobrança)', data: addDU(base0, 10) };
      }
    }
    if (!r) return { txt: '—', data: '', nivel: '' };
    r.nivel = !r.data ? '' : (r.data < h ? 'bad' : (r.data === h ? 'warn' : 'ok'));
    return r;
  }
  function acaoPrazo(p) { return p.data && p.data <= hoje(); }

  /* registra uma interação: grava no histórico e atualiza os campos que ela implica (estado, datas, passo, resposta) */
  function aplicaEvento(it, tipo, data, texto) {
    var ev = eventos(it).filter(function (e) { return !e.derivado; });
    ev.push({ ts: data, tipo: tipo, texto: texto || '', por: (window.__heu || window.__meEmail || '') });
    var c = { historicoJson: JSON.stringify(ev), alteradoEm: new Date().toISOString() };
    if (tipo === 'Convite enviado') { if (!it.dataConvite) c.dataConvite = data; if ((it.estado || 'Na fila') === 'Na fila') c.estado = 'Convite enviado'; }
    if (tipo === 'Aceite') { if (!it.dataAceite) c.dataAceite = data; if (['Na fila', 'Convite enviado'].indexOf(it.estado || 'Na fila') > -1) c.estado = 'Conectado'; }
    if (tipo === 'Agradecimento' || tipo === 'Follow-up' || tipo === 'Encerramento') c.passo = tipo;
    if (tipo === 'Retomada') c.passo = 'Retomada';
    if (tipo === 'Material enviado') c.passo = 'Material: ' + (texto || '');
    if (tipo === 'Resposta recebida') { c.respondeu = 'SIM'; if (texto) c.resumoResposta = texto; if (['Conectado', 'Convite enviado', 'Na fila'].indexOf(it.estado || 'Na fila') > -1) c.estado = 'Em conversa'; }
    return c;
  }

  /* ---------- carga ---------- */
  async function carregar() {
    var rs = await Promise.all(['/api/campanhas', '/api/empresas', '/api/contatos', '/api/leads'].map(function (u) { return api(u).then(function (j) { return j.items || []; }).catch(function (e) { if (u === '/api/campanhas') throw e; return []; }); }));
    S.itens = rs[0]; S.empresas = rs[1]; S.contatos = rs[2]; S.leads = rs[3];
  }

  /* ---------- indicadores (aba KPI) ---------- */
  function pct(a, b) { return b ? Math.round(a * 100 / b) + '%' : '—'; }
  function grupo(linhas, chaveFn) {
    var g = {};
    linhas.forEach(function (x) { var k = chaveFn(x.it) || '(sem informação)'; (g[k] = g[k] || []).push(x); });
    return Object.keys(g).sort().map(function (k) {
      var l = g[k], n = l.length;
      var abord = l.filter(function (x) { return (x.it.estado || 'Na fila') !== 'Na fila'; }).length;
      var conec = l.filter(function (x) { return ['Conectado', 'Em conversa', 'Qualificado'].indexOf(x.it.estado) > -1; }).length;
      var resp = l.filter(function (x) { return x.it.respondeu === 'SIM'; }).length;
      var qual = l.filter(function (x) { return x.it.estado === 'Qualificado'; }).length;
      var nota = Math.round(l.reduce(function (s, x) { return s + x.c.total; }, 0) / n);
      return '<tr><td><b>' + esc(k) + '</b></td><td>' + n + '</td><td>' + abord + '</td><td>' + conec + '</td><td>' + resp + '</td><td>' + qual + '</td><td>' + nota + '</td></tr>';
    }).join('');
  }
  function htmlKpi(linhas) {
    var h = hoje(), n = linhas.length;
    var abord = linhas.filter(function (x) { return (x.it.estado || 'Na fila') !== 'Na fila'; }).length;
    var conec = linhas.filter(function (x) { return ['Conectado', 'Em conversa', 'Qualificado'].indexOf(x.it.estado) > -1; }).length;
    var resp = linhas.filter(function (x) { return x.it.respondeu === 'SIM'; }).length;
    var inte = linhas.filter(function (x) { return x.it.interesse === 'SIM'; }).length;
    var qual = linhas.filter(function (x) { return x.it.estado === 'Qualificado'; }).length;
    var etapas = [['Na base', n], ['Abordados', abord], ['Conectados', conec], ['Responderam', resp], ['Pediram conversa/material', inte], ['Promovidos ao Kanban', qual]];
    var funil = etapas.map(function (e, i) {
      var w = n ? Math.max(3, Math.round(e[1] * 100 / n)) : 3;
      return '<div class="cmp-fn"><span>' + e[0] + '</span><div class="cmp-fb"><i style="width:' + w + '%"></i></div><b>' + e[1] + '</b><small>' + (i ? pct(e[1], etapas[i - 1][1]) + ' da etapa anterior' : '') + '</small></div>';
    }).join('');
    /* convites e aceites (só quem passou pelo convite): taxa e tempo até o aceite */
    var evs = []; linhas.forEach(function (x) { eventos(x.it).forEach(function (e) { evs.push({ t: e.tipo, d: String(e.ts).slice(0, 10), it: x.it }); }); });
    var conv = linhas.filter(function (x) { return !!x.it.dataConvite; });
    var acei = conv.filter(function (x) { return !!x.it.dataAceite; });
    var dias = acei.map(function (x) { return difDias(x.it.dataAceite, x.it.dataConvite); }).filter(function (d) { return d >= 0; });
    var media = dias.length ? (dias.reduce(function (a, b) { return a + b; }, 0) / dias.length).toFixed(1).replace('.', ',') + ' dias' : '—';
    var convHoje = evs.filter(function (e) { return e.t === 'Convite enviado' && e.d === h; }).length;
    var conv7 = evs.filter(function (e) { return e.t === 'Convite enviado' && difDias(h, e.d) >= 0 && difDias(h, e.d) < 7; }).length;
    var pend = linhas.filter(function (x) { return x.it.estado === 'Convite enviado'; }).length;
    var atr = linhas.filter(function (x) { return x.p.nivel === 'bad'; }).length, hj = linhas.filter(function (x) { return x.p.nivel === 'warn'; }).length;
    var parados = linhas.filter(function (x) { var u = ultima(x.it); return ['Conectado', 'Convite enviado'].indexOf(x.it.estado) > -1 && u && difDias(h, String(u.ts).slice(0, 10)) > 15; }).length;
    var cards = [
      [convHoje + ' de ' + LIMITE_DIA, 'convites hoje (limite por dia útil)'], [conv7, 'convites nos últimos 7 dias (referência ~100/semana)'], [pend, 'convites pendentes'],
      [conv.length ? pct(acei.length, conv.length) : '—', 'taxa de aceite (' + acei.length + ' de ' + conv.length + ' convites com data)'], [media, 'tempo médio até o aceite'],
      [atr, 'ações atrasadas'], [hj, 'ações para hoje'], [parados, 'sem interação há mais de 15 dias']
    ].map(function (c) { return '<div class="cmp-kpi"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>'; }).join('');
    /* atividade por semana (janelas de 7 dias terminando hoje) */
    var janelas = [[0, 6, 'Últimos 7 dias'], [7, 13, '8 a 14 dias'], [14, 20, '15 a 21 dias'], [21, 27, '22 a 28 dias']];
    var tipos = ['Convite enviado', 'Aceite', 'Agradecimento', 'Retomada', 'Follow-up', 'Encerramento', 'Material enviado', 'Resposta recebida'];
    var ativ = tipos.map(function (t) {
      return '<tr><td><b>' + t + '</b></td>' + janelas.map(function (j) { return '<td>' + evs.filter(function (e) { var d = difDias(h, e.d); return e.t === t && d >= j[0] && d <= j[1]; }).length + '</td>'; }).join('') + '</tr>';
    }).join('');
    var cab = '<tr><th>Grupo</th><th>Contatos</th><th>Abordados</th><th>Conectados</th><th>Responderam</th><th>Promovidos</th><th>Nota média</th></tr>';
    return '<div class="cmp-kpis">' + cards + '</div>' +
      '<div class="cmp-card" style="padding:14px 16px;margin-bottom:14px"><h4>Funil da prospecção</h4>' + funil + '<small>Conectados inclui quem já era conexão antes da campanha; a taxa de aceite considera só quem recebeu convite com data registrada.</small></div>' +
      '<div class="cmp-card" style="margin-bottom:14px"><table><tr><th>Atividade registrada</th>' + janelas.map(function (j) { return '<th>' + j[2] + '</th>'; }).join('') + '</tr>' + ativ + '</table></div>' +
      '<div class="cmp-card" style="margin-bottom:14px"><table>' + cab.replace('Grupo', 'Campanha') + grupo(linhas, function (i) { return i.campanha; }) + '</table></div>' +
      '<div class="cmp-card"><table>' + cab.replace('Grupo', 'Lista de origem') + grupo(linhas, function (i) { return i.listaOrigem; }) + '</table></div>';
  }

  /* ---------- tela ---------- */
  var CSS = '.cmp{font-family:Montserrat,system-ui,sans-serif;color:#3A2A2E}.cmp *{box-sizing:border-box}' +
    '.cmp-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}.cmp-top h2{margin:0;font-family:"Montserrat Alternates",Montserrat,sans-serif;font-size:20px;color:#5E2A30}' +
    '.cmp-kpis{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}.cmp-kpi{background:#fff;border:1px solid #EADDE0;border-radius:12px;padding:10px 14px;min-width:118px}' +
    '.cmp-kpi b{display:block;font-family:"Montserrat Alternates",Montserrat,sans-serif;font-size:22px;color:#8B3A42}.cmp-kpi span{font-size:11.5px;color:#8A7A78}' +
    '.cmp-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}.cmp input,.cmp select,.cmp textarea{font:inherit;font-size:13px;padding:7px 9px;border:1px solid #EADDE0;border-radius:8px;background:#fff;color:#3A2A2E}' +
    '.cmp-btn{font:inherit;font-size:13px;font-weight:600;padding:8px 13px;border-radius:9px;border:1px solid #8B3A42;background:#fff;color:#8B3A42;cursor:pointer}.cmp-btn.p{background:#8B3A42;color:#fff}.cmp-btn:disabled{opacity:.45;cursor:not-allowed}' +
    '.cmp-card{background:#fff;border:1px solid #EADDE0;border-radius:12px;overflow:auto}.cmp table{border-collapse:collapse;width:100%;font-size:12.5px}.cmp th{background:#F5EFEA;text-align:left;padding:8px 10px;color:#5E2A30;white-space:nowrap}' +
    '.cmp td{padding:8px 10px;border-top:1px solid #EADDE0;vertical-align:top}.cmp small{color:#8A7A78;display:block}.cmp-tag{display:inline-block;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:600;margin:2px 3px 0 0}' +
    '.cmp-tag.ok{background:#E3F1EA;color:#2E7D5B}.cmp-tag.warn{background:#FBEFDC;color:#C9822B}.cmp-tag.bad{background:#F6E1E4;color:#B23A48}.cmp-tag.t{background:#EBD9DB;color:#5E2A30}' +
    '.cmp-nota{font-family:"Montserrat Alternates",Montserrat,sans-serif;font-weight:700;font-size:16px;color:#8B3A42}.cmp-msg{font-size:12.5px;color:#8A7A78;margin:6px 0}' +
    '.cmp-ov{position:fixed;inset:0;background:rgba(58,42,46,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}.cmp-md{background:#fff;border-radius:14px;max-width:640px;width:100%;max-height:90vh;overflow:auto;padding:18px}' +
    '.cmp-md h3{margin:0 0 10px;font-family:"Montserrat Alternates",Montserrat,sans-serif;color:#5E2A30}.cmp-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cmp-g label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:#8A7A78}' +
    '.cmp-g .w{grid-column:1/-1}.cmp-act{display:flex;gap:6px;flex-wrap:wrap}.cmp a{color:#8B3A42}.cmp td small{white-space:normal}@media(max-width:700px){.cmp-g{grid-template-columns:1fr}}' +
    '.cmp-tabs{display:flex;gap:6px;margin-bottom:14px;border-bottom:1px solid #EADDE0}.cmp-tab{font:inherit;font-size:13px;font-weight:600;padding:8px 16px;border:1px solid transparent;border-bottom:none;border-radius:9px 9px 0 0;background:none;color:#8A7A78;cursor:pointer}.cmp-tab.on{background:#8B3A42;color:#fff}' +
    '.cmp-fn{display:grid;grid-template-columns:190px 1fr 44px 170px;gap:8px;align-items:center;margin:5px 0;font-size:12.5px}.cmp-fb{background:#F5EFEA;border-radius:6px;height:14px;overflow:hidden}.cmp-fb i{display:block;height:100%;background:#A34E56;border-radius:6px}.cmp-fn b{font-family:"Montserrat Alternates",Montserrat,sans-serif;color:#8B3A42}' +
    '.cmp h4{margin:0 0 8px;font-family:"Montserrat Alternates",Montserrat,sans-serif;color:#5E2A30;font-size:14px}.cmp-tl{margin:0 0 12px;padding:0;list-style:none;max-height:240px;overflow:auto}.cmp-tl li{border-left:3px solid #EBD9DB;padding:3px 0 6px 10px;font-size:12.5px}.cmp-tl li b{color:#5E2A30}.cmp-tag.neutro{background:#F5EFEA;color:#8A7A78}' +
    '@media(max-width:700px){.cmp-fn{grid-template-columns:110px 1fr 36px}.cmp-fn small{display:none}}';

  function celUltima(it) {
    var u = ultima(it); if (!u) return '<small>sem registro</small>';
    var d = String(u.ts).slice(0, 10), n = difDias(hoje(), d);
    return '<b>' + esc(u.tipo) + '</b><small>' + br(d) + (n > 0 ? ' · há ' + n + (n === 1 ? ' dia' : ' dias') : ' · hoje') + '</small>' + (u.texto ? '<small>' + esc(String(u.texto).slice(0, 80)) + '</small>' : '');
  }
  function celProxima(p) {
    var cls = p.nivel === 'bad' ? 'bad' : (p.nivel === 'warn' ? 'warn' : (p.nivel === 'ok' ? 'ok' : 'neutro'));
    var rot = p.nivel === 'bad' ? 'atrasada · ' + br(p.data) : (p.nivel === 'warn' ? 'hoje' : (p.data ? br(p.data) : ''));
    return esc(p.txt) + (rot ? '<small><span class="cmp-tag ' + cls + '">' + rot + '</span></small>' : '');
  }

  function ordena(a, b) {
    var o = S.f.ord, nt = b.c.total - a.c.total, s = function (t) { return norm(t); };
    if (o === 'prox') return String(a.p.data || '9').localeCompare(String(b.p.data || '9')) || nt;
    if (o === 'nome') return s((a.it.nome || '') + ' ' + (a.it.sobrenome || '')).localeCompare(s((b.it.nome || '') + ' ' + (b.it.sobrenome || '')));
    if (o === 'empresa') return s(a.it.empresaNome).localeCompare(s(b.it.empresaNome)) || nt;
    if (o === 'qual') return QORD.indexOf(a.c.qual) - QORD.indexOf(b.c.qual) || nt;
    if (o === 'estado') return ESTADOS.indexOf(a.it.estado || 'Na fila') - ESTADOS.indexOf(b.it.estado || 'Na fila') || nt;
    if (o === 'conv') return String(b.it.dataConvite || '').localeCompare(String(a.it.dataConvite || '')) || nt;
    if (S.f.acao) return String(a.p.data || '9').localeCompare(String(b.p.data || '9'));
    return nt;
  }

  function render() {
    var h = S.host; if (!h) return;
    if (!document.getElementById('cmp-css')) { var st = document.createElement('style'); st.id = 'cmp-css'; st.textContent = CSS; document.head.appendChild(st); }
    var camps = S.itens.map(function (i) { return i.campanha || ''; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
    var linhas = S.itens.map(function (it) { return { it: it, c: calc(it), p: proxima(it) }; });
    var cont = {}; ESTADOS.forEach(function (e) { cont[e] = 0; }); linhas.forEach(function (x) { cont[x.it.estado || 'Na fila'] = (cont[x.it.estado || 'Na fila'] || 0) + 1; });
    var prontos = linhas.filter(function (x) { return x.c.ok; }).length;
    var q = norm(S.f.q);
    var vis = linhas.filter(function (x) {
      var it = x.it;
      if (S.f.campanha && (it.campanha || '') !== S.f.campanha) return false;
      if (S.f.estado && (it.estado || 'Na fila') !== S.f.estado) return false;
      if (S.f.qual && x.c.qual !== S.f.qual) return false;
      if (S.f.acao === 'hoje' && !acaoPrazo(x.p)) return false;
      if (S.f.acao === 'sem' && !(x.p.data && x.p.data <= addDias(hoje(), 7))) return false;
      if (q && norm([it.nome, it.sobrenome, it.cargo, it.empresaNome, it.email].join(' ')).indexOf(q) < 0) return false;
      return true;
    }).sort(ordena);
    var hojeN = linhas.filter(function (x) { return (x.it.estado || 'Na fila') !== 'Na fila' && acaoPrazo(x.p); }).length;
    var filaN = linhas.filter(function (x) { return (x.it.estado || 'Na fila') === 'Na fila' && qualOk(x.c.qual); }).length;
    var foraN = linhas.filter(function (x) { return !qualOk(x.c.qual) && ['Na fila', 'Convite enviado', 'Conectado'].indexOf(x.it.estado || 'Na fila') > -1 && x.it.respondeu !== 'SIM'; }).length;

    var html = '<div class="cmp">' +
      '<div class="cmp-top"><h2>Campanhas</h2><span style="flex:1"></span>' +
      '<button class="cmp-btn" data-a="imp">Importar lista (CSV)</button><button class="cmp-btn p" data-a="novo">+ Novo contato</button></div>' +
      '<div class="cmp-tabs"><button class="cmp-tab' + (S.aba === 'op' ? ' on' : '') + '" data-aba="op">Operacional</button><button class="cmp-tab' + (S.aba === 'kpi' ? ' on' : '') + '" data-aba="kpi">Indicadores</button></div>' +
      (S.msg ? '<div class="cmp-msg">' + esc(S.msg) + '</div>' : '') +
      (S.aba === 'kpi' ? htmlKpi(linhas) + '</div>' : '<div class="cmp-kpis"><div class="cmp-kpi"><b>' + S.itens.length + '</b><span>contatos na tela</span></div>' +
      '<div class="cmp-kpi"><b>' + (cont['Convite enviado'] || 0) + '</b><span>convites pendentes</span></div>' +
      '<div class="cmp-kpi"><b>' + ((cont['Conectado'] || 0) + (cont['Em conversa'] || 0)) + '</b><span>conectados / em conversa</span></div>' +
      '<div class="cmp-kpi"><b>' + prontos + '</b><span>prontos para promover (nota ≥ ' + NOTA_MIN + ' + dor declarada na resposta)</span></div>' +
      '<div class="cmp-kpi"><b>' + (cont['Qualificado'] || 0) + '</b><span>já promovidos ao Kanban</span></div>' +
      '<div class="cmp-kpi"><b>' + hojeN + '</b><span>ações vencidas ou para hoje (já abordados)</span></div>' +
      '<div class="cmp-kpi"><b>' + Math.min(filaN, LIMITE_DIA) + ' de ' + filaN + '</b><span>na fila (só TARGET/ICP A): envio de hoje (limite ' + LIMITE_DIA + ' por dia útil)</span></div>' +
      '<div class="cmp-kpi"><b>' + foraN + '</b><span>fora do critério (Regra de Ouro): sem abordagem</span></div></div>' +
      '<div class="cmp-bar"><input data-f="q" placeholder="Buscar nome, cargo, empresa..." value="' + esc(S.f.q) + '" style="min-width:230px">' +
      '<select data-f="campanha"><option value="">Todas as campanhas</option>' + camps.map(function (c) { return '<option' + (S.f.campanha === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<select data-f="estado"><option value="">Todos os estados</option>' + ESTADOS.map(function (e) { return '<option' + (S.f.estado === e ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select>' +
      '<select data-f="qual"><option value="">Todas as qualificações</option>' + QUALS.map(function (q) { return '<option value="' + q[0] + '"' + (S.f.qual === q[0] ? ' selected' : '') + '>' + q[1] + '</option>'; }).join('') + '</select>' +
      '<select data-f="ord"><option value="">Ordenar: nota (maior primeiro)</option>' + ORDS.map(function (o) { return '<option value="' + o[0] + '"' + (S.f.ord === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<select data-f="acao"><option value="">Todas as ações</option><option value="hoje"' + (S.f.acao === 'hoje' ? ' selected' : '') + '>Vencidas ou para hoje</option><option value="sem"' + (S.f.acao === 'sem' ? ' selected' : '') + '>Nos próximos 7 dias</option></select>' +
      '<label style="font-size:12px;color:#8A7A78">Consultor ao promover <input data-cons value="' + esc(S.cons || 'Léo') + '" style="width:90px"></label></div>' +
      '<div class="cmp-card"><table><tr><th>Contato</th><th>Empresa</th><th>Campanha</th><th>Estado</th><th>Última interação</th><th>Próxima ação</th><th>Nota</th><th></th></tr>' +
      (vis.length ? vis.map(function (x) {
        var it = x.it, c = x.c, id = esc(it.__id);
        return '<tr><td><b>' + esc((it.nome || '') + ' ' + (it.sobrenome || '')) + '</b><small>' + esc(it.cargo || '') + '</small>' + (it.linkedinUrl ? '<small><a href="' + esc(it.linkedinUrl) + '" target="_blank" rel="noopener">perfil no LinkedIn</a></small>' : '') + '</td>' +
          '<td>' + esc(it.empresaNome || '') + (c.qual === 'TARGET' ? ' <span class="cmp-tag t">TARGET</span>' : c.qual === 'ICP A' ? ' <span class="cmp-tag ok">ICP A</span>' : ' <span class="cmp-tag bad">' + (c.qual === 'FORA' ? 'FORA DO CRITÉRIO' : 'SEM EMPRESA') + '</span>') + (c.emp ? '' : ' <span class="cmp-tag warn">sem cadastro</span>') +
          (c.bloqueio ? '<span class="cmp-tag bad">bloqueado</span><small>' + esc(c.bloqueio) + '</small>' : '') + (c.aviso ? '<small>' + esc(c.aviso) + '</small>' : '') + '</td>' +
          '<td>' + esc(it.campanha || '') + '<small>' + esc(it.listaOrigem || '') + '</small></td>' +
          '<td><select data-est="' + id + '">' + ESTADOS.map(function (e) { return '<option' + ((it.estado || 'Na fila') === e ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select>' +
          (it.passo ? '<small>' + esc(it.passo) + '</small>' : '') + '</td>' +
          '<td>' + celUltima(it) + '</td><td>' + celProxima(x.p) + '</td>' +
          '<td><span class="cmp-nota">' + c.total + '</span><small>fit ' + c.fit + ' de 60</small><small>engaj. ' + c.eng + ' de 40</small></td>' +
          '<td><div class="cmp-act"><button class="cmp-btn" data-hi="' + id + '">Histórico</button><button class="cmp-btn" data-ed="' + id + '">Editar</button><button class="cmp-btn p" data-pr="' + id + '"' + (c.ok ? '' : ' disabled title="' + esc(c.razao) + '"') + '>Promover ao Kanban</button></div>' +
          (!c.ok && c.razao && it.estado !== 'Qualificado' ? '<small>' + esc(c.razao) + '</small>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="8" style="padding:22px;text-align:center;color:#8A7A78">Nenhum contato. Use "Importar lista (CSV)" ou "+ Novo contato".</td></tr>') +
      '</table></div>') + '</div>';
    h.innerHTML = html;
    bind();
  }

  function bind() {
    var h = S.host;
    h.querySelectorAll('[data-f]').forEach(function (el) { el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', function () { S.f[el.dataset.f] = el.value; if (el.tagName === 'INPUT') { clearTimeout(S._t); S._t = setTimeout(function () { render(); var i = h.querySelector('[data-f="q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } else render(); }); });
    var cons = h.querySelector('[data-cons]'); if (cons) cons.addEventListener('input', function () { S.cons = cons.value; });
    h.querySelectorAll('[data-est]').forEach(function (el) { el.addEventListener('change', function () { salvar(el.dataset.est, { estado: el.value }); }); });
    h.querySelectorAll('[data-aba]').forEach(function (el) { el.addEventListener('click', function () { S.aba = el.dataset.aba; render(); }); });
    h.querySelectorAll('[data-hi]').forEach(function (el) { el.addEventListener('click', function () { historico(el.dataset.hi); }); });
    h.querySelectorAll('[data-ed]').forEach(function (el) { el.addEventListener('click', function () { editar(el.dataset.ed); }); });
    h.querySelectorAll('[data-pr]').forEach(function (el) { el.addEventListener('click', function () { promover(el.dataset.pr); }); });
    h.querySelectorAll('[data-a]').forEach(function (el) { el.addEventListener('click', function () { if (el.dataset.a === 'novo') editar(''); else importar(); }); });
  }

  async function salvar(id, campos) {
    var cur = S.itens.find(function (x) { return String(x.__id) === String(id); });
    if (cur && campos.estado && campos.estado !== (cur.estado || 'Na fila') && !campos.historicoJson) {
      /* mudança de estado pela lista também entra no histórico (convite/aceite/resposta ganham o evento certo) */
      var map = { 'Convite enviado': 'Convite enviado', 'Conectado': 'Aceite', 'Em conversa': 'Resposta recebida', 'Sem fit': 'Observação', 'Não contatar': 'Observação' };
      var tp = map[campos.estado];
      if (tp) { var extra = aplicaEvento(cur, tp, hoje(), tp === 'Observação' ? 'Estado alterado para ' + campos.estado : ''); campos = Object.assign({}, extra, campos); }
    }
    try { await jpost('/api/campanhas', 'PATCH', { id: id, fields: campos }); var it = S.itens.find(function (x) { return String(x.__id) === String(id); }); if (it) Object.assign(it, campos); S.msg = ''; }
    catch (e) { S.msg = 'Não foi possível salvar: ' + e.message; }
    render();
    auto(S.itens.find(function (x) { return String(x.__id) === String(id); }));
  }

  /* ---------- modal ---------- */
  function modal(titulo, corpo, botoes) {
    var ov = document.createElement('div'); ov.className = 'cmp-ov cmp';
    ov.innerHTML = '<div class="cmp-md"><h3>' + esc(titulo) + '</h3>' + corpo + '<div class="cmp-act" style="justify-content:flex-end;margin-top:14px">' + botoes + '</div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov); return ov;
  }
  function campo(l, n, v, extra) { return '<label' + (extra && extra.w ? ' class="w"' : '') + '>' + l + '<input data-k="' + n + '" value="' + esc(v || '') + '"></label>'; }
  function sel(l, n, v, ops) { return '<label>' + l + '<select data-k="' + n + '">' + ops.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>'; }

  function editar(id) {
    var it = id ? S.itens.find(function (x) { return String(x.__id) === String(id); }) : null; var v = it || { estado: 'Na fila', campanha: '' };
    var camps = S.itens.map(function (i) { return i.campanha; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; });
    var ov = modal(it ? 'Editar contato' : 'Novo contato',
      '<div class="cmp-g">' + campo('Nome', 'nome', v.nome) + campo('Sobrenome', 'sobrenome', v.sobrenome) + campo('Cargo', 'cargo', v.cargo) + campo('Empresa', 'empresaNome', v.empresaNome) +
      campo('Link do perfil no LinkedIn', 'linkedinUrl', v.linkedinUrl, { w: 1 }) + campo('E-mail', 'email', v.email) + campo('Telefone', 'telefone', v.telefone) +
      '<label>Campanha<input data-k="campanha" list="cmp-dl-camp" value="' + esc(v.campanha || '') + '"><datalist id="cmp-dl-camp">' + camps.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></label>' +
      campo('Lista de origem (TARGET MED, CPMT...)', 'listaOrigem', v.listaOrigem) +
      sel('Estado', 'estado', v.estado || 'Na fila', ESTADOS) + sel('Passo da cadência', 'passo', v.passo || '', (v.passo && PASSOS.indexOf(v.passo) < 0) ? PASSOS.concat([v.passo]) : PASSOS) +
      campo('Data do convite (AAAA-MM-DD)', 'dataConvite', v.dataConvite) + campo('Data do aceite (AAAA-MM-DD)', 'dataAceite', v.dataAceite) +
      sel('Empresa ICP A?', 'icpA', v.icpA || '', ['', 'SIM']) + sel('Qualificação da empresa (se fora do cadastro)', 'empresaTag', v.empresaTag || '', ['', 'TARGET', 'ICP A', 'FORA']) + sel('Setor e porte compatíveis?', 'setorPorte', v.setorPorte || '', ['', 'SIM']) +
      sel('Respondeu?', 'respondeu', v.respondeu || '', ['', 'SIM']) + sel('Pediu conversa/material ou perguntou sobre serviço?', 'interesse', v.interesse || '', ['', 'SIM']) + sel('Tipo da resposta (define o peso)', 'tipoResposta', v.tipoResposta || '', [''].concat(TRESP)) +
      '<label class="w">Resumo da última resposta<textarea data-k="resumoResposta" rows="3">' + esc(v.resumoResposta || '') + '</textarea></label></div>' +
      '<div class="cmp-msg" id="cmp-em"></div>',
      '<button class="cmp-btn" data-x>Cancelar</button><button class="cmp-btn p" data-s>Salvar</button>');
    ov.querySelector('[data-x]').onclick = function () { ov.remove(); };
    ov.querySelector('[data-s]').onclick = async function () {
      var d = {}; ov.querySelectorAll('[data-k]').forEach(function (el) { d[el.dataset.k] = el.value.trim(); });
      if (!d.nome) { ov.querySelector('#cmp-em').textContent = 'Informe o nome.'; return; }
      var emp = empresaDe(Object.assign({}, d)); d.empresaId = emp ? String(emp.__id) : '';
      if (!it && !qualOk(qualif(d))) { ov.querySelector('#cmp-em').textContent = 'Regra de Ouro: só entram na campanha contatos de empresa TARGET ou ICP A, e esta empresa não qualifica. Se ela for TARGET ou ICP A, ajuste a Qualificação da empresa.'; return; }
      try {
        if (it) { await jpost('/api/campanhas', 'PATCH', { id: it.__id, fields: d }); Object.assign(it, d); }
        else { var j = await jpost('/api/campanhas', 'POST', d); S.itens.push(j.item || Object.assign({ __id: j.id }, d)); }
        ov.remove(); S.msg = ''; render();
        if (it) auto(it);
      } catch (e) { ov.querySelector('#cmp-em').textContent = 'Erro ao salvar: ' + e.message; }
    };
  }

  /* ---------- histórico do contato ---------- */
  function historico(id) {
    var it = S.itens.find(function (x) { return String(x.__id) === String(id); }); if (!it) return;
    function tl() {
      var ev = eventos(it).slice().reverse();
      return ev.length ? ev.map(function (e) { return '<li><b>' + esc(e.tipo) + '</b> · ' + br(String(e.ts).slice(0, 10)) + '/' + String(e.ts).slice(0, 4) + (e.derivado ? ' <small style="display:inline">(a partir das datas do cadastro)</small>' : '') + (e.texto ? '<small>' + esc(e.texto) + '</small>' : '') + '</li>'; }).join('') : '<li><small>Nenhuma interação registrada.</small></li>';
    }
    var p = proxima(it);
    var ov = modal('Histórico — ' + ((it.nome || '') + ' ' + (it.sobrenome || '')).trim(),
      '<div class="cmp-msg" style="margin-top:0">' + esc(it.empresaNome || '') + ' · ' + esc(it.estado || 'Na fila') + '</div>' +
      '<h4>Próxima ação</h4><div style="margin-bottom:12px" data-prox>' + celProxima(p) + '</div>' +
      '<h4>Linha do tempo</h4><ul class="cmp-tl" data-tl>' + tl() + '</ul>' +
      '<h4>Registrar interação</h4><div class="cmp-g">' + sel('Tipo', 'tipo', 'Observação', TIPOS) + campo('Data (AAAA-MM-DD)', 'data', hoje()) + sel('Tipo da resposta (só para Resposta recebida)', 'tresp', '', [''].concat(TRESP)) +
      '<label class="w">Texto / material enviado / resumo da resposta<textarea data-k="texto" rows="2"></textarea></label></div><div class="cmp-msg" id="cmp-hm"></div>',
      '<button class="cmp-btn" data-x>Fechar</button><button class="cmp-btn p" data-s>Registrar</button>');
    ov.querySelector('[data-x]').onclick = function () { ov.remove(); render(); };
    ov.querySelector('[data-s]').onclick = async function () {
      var tipo = ov.querySelector('[data-k="tipo"]').value, data = ov.querySelector('[data-k="data"]').value.trim(), texto = ov.querySelector('[data-k="texto"]').value.trim(), m = ov.querySelector('#cmp-hm');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { m.textContent = 'Use a data no formato AAAA-MM-DD.'; return; }
      var campos = aplicaEvento(it, tipo, data, texto), tresp = ov.querySelector('[data-k="tresp"]').value;
      if (tipo === 'Resposta recebida' && tresp) campos.tipoResposta = tresp;
      try {
        await jpost('/api/campanhas', 'PATCH', { id: it.__id, fields: campos }); Object.assign(it, campos);
        ov.querySelector('[data-tl]').innerHTML = tl(); ov.querySelector('[data-prox]').innerHTML = celProxima(proxima(it));
        ov.querySelector('[data-k="texto"]').value = ''; m.textContent = 'Registrado.'; auto(it);
      } catch (e) { m.textContent = 'Erro ao salvar: ' + e.message; }
    };
  }

  /* ---------- importação CSV ---------- */
  function parseCsv(txt) {
    var sep = (txt.split('\n')[0].match(/;/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < txt.length; i++) {
      var ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(function (c) { return c.trim(); })) rows.push(row); row = []; }
      else cur += ch;
    }
    row.push(cur); if (row.some(function (c) { return c.trim(); })) rows.push(row);
    return rows;
  }
  var MAPA = { nome: 'nome', sobrenome: 'sobrenome', cargo: 'cargo', empresa: 'empresaNome', linkedin: 'linkedinUrl', perfil: 'linkedinUrl', email: 'email', telefone: 'telefone', campanha: 'campanha', lista: 'listaOrigem', icp: 'icpA', tag: 'empresaTag' };
  function importar() {
    var ov = modal('Importar lista (CSV)',
      '<p style="font-size:12.5px;color:#8A7A78;margin-top:0">Primeira linha com os títulos das colunas: <b>nome, sobrenome, cargo, empresa, linkedin, email, telefone, campanha, lista, icp</b> (só nome é obrigatório; icp = SIM marca empresa ICP A; tag = TARGET ou ICP A para empresa fora do cadastro). <b>Regra de Ouro:</b> contato de empresa que não seja TARGET nem ICP A não é importado. Separador vírgula ou ponto e vírgula. Contatos que já existem (mesmo perfil ou mesmo nome e empresa) são ignorados.</p>' +
      '<input type="file" accept=".csv,text/csv,.txt" data-file><textarea data-txt rows="8" style="width:100%;margin-top:8px" placeholder="ou cole aqui o conteúdo do CSV"></textarea><div class="cmp-msg" id="cmp-im"></div>',
      '<button class="cmp-btn" data-x>Fechar</button><button class="cmp-btn p" data-go>Importar</button>');
    ov.querySelector('[data-x]').onclick = function () { ov.remove(); };
    ov.querySelector('[data-file]').onchange = function (e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { ov.querySelector('[data-txt]').value = r.result; }; r.readAsText(f, 'UTF-8'); };
    ov.querySelector('[data-go]').onclick = async function () {
      var msg = ov.querySelector('#cmp-im'), btn = this, rows = parseCsv(ov.querySelector('[data-txt]').value || '');
      if (rows.length < 2) { msg.textContent = 'Nada para importar.'; return; }
      var cab = rows[0].map(function (c) { return MAPA[norm(c)] || ''; });
      if (cab.indexOf('nome') < 0) { msg.textContent = 'Não achei a coluna "nome" na primeira linha.'; return; }
      btn.disabled = true; var ok = 0, dup = 0, err = 0, fora = 0;
      var chaves = {}; S.itens.forEach(function (i) { chaves[chave(i)] = 1; });
      for (var r = 1; r < rows.length; r++) {
        var d = { estado: 'Na fila' };
        cab.forEach(function (k, idx) { if (k) d[k] = (rows[r][idx] || '').trim(); });
        if (d.empresaTag) { var tg0 = d.empresaTag.toUpperCase().replace(/\s+/g, ' '); d.empresaTag = tg0 === 'TARGET' ? 'TARGET' : (tg0 === 'ICP A' || tg0 === 'A' ? 'ICP A' : ''); }
        if (!d.empresaTag && /target/i.test(d.listaOrigem || '')) d.empresaTag = 'TARGET';
        if (d.icpA) d.icpA = /^(sim|s|a|x|1)$/i.test(d.icpA) ? 'SIM' : '';
        if (!d.nome) continue;
        var ch = chave(d); if (chaves[ch]) { dup++; continue; } chaves[ch] = 1;
        var emp = empresaDe(d); d.empresaId = emp ? String(emp.__id) : '';
        if (!qualOk(qualif(d))) { fora++; continue; }
        try { var j = await jpost('/api/campanhas', 'POST', d); S.itens.push(j.item || Object.assign({ __id: j.id }, d)); ok++; } catch (e) { err++; }
        msg.textContent = 'Importando... ' + ok + ' criados, ' + dup + ' repetidos, ' + fora + ' fora do critério, ' + err + ' com erro.';
      }
      msg.textContent = 'Concluído: ' + ok + ' criados, ' + dup + ' repetidos ignorados, ' + fora + ' fora do critério (Regra de Ouro) ignorados, ' + err + ' com erro.'; btn.disabled = false; render();
    };
  }
  function chave(i) { return i.linkedinUrl ? 'u:' + norm(i.linkedinUrl).replace(/\/+$/, '') : 'n:' + norm((i.nome || '') + ' ' + (i.sobrenome || '') + ' ' + (i.empresaNome || '')); }

  /* ---------- promoção ao Kanban ---------- */
  /* Regra (10/11/2026, Léo): atingiu a pontuação (nota >= NOTA_MIN + resposta, empresa TARGET/ICP A, sem bloqueio) -> abre o cadastro da Empresa
     (se ainda não existir) com o contato do LinkedIn e envia ao Kanban na coluna LEAD NOVO com a tag de campanha 'LKD LS - [Nome da campanha]'. Sem confirmação. */
  async function auto(it) {
    if (!it || S._auto || it.leadIdCriado || it.estado === 'Qualificado') return;
    if (!calc(it).ok) return;
    S._auto = true;
    try { await promover(it.__id, true); } finally { S._auto = false; }
  }
  async function promover(id, auto) {
    var it = S.itens.find(function (x) { return String(x.__id) === String(id); }); if (!it) return;
    var c = calc(it); if (!c.ok) { S.msg = c.razao; render(); return; }
    var cons = (S.cons || 'Léo').trim();
    var txt = 'Promover ' + (it.nome || '') + ' ' + (it.sobrenome || '') + ' (' + (it.empresaNome || '') + ') ao Kanban como LEAD?\n\nNota ' + c.total + ' (fit ' + c.fit + ' + engajamento ' + c.eng + '): ' + c.motivo + '.\nConsultor: ' + cons + '. Fonte: LinkedIn.' + (c.aviso ? '\n\nAtenção: ' + c.aviso : '');
    if (!auto && !window.confirm(txt)) return;
    var emp = c.emp, d = hoje(), dd = new Date(d + 'T00:00:00'), por = (window.__heu || window.__meEmail || '');
    var tagCamp = 'LKD LS - ' + (it.campanha || 'LinkedIn'), empNova = false;
    if (!emp) {
      try {
        var rE = await jpost('/api/empresas', 'POST', { cliente: it.empresaNome, target: c.qual === 'TARGET' ? 'TARGET' : 'NÃO TARGET',
          obs: 'Cadastro aberto automaticamente pela tela Campanhas (LinkedIn), campanha ' + tagCamp + '. Qualificação: ' + c.qual + (it.empresaTagFonte ? ' (' + it.empresaTagFonte + ')' : '') + '. Contato: ' + (it.nome || '') + ' ' + (it.sobrenome || '') + (it.cargo ? ', ' + it.cargo : '') + (it.linkedinUrl ? '. Perfil: ' + it.linkedinUrl : '') + '. Completar CNPJ, endereço e demais dados.' });
        emp = (rE && rE.item) ? rE.item : { cliente: it.empresaNome };
        if (!emp.__id) emp.__id = rE.id;
        if (!emp.__id) throw new Error('cadastro sem identificador');
        S.empresas.push(emp); empNova = true;
      } catch (e) { S.msg = 'Não foi possível abrir o cadastro da empresa: ' + e.message; render(); return; }
    }
    var rec = { dt: d, y: dd.getFullYear(), m: dd.getMonth() + 1, cliente: emp.cliente || emp.razaoSocial || it.empresaNome, empresaId: String(emp.__id), unidade: '', origem: 'NÃO SÓCIOS', cons: cons,
      fonte: 'LinkedIn', campanha: tagCamp, icp: (it.icpA === 'SIM' || c.qual === 'ICP A') ? 'A' : 'NA', prop: 'NÃO', status: 'LEAD', tipo: 'N/A', valor: 0, tc: 'NOVO', serv: 'NA',
      cnpj: emp.cnpj || '', razaoSocial: emp.razaoSocial || '', nome: it.nome || '', contatoSobrenome: it.sobrenome || '', telefone: it.telefone || '', email: it.email || '',
      obs: 'Origem: tela Campanhas (LinkedIn), tag ' + tagCamp + '.' + (empNova ? ' Cadastro da empresa aberto automaticamente.' : '') + ' Nota ' + c.total + ' = ' + c.motivo + '.' + (it.linkedinUrl ? ' Perfil: ' + it.linkedinUrl + '.' : '') + (it.resumoResposta ? ' Última resposta: ' + it.resumoResposta : ''),
      histEventosJson: JSON.stringify([{ ts: new Date().toISOString(), texto: 'Lead criado pela tela Campanhas (LinkedIn) — nota ' + c.total + ': ' + c.motivo, por: por || '(você)' }]) };
    try {
      var j = await jpost('/api/leads', 'POST', rec);
      /* contato: cria em Contatos_Comercial se ainda não existir (mesmo e-mail, ou mesmo nome na mesma empresa) */
      try {
        var nm = norm((it.nome || '') + ' ' + (it.sobrenome || ''));
        var ja = S.contatos.some(function (k) { return (it.email && norm(k.email) === norm(it.email)) || (String(k.empresaId || '') === String(emp.__id) && norm((k.nome || '') + ' ' + (k.sobrenome || '')) === nm); });
        if (!ja) await jpost('/api/contatos', 'POST', { nome: it.nome || '', sobrenome: it.sobrenome || '', telefone: it.telefone || '', email: it.email || '', empresaId: String(emp.__id), empresaNome: emp.cliente || emp.razaoSocial || '', tipo: '', cargo: it.cargo || '', obs: it.linkedinUrl ? 'LinkedIn: ' + it.linkedinUrl : '' });
      } catch (e) { /* contato é complemento: não desfaz o lead */ }
      var campos = { estado: 'Qualificado', empresaId: String(emp.__id), leadIdCriado: String(j.id || ''), promovidoEm: new Date().toISOString(), notaTotal: c.total, motivoPromocao: c.motivo };
      await jpost('/api/campanhas', 'PATCH', { id: id, fields: campos }); Object.assign(it, campos);
      S.msg = 'Lead criado no Kanban (coluna LEAD NOVO, tag ' + tagCamp + '): ' + (it.nome || '') + ' — ' + rec.cliente + (empNova ? ' (cadastro da empresa aberto)' : '') + '.';
      if (typeof window.reloadData === 'function') { try { await window.reloadData(); } catch (e) { } }
      try { var cs = await api('/api/contatos'); S.contatos = cs.items || S.contatos; var ls = await api('/api/leads'); S.leads = ls.items || S.leads; } catch (e) { }
    } catch (e) { S.msg = 'Não foi possível promover: ' + e.message; }
    render();
  }

  /* ---------- API pública ---------- */
  window.CampanhasModule = {
    mount: async function (host) {
      S.host = host; host.innerHTML = '<div class="cmp"><p class="cmp-msg">Carregando campanhas...</p></div>';
      try { await carregar(); S.msg = ''; } catch (e) { S.msg = 'Não foi possível carregar: ' + e.message; }
      render();
    },
    refresh: async function () { if (!S.host) return; try { await carregar(); } catch (e) { } render(); }
  };
})();
