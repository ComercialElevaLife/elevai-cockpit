/* budget-module.js — Budget por vaga e escopo no comunicado de venda (24/11/2026, regra do Léo).
   Cada linha = uma vaga + um escopo (ex.: "PROF 1" / "1º turno - Fábrica"). O comercial informa o que foi vendido; o RH/operação pode distribuir ou somar entre as vagas.
   h/semana = h/dia x freq; h/mês = h/semana x 4,33; MO/mês = h/mês x MO/hora; BEN = 15% da MO/mês (CLT); SVV = MO/mês x 3 (CLT) ou x 2,5 (PJ, sem BEN).
   Módulo próprio (não mexe no restante do index.html): monta a seção dentro de #ov-venda, grava em lead.budgetJson e anexa o Budget ao envio da Implantação.
   O servidor recalcula tudo (api/_shared/budget.js); as contas aqui são só para mostrar na tela. */
(function () {
  'use strict';
  var FATOR = 4.33, BEN = 0.15;
  var linhas = [], leadId = null, sujo = false, enviado = {};
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var t = String(v == null ? '' : v).replace(/[^\d,.\-]/g, '');
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    var x = parseFloat(t); return isFinite(x) ? x : 0;
  }
  function r2(x) { return Math.round(x * 100 + 1e-7) / 100; }
  function brl(x) { return 'R$ ' + r2(x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function nb(x) { return r2(x).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function calc(l) {
    var pj = /^pj$/i.test(String(l.regime || ''));
    var hSem = num(l.hDia) * num(l.freq), hMes = hSem * FATOR, mo = hMes * num(l.moH);
    return { pj: pj, hSem: hSem, hMes: hMes, mo: mo, ben: pj ? 0 : mo * BEN, custos: num(l.custos), svv: mo * (pj ? 2.5 : 3) };
  }
  function nova() { return { vaga: '', escopo: '', regime: 'CLT', moH: '', hDia: '', freq: '', entrada: '', saida: '', custos: '' }; }
  function lead() { try { return typeof window._cvLead === 'function' ? window._cvLead() : null; } catch (e) { return null; } }
  function lerLead(l) {
    try { var j = JSON.parse((l && l.budgetJson) || '{}'); return Array.isArray(j.linhas) ? j.linhas : []; } catch (e) { return []; }
  }
  var CSS = '#bud-box table{border-collapse:collapse;width:100%;font-size:11.5px}#bud-box th{background:#EBD9DB;color:#5E2A30;padding:4px;text-align:left;white-space:nowrap}' +
    '#bud-box td{padding:3px;border-bottom:1px solid #EADDE0;vertical-align:middle}#bud-box input,#bud-box select{width:100%;min-width:52px;box-sizing:border-box;font-size:11.5px;padding:3px}' +
    '#bud-box .bud-t td{background:#F5EFEA;font-weight:600}#bud-box .bud-g{background:#EBD9DB}';
  function montar() {
    if ($('bud-box')) return $('bud-box');
    var ref = $('ft-box'); if (!ref || !ref.parentNode) return null;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var d = document.createElement('details');
    d.id = 'bud-box'; d.style.cssText = 'margin:8px 0;border:1px solid #e3d9d6;border-radius:8px;padding:6px 10px;background:#fffaf8';
    d.innerHTML = '<summary style="cursor:pointer;font-weight:600;font-size:12.5px">💼 Budget por vaga e escopo <span style="font-weight:400;color:#8A7A78">(o que foi vendido — vai ao RH e à Implantação, nunca ao Teams)</span></summary>' +
      '<div style="font-size:11.5px;color:#8A7A78;margin:6px 0">Uma linha por vaga e escopo (ex.: PROF 1 · 1º turno - Fábrica). O RH/operação pode distribuir ou somar entre as vagas; o total vendido é o que vale.</div>' +
      '<div style="overflow-x:auto"><table><thead><tr><th>Vaga</th><th>Escopo</th><th>Regime</th><th>MO/hora</th><th>h/dia</th><th>Freq/sem</th><th>Entrada</th><th>Saída</th><th>Custos/mês</th><th>h/mês</th><th>MO/mês</th><th>Benefício</th><th>Venda (SVV)</th><th></th></tr></thead><tbody id="bud-corpo"></tbody></table></div>' +
      '<div style="margin-top:6px"><button class="btn gh" type="button" id="bud-add">+ Adicionar linha</button> <button class="btn gh" type="button" id="bud-save" title="Grava o Budget no card da venda">💾 Salvar Budget</button> <span id="bud-msg" style="font-size:11.5px;margin-left:6px"></span></div>' +
      '<div id="bud-res" style="font-size:12px;margin-top:8px"></div>';
    ref.parentNode.insertBefore(d, ref);
    $('bud-add').onclick = function () { linhas.push(nova()); sujo = true; desenhar(); };
    $('bud-save').onclick = salvar;
    d.addEventListener('input', function (ev) {
      var t = ev.target, i = t && t.getAttribute('data-i'), k = t && t.getAttribute('data-k');
      if (i == null || !k) return; linhas[+i][k] = t.value; sujo = true; resumo();
    });
    d.addEventListener('change', function (ev) { var t = ev.target; if (t && t.getAttribute('data-k') === 'regime') { linhas[+t.getAttribute('data-i')].regime = t.value; sujo = true; desenhar(); } });
    d.addEventListener('click', function (ev) { var t = ev.target; if (t && t.getAttribute && t.getAttribute('data-del') != null) { linhas.splice(+t.getAttribute('data-del'), 1); sujo = true; desenhar(); } });
    return d;
  }
  function inp(i, k, v, w, ph) { return '<input data-i="' + i + '" data-k="' + k + '" value="' + esc(v) + '" style="min-width:' + (w || 52) + 'px" placeholder="' + esc(ph || '') + '">'; }
  function desenhar() {
    var c = $('bud-corpo'); if (!c) return;
    c.innerHTML = linhas.map(function (l, i) {
      return '<tr data-r="' + i + '"><td>' + inp(i, 'vaga', l.vaga, 70, 'PROF 1') + '</td><td>' + inp(i, 'escopo', l.escopo, 130, '1º turno - Fábrica') + '</td>' +
        '<td><select data-i="' + i + '" data-k="regime"><option' + (/^pj$/i.test(l.regime) ? '' : ' selected') + '>CLT</option><option' + (/^pj$/i.test(l.regime) ? ' selected' : '') + '>PJ</option></select></td>' +
        '<td>' + inp(i, 'moH', l.moH, 60, '50,00') + '</td><td>' + inp(i, 'hDia', l.hDia, 46, '1,5') + '</td><td>' + inp(i, 'freq', l.freq, 46, '3') + '</td>' +
        '<td>' + inp(i, 'entrada', l.entrada, 56, '06:50') + '</td><td>' + inp(i, 'saida', l.saida, 56, '08:20') + '</td><td>' + inp(i, 'custos', l.custos, 66, '0,00') + '</td>' +
        '<td class="bud-c" data-c="hMes"></td><td class="bud-c" data-c="mo"></td><td class="bud-c" data-c="ben"></td><td class="bud-c" data-c="svv"></td>' +
        '<td><button type="button" class="btn gh" data-del="' + i + '" title="Remover linha">✕</button></td></tr>';
    }).join('');
    resumo();
  }
  function resumo() {
    var tot = { hMes: 0, mo: 0, ben: 0, custos: 0, svv: 0 }, grupos = {}, ordem = [];
    var trs = document.querySelectorAll('#bud-corpo tr');
    linhas.forEach(function (l, i) {
      var x = calc(l), tr = trs[i];
      if (tr) { var m = { hMes: nb(x.hMes), mo: brl(x.mo), ben: brl(x.ben), svv: brl(x.svv) }; Array.prototype.forEach.call(tr.querySelectorAll('.bud-c'), function (td) { td.textContent = m[td.getAttribute('data-c')]; }); }
      if (!(x.hMes > 0 || x.mo > 0 || x.custos > 0)) return;
      var k = String(l.vaga || '').trim() || 'Vaga';
      if (!grupos[k]) { grupos[k] = { hMes: 0, mo: 0, ben: 0, custos: 0, svv: 0, n: 0 }; ordem.push(k); }
      ['hMes', 'mo', 'ben', 'custos', 'svv'].forEach(function (f) { grupos[k][f] += x[f]; tot[f] += x[f]; });
      grupos[k].n++;
    });
    var r = $('bud-res'); if (!r) return;
    if (!ordem.length) { r.innerHTML = '<span style="color:#8A7A78">Preencha ao menos MO/hora, h/dia e freq/sem para ver o total.</span>'; return; }
    var h = '<table><thead><tr><th>Vaga</th><th>Linhas</th><th>h/mês</th><th>MO/mês</th><th>Benefício</th><th>Custos</th><th>Venda (SVV)</th></tr></thead><tbody>';
    ordem.forEach(function (k) { var g = grupos[k]; h += '<tr><td>' + esc(k) + '</td><td>' + g.n + '</td><td>' + nb(g.hMes) + '</td><td>' + brl(g.mo) + '</td><td>' + brl(g.ben) + '</td><td>' + brl(g.custos) + '</td><td>' + brl(g.svv) + '</td></tr>'; });
    h += '<tr class="bud-t"><td>TOTAL (' + ordem.length + (ordem.length === 1 ? ' vaga' : ' vagas') + ')</td><td></td><td>' + nb(tot.hMes) + '</td><td>' + brl(tot.mo) + '</td><td>' + brl(tot.ben) + '</td><td>' + brl(tot.custos) + '</td><td>' + brl(tot.svv) + '</td></tr></tbody></table>';
    h += '<div style="margin-top:4px">Valor da hora vendida (SVV ÷ h/mês): <b>' + brl(tot.hMes > 0 ? tot.svv / tot.hMes : 0) + '</b></div>';
    var vm = $('ft-valor') ? num($('ft-valor').value) : 0;
    if (vm > 0 && Math.abs(vm - tot.svv) > 0.5) h += '<div style="margin-top:4px;color:#C9822B">Atenção: o valor mensal informado no contrato (' + brl(vm) + ') difere do total de venda do Budget (' + brl(tot.svv) + ').</div>';
    r.innerHTML = h;
  }
  function limpas() {
    return linhas.filter(function (l) { return num(l.moH) > 0 || num(l.hDia) > 0 || num(l.freq) > 0 || num(l.custos) > 0 || String(l.vaga || '').trim() || String(l.escopo || '').trim(); });
  }
  function salvar() {
    var l = lead(), m = $('bud-msg');
    if (!l || !window.persistLeadFields) { if (m) { m.style.color = '#B23A48'; m.textContent = 'Abra o card da venda para salvar.'; } return; }
    var campos = { budgetJson: JSON.stringify({ v: 1, linhas: limpas() }) };
    window.persistLeadFields(l.spid, campos, function () {
      l.budgetJson = campos.budgetJson; var raw = (window.STORE && STORE.leads || []).find(function (x) { return x.__id === l.spid; }); if (raw) raw.budgetJson = campos.budgetJson;
      sujo = false; if (m) { m.style.color = '#2E7D5B'; m.textContent = 'Budget salvo.'; }
    }, function () { if (m) { m.style.color = '#B23A48'; m.textContent = 'Não consegui salvar. Tente de novo.'; } });
  }
  function carregar() {
    var d = montar(); if (!d) return;
    var l = lead(); var id = l ? l.id : null;
    if (id === leadId && linhas.length) return;
    if (id !== leadId) { leadId = id; sujo = false; linhas = lerLead(l); if (!linhas.length) linhas = [nova()]; desenhar(); }
  }
  /* Anexa o Budget ao envio da Implantação (modo gravar). Na venda com várias implantações (uma por área), só a primeira chamada leva o Budget, para o aviso ao RH não repetir. */
  function anexar(corpo) {
    var l = lead(); if (!l) return corpo;
    var ls = (leadId === l.id && $('bud-corpo')) ? limpas() : lerLead(l);
    if (!ls.length) return corpo;
    var ag = Date.now(), ult = enviado[l.id] || 0;
    if (ag - ult < 120000) return corpo;
    enviado[l.id] = ag;
    var out = {}; Object.keys(corpo).forEach(function (k) { out[k] = corpo[k]; });
    out.budget = { linhas: ls };
    var cg = $('cv-cargo'); if (cg && cg.value) out.cargo = cg.value;
    var pf = $('cv-perfil'); if (pf && pf.value) out.perfil = pf.value;
    return out;
  }
  function iniciar() {
    var f0 = window.fetch;
    window.fetch = function (u, o) {
      try {
        var url = typeof u === 'string' ? u : (u && u.url) || '';
        if (url.indexOf('/api/implantacao-sync') >= 0 && o && o.method && String(o.method).toUpperCase() === 'POST' && typeof o.body === 'string') {
          var corpo = JSON.parse(o.body);
          if (corpo && corpo.modo === 'gravar') { o = Object.assign({}, o, { body: JSON.stringify(anexar(corpo)) }); }
        }
      } catch (e) { /* nunca bloqueia o envio por causa do Budget */ }
      return f0.call(this, u, o);
    };
    var cr = window.cvRender;
    if (typeof cr === 'function') { window.cvRender = function () { var r = cr.apply(this, arguments); try { carregar(); } catch (e) {} return r; }; }
    window.sigeBudget = { linhas: function () { return limpas(); }, salvo: function () { return !sujo; } };
  }
  if (document.readyState === 'complete') iniciar(); else window.addEventListener('load', iniciar);
})();
