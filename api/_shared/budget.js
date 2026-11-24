// budget.js — Budget da vaga por vaga/escopo (24/11/2026, regra do Léo: planilha de orçamento).
// Cada linha = uma vaga + um escopo (ex.: "PROF 1" / "1º turno - Fábrica"): MO por hora, horas por dia e frequência por semana.
// h/semana = h/dia x freq; h/mês = h/semana x 4,33; MO/mês = h/mês x MO/hora; BEN = 15% da MO/mês (só CLT);
// SVV (valor de venda) = MO/mês x 3 (CLT) ou x 2,5 (PJ, sem BEN); $H/SVV = SVV total / h/mês total.
// Os valores só são arredondados na saída (a planilha também soma sem arredondar).
const FATOR_MES = 4.33, BEN_PCT = 0.15, MULT_CLT = 3, MULT_PJ = 2.5;
const s = function (v) { return v == null ? '' : String(v); };
function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let t = s(v).replace(/[^\d,.\-]/g, '');
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  const x = parseFloat(t);
  return isFinite(x) ? x : 0;
}
const r2 = function (x) { return Math.round(x * 100 + 1e-7) / 100; };
function linha(l) {
  const pj = /^pj$/i.test(s(l.regime).trim());
  const moH = num(l.moH), hDia = num(l.hDia), freq = num(l.freq), custos = num(l.custos);
  const hSem = hDia * freq, hMes = hSem * FATOR_MES, moMes = hMes * moH;
  const ben = pj ? 0 : moMes * BEN_PCT, svv = moMes * (pj ? MULT_PJ : MULT_CLT);
  return { vaga: s(l.vaga).trim(), escopo: s(l.escopo).trim(), regime: pj ? 'PJ' : 'CLT', entrada: s(l.entrada).trim(), saida: s(l.saida).trim(),
    moH: moH, hDia: hDia, freq: freq, hSem: hSem, hMes: hMes, moMes: moMes, ben: ben, custos: custos, svv: svv };
}
function somar(ls) {
  const t = { hMes: 0, moMes: 0, ben: 0, custos: 0, svv: 0 };
  ls.forEach(function (x) { t.hMes += x.hMes; t.moMes += x.moMes; t.ben += x.ben; t.custos += x.custos; t.svv += x.svv; });
  return t;
}
function arred(t) { const o = {}; Object.keys(t).forEach(function (k) { o[k] = r2(t[k]); }); return o; }
// budget = { linhas:[{vaga,escopo,regime,moH,hDia,freq,entrada,saida,custos}] }  ->  { vagas:[{vaga,linhas,total}], total, hSvv, nVagas, regime }
function resumir(budget) {
  const brutas = (budget && Array.isArray(budget.linhas) ? budget.linhas : []).map(linha).filter(function (x) { return x.hMes > 0 || x.moMes > 0 || x.custos > 0; });
  if (!brutas.length) return null;
  const grupos = {}, ordem = [];
  brutas.forEach(function (x) {
    const k = x.vaga || 'Vaga';
    if (!grupos[k]) { grupos[k] = []; ordem.push(k); }
    grupos[k].push(x);
  });
  const vagas = ordem.map(function (k) { return { vaga: k, linhas: grupos[k], total: somar(grupos[k]) }; });
  const total = somar(brutas);
  const regimes = Array.from(new Set(brutas.map(function (x) { return x.regime; })));
  return { vagas: vagas, total: total, hSvv: total.hMes > 0 ? r2(total.svv / total.hMes) : 0, nVagas: vagas.length, regime: regimes.length === 1 ? regimes[0] : 'CLT e PJ' };
}
function esc(t) { return s(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function brl(x) { return 'R$ ' + r2(x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function nb(x) { return r2(x).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
// E-mail confidencial ao RH (só ela recebe: tem valores de remuneração).
function emailHtml(info, ctx) {
  const c = ctx || {};
  let h = '<p><b>Nova implantação / Budget por vaga e escopo</b></p>' +
    '<p>Cliente/Programa: <b>' + esc(c.cliente) + '</b> — Área: <b>' + esc(c.area) + '</b>' + (c.tipoVenda ? ' — ' + esc(c.tipoVenda) : '') + '</p>' +
    '<p style="color:#b00;"><b>Atenção: esta mensagem contém informações sigilosas de remuneração. Não encaminhar.</b></p>';
  if (c.cargo) h += '<p>Cargo vendido: <b>' + esc(c.cargo) + '</b>' + (c.perfil ? ' — ' + esc(c.perfil) : '') + '</p>';
  h += '<p>O que foi vendido (Budget): a operação/RH pode distribuir ou somar entre as vagas conforme a necessidade, respeitando o total vendido.</p>';
  h += '<table style="border-collapse:collapse;font-size:13px" border="1" cellpadding="5"><tr style="background:#EBD9DB"><th>Vaga</th><th>Escopo</th><th>Regime</th><th>MO/h</th><th>h/dia</th><th>Freq/sem</th><th>h/mês</th><th>MO/mês</th><th>Benefício</th><th>Custos</th><th>Venda (SVV)</th><th>Entrada–Saída</th></tr>';
  info.vagas.forEach(function (v) {
    v.linhas.forEach(function (x) {
      h += '<tr><td>' + esc(v.vaga) + '</td><td>' + esc(x.escopo) + '</td><td>' + x.regime + '</td><td>' + brl(x.moH) + '</td><td>' + nb(x.hDia) + '</td><td>' + nb(x.freq) + '</td><td>' + nb(x.hMes) + '</td><td>' + brl(x.moMes) + '</td><td>' + brl(x.ben) + '</td><td>' + brl(x.custos) + '</td><td>' + brl(x.svv) + '</td><td>' + esc(x.entrada) + (x.saida ? '–' + esc(x.saida) : '') + '</td></tr>';
    });
    h += '<tr style="background:#F5EFEA"><td colspan="6"><b>Total da vaga ' + esc(v.vaga) + '</b></td><td>' + nb(v.total.hMes) + '</td><td>' + brl(v.total.moMes) + '</td><td>' + brl(v.total.ben) + '</td><td>' + brl(v.total.custos) + '</td><td>' + brl(v.total.svv) + '</td><td></td></tr>';
  });
  h += '<tr style="background:#EBD9DB"><td colspan="6"><b>TOTAL</b></td><td>' + nb(info.total.hMes) + '</td><td>' + brl(info.total.moMes) + '</td><td>' + brl(info.total.ben) + '</td><td>' + brl(info.total.custos) + '</td><td>' + brl(info.total.svv) + '</td><td></td></tr></table>';
  h += '<p>Valor da hora vendida (SVV ÷ h/mês): <b>' + brl(info.hSvv) + '</b></p>';
  h += '<p><i>Mensagem automática do SIGE, enviada apenas ao RH por conter dados sigilosos de remuneração.</i></p>';
  return h;
}
module.exports = { FATOR_MES, linha, resumir, emailHtml, arred, r2, num };
