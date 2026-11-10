// /api/campanhas — contatos de prospecção (tela Campanhas). Lista própria no SharePoint (Campanhas_Comercial),
// separada de Contatos/Leads de propósito: só vira lead no Kanban quando o usuário promove (botão na tela).
module.exports = require('../_shared/crud').makeHandler('campanhas');
