// schema.js — definição canônica das 3 listas vivas do ElevAI (fonte: Dashboard_KPI_v1.3.html RAW)
// Datas ficam como Texto (ISO ou MM/YYYY) para round-trip 100% fiel ao RAW, sem deslocamento de fuso.
// Números nuláveis (dias, métricas de eventos) são OMITIDOS na gravação quando null e re-normalizados na leitura.

const LISTS = {
  leads: {
    displayName: 'Leads_Comercial',
    titleFrom: 'nome',
    columns: [
      { name: 'y', type: 'number' },
      { name: 'm', type: 'number' },
      { name: 'dt', type: 'text' },          // YYYY-MM-DD
      { name: 'nome', type: 'text' },
      { name: 'cliente', type: 'text' },
      { name: 'unidade', type: 'text' },
      { name: 'fonte', type: 'text' },
      { name: 'campanha', type: 'text' },
      { name: 'icp', type: 'text' },
      { name: 'cons', type: 'text' },
      { name: 'serv', type: 'text' },
      { name: 'prop', type: 'text' },         // SIM / NÃO
      { name: 'valor', type: 'number' },
      { name: 'tipo', type: 'text' },
      { name: 'envio', type: 'text' },        // YYYY-MM-DD | null
      { name: 'dias', type: 'number' },       // int | null
      { name: 'tc', type: 'text' },
      { name: 'status', type: 'text' },
      { name: 'tarefasJson', type: 'text' },   // tarefas do lead (JSON) — persistencia da aba Tarefas/CRM
      { name: 'alteradoEm', type: 'text' },
      { name: 'alteradoPor', type: 'text' },
    ],
  },
  vendas: {
    displayName: 'Vendas_Comercial',
    titleFrom: 'cliente',
    columns: [
      { name: 'y', type: 'number' },
      { name: 'm', type: 'number' },
      { name: 'dt', type: 'text' },          // YYYY-MM-DD
      { name: 'cliente', type: 'text' },
      { name: 'unidade', type: 'text' },
      { name: 'fonte', type: 'text' },
      { name: 'serv', type: 'text' },
      { name: 'icp', type: 'text' },
      { name: 'cons', type: 'text' },
      { name: 'tipo', type: 'text' },         // P / R
      { name: 'valor', type: 'number' },
      { name: 'origem', type: 'text' },
      { name: 'tc', type: 'text' },
      { name: 'alteradoEm', type: 'text' },
      { name: 'alteradoPor', type: 'text' },
    ],
  },
  eventos: {
    displayName: 'Eventos_Comercial',
    titleFrom: 'nome',
    columns: [
      { name: 'nome', type: 'text' },
      { name: 'data', type: 'text' },         // MM/YYYY
      { name: 'leads', type: 'number' },      // int | null
      { name: 'reunioes', type: 'number' },   // int | null
      { name: 'propostas', type: 'number' },  // int | null
      { name: 'fechamentos', type: 'number' },// int | null
      { name: 'alteradoEm', type: 'text' },
      { name: 'alteradoPor', type: 'text' },
    ],
  },
};

function toFields(kind, rec) {
  const def = LISTS[kind];
  const fields = {};
  const titleVal = rec[def.titleFrom];
  fields.Title = (titleVal == null || titleVal === '') ? '(sem titulo)' : String(titleVal);
  for (const col of def.columns) {
    const v = rec[col.name];
    if (v === null || v === undefined) continue; // omite nulos (Graph rejeita null em Number)
    fields[col.name] = v;
  }
  return fields;
}

function fromFields(kind, fields) {
  const def = LISTS[kind];
  const out = {};
  for (const col of def.columns) {
    const v = fields[col.name];
    out[col.name] = (v === undefined) ? null : v;
  }
  return out;
}

module.exports = { LISTS, toFields, fromFields };
