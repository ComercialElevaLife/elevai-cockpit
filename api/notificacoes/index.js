// /api/notificacoes — sino de notificações do Cockpit.
// Duas origens gravam nesta mesma lista (Notificacoes_Comercial):
//  1) o scan periódico de e-mail/Teams (tipo:'aprovacao') — cria um item pendente por achado de
//     palavra-chave, pro Léo aprovar/atualizar/ignorar antes de qualquer coisa virar lead de verdade;
//  2) o deploy do próprio Cockpit (tipo:'sistema') — um item por push, vira o feed de "novidades".
// CRUD genérico (mesmo padrão de leads/empresas/contatos) via makeHandler — GET/POST/PATCH/DELETE.
module.exports = require('../_shared/crud').makeHandler('notificacoes');
