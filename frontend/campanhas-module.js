/* campanhas-module.js — tela de Campanhas do SIGE-novasreceitas (10/11/2026, Léo)
   "Sala de espera" da prospecção (LinkedIn etc.): gere contatos, calcula o lead scoring (nota 0–100) e,
   por botão, promove o contato qualificado ao Kanban como LEAD (Fonte LinkedIn). Regras: manual.html, seção 7.
   Dados: lista própria /api/campanhas (Campanhas_Comercial). Só LÊ empresas/contatos/leads; escreve em leads e
   contatos apenas ao promover. Carregado sob demanda pelo index.html (mesmo padrão do módulo Propostas). */
(function () {
  'use strict';

  var ESTADOS = ['Na fila', 'Convite enviado', 'Conectado', 'Em conversa', 'Qualificado', 'Sem fit', 'Não contatar'];
  var PASSOS = ['', 'Agradecimento', 'Follow-up', 'Encerramento'];
  var NOTA_MIN = 60;
  var S = { itens: [], empresas: [], contatos: [], leads: [], host: null, f: { q: '', campanha: '', estado: '' }, msg: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function hoje() { return new Date().toISOString().slice(0, 10); }

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
  function pontosCargo(cargo) {
    var t = norm(cargo); if (!t) return 0;
    if (!/(medic|sst|seguranca|ehs|saude|\brh\b|recursos humanos|pessoas|gente|ergonom|fisioterap|enfermag|qualidade de vida|beneficio)/.test(t)) return 0;
    return /(analista|tecnic|assistente|auxiliar|estagi)/.test(t) ? 10 : 20;
  }
  function calc(it) {
    var emp = empresaDe(it);
    var fitEmp = ((emp && String(emp.target || '').toUpperCase() === 'TARGET') || it.icpA === 'SIM') ? 25 : 0;
    var fitCargo = pontosCargo(it.cargo);
    var fitSetor = it.setorPorte === 'SIM' ? 15 : 0;
    var aceitou = !!(it.dataAceite || ['Conectado', 'Em conversa', 'Qualificado'].indexOf(it.estado) > -1) ? 10 : 0;
    var resp = it.respondeu === 'SIM' ? 15 : 0;
    var inter = it.interesse === 'SIM' ? 15 : 0;
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
    if (fitSetor) partes.push('setor/porte'); if (aceitou) partes.push('aceitou'); if (resp) partes.push('respondeu'); if (inter) partes.push('demonstrou interesse');
    motivo = partes.join(' + ');
    var razao = '';
    if (it.estado === 'Qualificado') razao = 'Já promovido.';
    else if (bloqueio) razao = bloqueio;
    else if (!emp) razao = 'Cadastre a empresa em Cadastro > Empresa antes de promover.';
    else if (it.respondeu !== 'SIM') razao = 'Falta resposta registrada.';
    else if (total < NOTA_MIN) razao = 'Nota abaixo de ' + NOTA_MIN + '.';
    return { emp: emp, fit: fit, eng: eng, total: total, bloqueio: bloqueio, aviso: aviso, motivo: motivo, razao: razao, ok: !razao };
  }

  /* ---------- carga ---------- */
  async function carregar() {
    var rs = await Promise.all(['/api/campanhas', '/api/empresas', '/api/contatos', '/api/leads'].map(function (u) { return api(u).then(function (j) { return j.items || []; }).catch(function (e) { if (u === '/api/campanhas') throw e; return []; }); }));
    S.itens = rs[0]; S.empresas = rs[1]; S.contatos = rs[2]; S.leads = rs[3];
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
    '.cmp-g .w{grid-column:1/-1}.cmp-act{display:flex;gap:6px;flex-wrap:wrap}.cmp a{color:#8B3A42}.cmp td small{white-space:normal}@media(max-width:700px){.cmp-g{grid-template-columns:1fr}}';

  function render() {
    var h = S.host; if (!h) return;
    if (!document.getElementById('cmp-css')) { var st = document.createElement('style'); st.id = 'cmp-css'; st.textContent = CSS; document.head.appendChild(st); }
    var camps = S.itens.map(function (i) { return i.campanha || ''; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
    var linhas = S.itens.map(function (it) { return { it: it, c: calc(it) }; });
    var cont = {}; ESTADOS.forEach(function (e) { cont[e] = 0; }); linhas.forEach(function (x) { cont[x.it.estado || 'Na fila'] = (cont[x.it.estado || 'Na fila'] || 0) + 1; });
    var prontos = linhas.filter(function (x) { return x.c.ok; }).length;
    var q = norm(S.f.q);
    var vis = linhas.filter(function (x) {
      var it = x.it;
      if (S.f.campanha && (it.campanha || '') !== S.f.campanha) return false;
      if (S.f.estado && (it.estado || 'Na fila') !== S.f.estado) return false;
      if (q && norm([it.nome, it.sobrenome, it.cargo, it.empresaNome, it.email].join(' ')).indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return b.c.total - a.c.total; });

    var html = '<div class="cmp">' +
      '<div class="cmp-top"><h2>Campanhas</h2><span style="flex:1"></span>' +
      '<button class="cmp-btn" data-a="imp">Importar lista (CSV)</button><button class="cmp-btn p" data-a="novo">+ Novo contato</button></div>' +
      '<div class="cmp-kpis"><div class="cmp-kpi"><b>' + S.itens.length + '</b><span>contatos na tela</span></div>' +
      '<div class="cmp-kpi"><b>' + (cont['Convite enviado'] || 0) + '</b><span>convites pendentes</span></div>' +
      '<div class="cmp-kpi"><b>' + ((cont['Conectado'] || 0) + (cont['Em conversa'] || 0)) + '</b><span>conectados / em conversa</span></div>' +
      '<div class="cmp-kpi"><b>' + prontos + '</b><span>prontos para promover (nota ≥ ' + NOTA_MIN + ' + resposta)</span></div>' +
      '<div class="cmp-kpi"><b>' + (cont['Qualificado'] || 0) + '</b><span>já promovidos ao Kanban</span></div></div>' +
      '<div class="cmp-bar"><input data-f="q" placeholder="Buscar nome, cargo, empresa..." value="' + esc(S.f.q) + '" style="min-width:230px">' +
      '<select data-f="campanha"><option value="">Todas as campanhas</option>' + camps.map(function (c) { return '<option' + (S.f.campanha === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<select data-f="estado"><option value="">Todos os estados</option>' + ESTADOS.map(function (e) { return '<option' + (S.f.estado === e ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select>' +
      '<label style="font-size:12px;color:#8A7A78">Consultor ao promover <input data-cons value="' + esc(S.cons || 'Léo') + '" style="width:90px"></label></div>' +
      (S.msg ? '<div class="cmp-msg">' + esc(S.msg) + '</div>' : '') +
      '<div class="cmp-card"><table><tr><th>Contato</th><th>Empresa</th><th>Campanha</th><th>Estado</th><th>Fit</th><th>Engaj.</th><th>Nota</th><th></th></tr>' +
      (vis.length ? vis.map(function (x) {
        var it = x.it, c = x.c, id = esc(it.__id);
        return '<tr><td><b>' + esc((it.nome || '') + ' ' + (it.sobrenome || '')) + '</b><small>' + esc(it.cargo || '') + '</small>' + (it.linkedinUrl ? '<small><a href="' + esc(it.linkedinUrl) + '" target="_blank" rel="noopener">perfil no LinkedIn</a></small>' : '') + '</td>' +
          '<td>' + esc(it.empresaNome || '') + (c.emp ? (String(c.emp.target || '').toUpperCase() === 'TARGET' ? ' <span class="cmp-tag t">TARGET</span>' : '') : ' <span class="cmp-tag warn">sem cadastro</span>') +
          (c.bloqueio ? '<span class="cmp-tag bad">bloqueado</span><small>' + esc(c.bloqueio) + '</small>' : '') + (c.aviso ? '<small>' + esc(c.aviso) + '</small>' : '') + '</td>' +
          '<td>' + esc(it.campanha || '') + '<small>' + esc(it.listaOrigem || '') + '</small></td>' +
          '<td><select data-est="' + id + '">' + ESTADOS.map(function (e) { return '<option' + ((it.estado || 'Na fila') === e ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select>' +
          (it.passo ? '<small>' + esc(it.passo) + '</small>' : '') + '</td>' +
          '<td>' + c.fit + '<small>de 60</small></td><td>' + c.eng + '<small>de 40</small></td><td><span class="cmp-nota">' + c.total + '</span></td>' +
          '<td><div class="cmp-act"><button class="cmp-btn" data-ed="' + id + '">Editar</button><button class="cmp-btn p" data-pr="' + id + '"' + (c.ok ? '' : ' disabled title="' + esc(c.razao) + '"') + '>Promover ao Kanban</button></div>' +
          (!c.ok && c.razao && it.estado !== 'Qualificado' ? '<small>' + esc(c.razao) + '</small>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="8" style="padding:22px;text-align:center;color:#8A7A78">Nenhum contato. Use "Importar lista (CSV)" ou "+ Novo contato".</td></tr>') +
      '</table></div></div>';
    h.innerHTML = html;
    bind();
  }

  function bind() {
    var h = S.host;
    h.querySelectorAll('[data-f]').forEach(function (el) { el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', function () { S.f[el.dataset.f] = el.value; if (el.tagName === 'INPUT') { clearTimeout(S._t); S._t = setTimeout(function () { render(); var i = h.querySelector('[data-f="q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } else render(); }); });
    var cons = h.querySelector('[data-cons]'); if (cons) cons.addEventListener('input', function () { S.cons = cons.value; });
    h.querySelectorAll('[data-est]').forEach(function (el) { el.addEventListener('change', function () { salvar(el.dataset.est, { estado: el.value }); }); });
    h.querySelectorAll('[data-ed]').forEach(function (el) { el.addEventListener('click', function () { editar(el.dataset.ed); }); });
    h.querySelectorAll('[data-pr]').forEach(function (el) { el.addEventListener('click', function () { promover(el.dataset.pr); }); });
    h.querySelectorAll('[data-a]').forEach(function (el) { el.addEventListener('click', function () { if (el.dataset.a === 'novo') editar(''); else importar(); }); });
  }

  async function salvar(id, campos) {
    try { await jpost('/api/campanhas', 'PATCH', { id: id, fields: campos }); var it = S.itens.find(function (x) { return String(x.__id) === String(id); }); if (it) Object.assign(it, campos); S.msg = ''; }
    catch (e) { S.msg = 'Não foi possível salvar: ' + e.message; }
    render();
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
      sel('Estado', 'estado', v.estado || 'Na fila', ESTADOS) + sel('Passo da cadência', 'passo', v.passo || '', PASSOS) +
      campo('Data do convite (AAAA-MM-DD)', 'dataConvite', v.dataConvite) + campo('Data do aceite (AAAA-MM-DD)', 'dataAceite', v.dataAceite) +
      sel('Empresa ICP A?', 'icpA', v.icpA || '', ['', 'SIM']) + sel('Setor e porte compatíveis?', 'setorPorte', v.setorPorte || '', ['', 'SIM']) +
      sel('Respondeu?', 'respondeu', v.respondeu || '', ['', 'SIM']) + sel('Pediu conversa/material ou perguntou sobre serviço?', 'interesse', v.interesse || '', ['', 'SIM']) +
      '<label class="w">Resumo da última resposta<textarea data-k="resumoResposta" rows="3">' + esc(v.resumoResposta || '') + '</textarea></label></div>' +
      '<div class="cmp-msg" id="cmp-em"></div>',
      '<button class="cmp-btn" data-x>Cancelar</button><button class="cmp-btn p" data-s>Salvar</button>');
    ov.querySelector('[data-x]').onclick = function () { ov.remove(); };
    ov.querySelector('[data-s]').onclick = async function () {
      var d = {}; ov.querySelectorAll('[data-k]').forEach(function (el) { d[el.dataset.k] = el.value.trim(); });
      if (!d.nome) { ov.querySelector('#cmp-em').textContent = 'Informe o nome.'; return; }
      var emp = empresaDe(Object.assign({}, d)); d.empresaId = emp ? String(emp.__id) : '';
      try {
        if (it) { await jpost('/api/campanhas', 'PATCH', { id: it.__id, fields: d }); Object.assign(it, d); }
        else { var j = await jpost('/api/campanhas', 'POST', d); S.itens.push(j.item || Object.assign({ __id: j.id }, d)); }
        ov.remove(); S.msg = ''; render();
      } catch (e) { ov.querySelector('#cmp-em').textContent = 'Erro ao salvar: ' + e.message; }
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
  var MAPA = { nome: 'nome', sobrenome: 'sobrenome', cargo: 'cargo', empresa: 'empresaNome', linkedin: 'linkedinUrl', perfil: 'linkedinUrl', email: 'email', telefone: 'telefone', campanha: 'campanha', lista: 'listaOrigem', icp: 'icpA' };
  function importar() {
    var ov = modal('Importar lista (CSV)',
      '<p style="font-size:12.5px;color:#8A7A78;margin-top:0">Primeira linha com os títulos das colunas: <b>nome, sobrenome, cargo, empresa, linkedin, email, telefone, campanha, lista, icp</b> (só nome é obrigatório; icp = SIM marca empresa ICP A). Separador vírgula ou ponto e vírgula. Contatos que já existem (mesmo perfil ou mesmo nome e empresa) são ignorados.</p>' +
      '<input type="file" accept=".csv,text/csv,.txt" data-file><textarea data-txt rows="8" style="width:100%;margin-top:8px" placeholder="ou cole aqui o conteúdo do CSV"></textarea><div class="cmp-msg" id="cmp-im"></div>',
      '<button class="cmp-btn" data-x>Fechar</button><button class="cmp-btn p" data-go>Importar</button>');
    ov.querySelector('[data-x]').onclick = function () { ov.remove(); };
    ov.querySelector('[data-file]').onchange = function (e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { ov.querySelector('[data-txt]').value = r.result; }; r.readAsText(f, 'UTF-8'); };
    ov.querySelector('[data-go]').onclick = async function () {
      var msg = ov.querySelector('#cmp-im'), btn = this, rows = parseCsv(ov.querySelector('[data-txt]').value || '');
      if (rows.length < 2) { msg.textContent = 'Nada para importar.'; return; }
      var cab = rows[0].map(function (c) { return MAPA[norm(c)] || ''; });
      if (cab.indexOf('nome') < 0) { msg.textContent = 'Não achei a coluna "nome" na primeira linha.'; return; }
      btn.disabled = true; var ok = 0, dup = 0, err = 0;
      var chaves = {}; S.itens.forEach(function (i) { chaves[chave(i)] = 1; });
      for (var r = 1; r < rows.length; r++) {
        var d = { estado: 'Na fila' };
        cab.forEach(function (k, idx) { if (k) d[k] = (rows[r][idx] || '').trim(); });
        if (d.icpA) d.icpA = /^(sim|s|a|x|1)$/i.test(d.icpA) ? 'SIM' : '';
        if (!d.nome) continue;
        var ch = chave(d); if (chaves[ch]) { dup++; continue; } chaves[ch] = 1;
        var emp = empresaDe(d); d.empresaId = emp ? String(emp.__id) : '';
        try { var j = await jpost('/api/campanhas', 'POST', d); S.itens.push(j.item || Object.assign({ __id: j.id }, d)); ok++; } catch (e) { err++; }
        msg.textContent = 'Importando... ' + ok + ' criados, ' + dup + ' repetidos, ' + err + ' com erro.';
      }
      msg.textContent = 'Concluído: ' + ok + ' criados, ' + dup + ' repetidos ignorados, ' + err + ' com erro.'; btn.disabled = false; render();
    };
  }
  function chave(i) { return i.linkedinUrl ? 'u:' + norm(i.linkedinUrl).replace(/\/+$/, '') : 'n:' + norm((i.nome || '') + ' ' + (i.sobrenome || '') + ' ' + (i.empresaNome || '')); }

  /* ---------- promoção ao Kanban ---------- */
  async function promover(id) {
    var it = S.itens.find(function (x) { return String(x.__id) === String(id); }); if (!it) return;
    var c = calc(it); if (!c.ok) { S.msg = c.razao; render(); return; }
    var cons = (S.cons || 'Léo').trim();
    var txt = 'Promover ' + (it.nome || '') + ' ' + (it.sobrenome || '') + ' (' + (it.empresaNome || '') + ') ao Kanban como LEAD?\n\nNota ' + c.total + ' (fit ' + c.fit + ' + engajamento ' + c.eng + '): ' + c.motivo + '.\nConsultor: ' + cons + '. Fonte: LinkedIn.' + (c.aviso ? '\n\nAtenção: ' + c.aviso : '');
    if (!window.confirm(txt)) return;
    var emp = c.emp, d = hoje(), dd = new Date(d + 'T00:00:00'), por = (window.__heu || window.__meEmail || '');
    var rec = { dt: d, y: dd.getFullYear(), m: dd.getMonth() + 1, cliente: emp.cliente || emp.razaoSocial || it.empresaNome, empresaId: String(emp.__id), unidade: '', origem: 'NÃO SÓCIOS', cons: cons,
      fonte: 'LinkedIn', campanha: it.campanha || 'LinkedIn', icp: it.icpA === 'SIM' ? 'A' : 'NA', prop: 'NÃO', status: 'LEAD', tipo: 'N/A', valor: 0, tc: 'NOVO', serv: 'NA',
      cnpj: emp.cnpj || '', razaoSocial: emp.razaoSocial || '', nome: it.nome || '', contatoSobrenome: it.sobrenome || '', telefone: it.telefone || '', email: it.email || '',
      obs: 'Origem: tela Campanhas (LinkedIn). Nota ' + c.total + ' = ' + c.motivo + '.' + (it.linkedinUrl ? ' Perfil: ' + it.linkedinUrl + '.' : '') + (it.resumoResposta ? ' Última resposta: ' + it.resumoResposta : ''),
      histEventosJson: JSON.stringify([{ ts: new Date().toISOString(), texto: 'Lead criado pela tela Campanhas (LinkedIn) — nota ' + c.total + ': ' + c.motivo, por: por || '(você)' }]) };
    try {
      var j = await jpost('/api/leads', 'POST', rec);
      /* contato: cria em Contatos_Comercial se ainda não existir (mesmo e-mail, ou mesmo nome na mesma empresa) */
      try {
        var nm = norm((it.nome || '') + ' ' + (it.sobrenome || ''));
        var ja = S.contatos.some(function (k) { return (it.email && norm(k.email) === norm(it.email)) || (String(k.empresaId || '') === String(emp.__id) && norm((k.nome || '') + ' ' + (k.sobrenome || '')) === nm); });
        if (!ja) await jpost('/api/contatos', 'POST', { nome: it.nome || '', sobrenome: it.sobrenome || '', telefone: it.telefone || '', email: it.email || '', empresaId: String(emp.__id), empresaNome: emp.cliente || emp.razaoSocial || '', tipo: '', cargo: it.cargo || '', obs: it.linkedinUrl ? 'LinkedIn: ' + it.linkedinUrl : '' });
      } catch (e) { /* contato é complemento: não desfaz o lead */ }
      var campos = { estado: 'Qualificado', leadIdCriado: String(j.id || ''), promovidoEm: new Date().toISOString(), notaTotal: c.total, motivoPromocao: c.motivo };
      await jpost('/api/campanhas', 'PATCH', { id: id, fields: campos }); Object.assign(it, campos);
      S.msg = 'Lead criado no Kanban (coluna LEAD): ' + (it.nome || '') + ' — ' + rec.cliente + '.';
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
