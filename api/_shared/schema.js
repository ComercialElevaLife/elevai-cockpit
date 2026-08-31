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
      // 31/08/2026 — `long:true` = coluna SharePoint criada/migrada como texto MULTI-LINHA, sem o
      // limite de 255 caracteres do texto de linha única padrão. Achado depois que o Léo reportou
      // "Falha ao salvar — revertido" ao mexer 2x em sub-etapa: historicoJson (JSON, cresce a cada
      // evento) passava de 255 chars já na 2ª entrada e o PATCH era rejeitado pelo Graph/SharePoint
      // (silenciosamente revertido no Cockpit). tarefasJson/servicosJson têm o mesmo risco
      // estrutural (também guardam JSON que cresce), marcados aqui por precaução.
      { name: 'tarefasJson', type: 'text', long: true },   // tarefas do lead (JSON) — persistencia da aba Tarefas/CRM
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
      { name: 'empresaId', type: 'text' },       // Fase C — vínculo com Empresas_Comercial (id do item)
      { name: 'servicosJson', type: 'text', long: true },    // Fase C — múltiplos serviços da oportunidade (JSON: cód/escopo/tipo/mensal/meses/valor)
      // 21/08/2026 — quando a tela de Cadastro cria N oportunidades de uma vez (um clique, "+
      // adicionar serviço", mesma empresa/contato/consultor), todas ganham o MESMO grupoNegociacaoId
      // pra sinalizar "vieram do mesmo lançamento" — cada uma continua sendo uma oportunidade normal,
      // independente, com seu próprio status/valor no Kanban (não muda o pipeline de status).
      { name: 'grupoNegociacaoId', type: 'text' },
      // 20/08/2026 — data OFICIAL da venda (YYYY-MM-DD), separada de alteradoEm (que o backend
      // sempre carimba com "agora" em TODO PATCH, então não serve pra guardar uma data corrigível).
      // Preenchida automaticamente quando o lead entra em VENDIDA; editável manualmente depois
      // (drawer do Kanban), pra corrigir histórico lançado com data errada.
      { name: 'dataVenda', type: 'text' },
      // 25/08/2026 — "inativar" oportunidade (Léo): backlog — nem perdida nem pausada, some do
      // Kanban/Painel por padrão (não entra em indicador nenhum) mas o registro continua existindo,
      // reversível a qualquer momento ("↩ Reativar" no drawer). SIM / '' (vazio = ativa, comportamento
      // de sempre). Não é um status novo do funil — é ortogonal ao `status`, que fica congelado como
      // estava no momento de inativar.
      { name: 'inativo', type: 'text' },
      // 31/08/2026 — sub-etapas DENTRO de EM NEGOCIAÇÃO (Rafael via Léo: "não está tendo clareza
      // do status das propostas em negociação"). Não é um novo status do funil (status/COLS
      // continuam intactos) — é ortogonal, só usado quando status==='EM NEGOCIAÇÃO'. Lista fixa
      // no frontend (SUBETAPAS): Apresentação Técnica | Escopo Técnico | Proposta | FUP |
      // Negociação | Repescagem (inspirado no funil do RD Station que o Léo trouxe de exemplo).
      { name: 'subEtapa', type: 'text' },
      // 31/08/2026 — histórico de eventos do lead (JSON: [{ts,texto,por}], mais recente primeiro,
      // limitado a 50 entradas). Registrado a partir de agora (criação, mudança de status, mudança
      // de sub-etapa, edição de dados comerciais) — não é retroativo, eventos anteriores a esta
      // data não existem na base. Mesmo padrão de tarefasJson (texto livre com JSON serializado).
      //
      // 31/08/2026 (correção) — a coluna nasceu `historicoJson` (linha única, limite de 255
      // chars), e a tentativa de MIGRAR essa coluna existente pra multi-linha via PATCH
      // (ensureColumns, ver graph.js) não resolveu — Léo testou de novo e bateu no mesmo erro.
      // O Graph/SharePoint não converte de forma confiável "Text" (linha única) em "Note"
      // (multi-linha) num campo já existente — são tipos internos diferentes, apesar de os dois
      // caírem sob o mesmo facet `text` na API. Solução: campo NOVO (`histEventosJson`), que já
      // nasce multi-linha desde a criação (nunca existiu como linha única). `historicoJson` foi
      // REMOVIDO da whitelist — fica órfão no SharePoint (só os testes do Léo, sem dado real).
      { name: 'histEventosJson', type: 'text', long: true },
      // 31/08/2026 — fluxo automático de FUP pós-proposta (Léo, playbook comercial): ao marcar
      // "Proposta? SIM", o lead vai pra EM NEGOCIAÇÃO + sub-etapa FUP e ganha a 1ª tarefa de FUP
      // automaticamente. fupSeq guarda o número do FUP atual (1, 2, 3...) — incrementado toda vez
      // que o usuário escolhe "Revisar" no prompt que aparece ao concluir uma tarefa de FUP.
      { name: 'fupSeq', type: 'number' },
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
