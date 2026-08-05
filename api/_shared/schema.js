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
      { name: 'telefone', type: 'text' },      // contato (LP/eventos)
      { name: 'email', type: 'text' },         // contato (LP/eventos)
      { name: 'obs', type: 'text' },           // observações livres
      { name: 'tarefasJson', type: 'text' },   // tarefas do lead (JSON) — persistencia da aba Tarefas/CRM
      // --- Reforma do cadastro (05/08/2026): fases do lead + condições comerciais ---
      { name: 'cnpj', type: 'text' },            // Fase 1 — CNPJ (dispara auto-preenchimento)
      { name: 'razaoSocial', type: 'text' },     // Fase 1 — razão social (auto via BrasilAPI)
      { name: 'endereco', type: 'text' },        // Fase 1 — endereço (auto via BrasilAPI)
      { name: 'cnae', type: 'text' },            // Fase 1 — CNAE fiscal (auto via BrasilAPI)
      { name: 'grauRisco', type: 'text' },       // Fase 1 — grau de risco (NR-4)
      { name: 'contatoSobrenome', type: 'text' },// Fase 1 — sobrenome do contato (nome fica em 'nome')
      { name: 'contatoTipo', type: 'text' },     // Fase 1 — Técnico / Comercial
      { name: 'origem', type: 'text' },          // SÓCIOS / NÃO SÓCIOS (meta 133k sócios / 200k não-sócios)
      { name: 'valorMensal', type: 'number' },   // Fase 2 — recorrente: valor do mês (× numMeses = valor total)
      { name: 'numMeses', type: 'number' },      // Fase 2 — recorrente: nº de meses (padrão 12, mín 3)
      { name: 'condPagamento', type: 'text' },   // Fase 2 — condições de pagamento
      { name: 'codServico', type: 'text' },      // Fase 2 — código de serviço (ISS/financeiro)
      { name: 'prazoMobilizacao', type: 'text' },// Fase 2 — prazo para mobilização
      { name: 'recebimento', type: 'text' },     // Fase 3 — forma de recebimento (Boleto/Crédito em conta/NF)
      { name: 'valorFechamento', type: 'number' },// Fase 3 — valor de fechamento da venda (redução vs proposta)
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
  contratos: {
    displayName: 'Contratos_Comercial',
    titleFrom: 'cliente',
    columns: [
      { name: 'cnpj', type: 'text' },
      { name: 'cliente', type: 'text' },
      { name: 'servico', type: 'text' },
      { name: 'unidade', type: 'text' },
      { name: 'vigInicio', type: 'text' },        // YYYY-MM-DD
      { name: 'vigFim', type: 'text' },           // YYYY-MM-DD
      { name: 'status', type: 'text' },           // status da planilha (VIGENTE/ATRASADO/PRÓX. VENC/CANCELADO)
      { name: 'responsavel', type: 'text' },
      { name: 'responsavelEmail', type: 'text' },
      { name: 'valorPadrao', type: 'number' },    // mensal (R$)
      { name: 'dll', type: 'number' },            // prazo de pagamento (dias) | null
      { name: 'ipcaPct', type: 'number' },        // % IPCA no aniversário | null
      { name: 'novoValor', type: 'number' },      // valor reajustado | null
      { name: 'statusRenovacao', type: 'text' },  // fluxo: PENDENTE/MINUTA/ENVIADA/RENOVADA
      { name: 'obsRenovacao', type: 'text' },
      { name: 'alteradoEm', type: 'text' },
      { name: 'alteradoPor', type: 'text' },
    ],
  },
  // --- Redesenho CRM (05/08/2026): Empresa / Contato / Oportunidade (padrão de CRM) ---
  empresas: {
    displayName: 'Empresas_Comercial',
    titleFrom: 'cliente',
    columns: [
      { name: 'cliente', type: 'text' },        // nome de exibição / carteira (chave-ponte com leads.cliente)
      { name: 'cnpj', type: 'text' },
      { name: 'razaoSocial', type: 'text' },
      { name: 'nomeFantasia', type: 'text' },
      { name: 'ie', type: 'text' },             // inscrição estadual (ou ISENTO)
      { name: 'im', type: 'text' },             // inscrição municipal (NFS-e)
      { name: 'logradouro', type: 'text' },
      { name: 'numero', type: 'text' },
      { name: 'complemento', type: 'text' },
      { name: 'bairro', type: 'text' },
      { name: 'municipio', type: 'text' },
      { name: 'codigoIbge', type: 'text' },     // código IBGE do município (NFS-e/OMIE)
      { name: 'uf', type: 'text' },
      { name: 'cep', type: 'text' },
      { name: 'cnae', type: 'text' },
      { name: 'regimeTributario', type: 'text' },
      { name: 'grauRisco', type: 'text' },      // NR-4 (1-4)
      { name: 'condPagamento', type: 'text' },  // condição de pagamento padrão
      { name: 'target', type: 'text' },         // TARGET / NÃO TARGET
      { name: 'segmento', type: 'text' },
      { name: 'obs', type: 'text' },
      { name: 'alteradoEm', type: 'text' },
      { name: 'alteradoPor', type: 'text' },
    ],
  },
  contatos: {
    displayName: 'Contatos_Comercial',
    titleFrom: 'nome',
    columns: [
      { name: 'nome', type: 'text' },
      { name: 'sobrenome', type: 'text' },
      { name: 'telefone', type: 'text' },       // WhatsApp
      { name: 'email', type: 'text' },          // corporativo
      { name: 'empresaId', type: 'text' },      // vínculo (id do item Empresa)
      { name: 'empresaNome', type: 'text' },    // denormalizado p/ exibição/busca
      { name: 'tipo', type: 'text' },           // Técnico / Comercial
      { name: 'cargo', type: 'text' },
      { name: 'obs', type: 'text' },
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
