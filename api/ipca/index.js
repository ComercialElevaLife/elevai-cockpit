// /api/ipca — IPCA acumulado nos últimos 12 meses, fonte oficial IBGE/SIDRA (tabela 1737, variável 2265).
// Retorna { ok, pct, referencia, fonte }. Cache de 6h. Se o IBGE falhar, ok:false (a tela cai p/ input manual).
const { json } = require('../_shared/crud');

const URL = 'https://apisidra.ibge.gov.br/values/t/1737/n1/1/v/2265/p/last%201';
let _cache = { at: 0, data: null };

module.exports = async function (context, req) {
  try {
    if (_cache.data && (Date.now() - _cache.at) < 6 * 3600 * 1000) { context.res = json(200, _cache.data); return; }
    const r = await fetch(URL, { headers: { 'Accept': 'application/json' } });
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length < 2) throw new Error('resposta inesperada do IBGE');
    const row = arr[arr.length - 1];               // 1ª posição = cabeçalho; última = dado
    const pct = parseFloat(String(row.V).replace(',', '.'));
    if (!isFinite(pct)) throw new Error('valor IPCA indisponível');
    const data = {
      ok: true,
      pct: Math.round(pct * 100) / 100,
      referencia: row.D3N || row.D2N || '',        // ex.: "junho 2026"
      periodo: row.D3C || '',                       // ex.: "202606"
      fonte: 'IBGE/SIDRA — tabela 1737 (IPCA, variação acumulada em 12 meses)',
    };
    _cache = { at: Date.now(), data };
    context.res = json(200, data);
  } catch (e) {
    context.res = json(200, { ok: false, error: String(e.message || e), fonte: 'IBGE/SIDRA' });
  }
};
