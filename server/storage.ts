/**
 * ARQUIVO: server/storage.ts
 * PROPÓSITO: Camada de acesso ao banco de dados usando Drizzle ORM
 * 
 * RESPONSABILIDADES:
 * - Conecta com PostgreSQL via Neon serverless
 * - Define métodos para CRUD de todas as entidades (users, orders, motoboys, chat, etc)
 * - Exporta instância global 'storage' usada em routes.ts
 */

// eq, desc, and: Funções helper do Drizzle para filtros e ordenação SQL
import { eq, desc, and, inArray } from 'drizzle-orm';
// Importa todas as tabelas e tipos do schema compartilhado
import {
  users,           // Tabela de usuários (clients, motoboys, central)
  liveDocs,        // Tabela de documentos (CNH, fotos, etc)
  motoboySchedules, // Tabela de disponibilidade semanal dos motoboys
  type InsertChatMessage, // Tipo Zod para inserção de mensagens
  type InsertClientSchedule, // Tipo Zod para inserção de schedules de clientes
  type Client             // Tipo completo de Client
} from '@shared/schema';
import type { ClientOnboardingPayload, ClientProfileDto } from '@shared/contracts';
import { db } from './storage/db.js';
import { shapeChatMessage } from './storage/utils.js';
import { createClientWithUser, createMotoboyWithUser, getAllUsers, getClientProfile, getUser, getUserByEmail } from './storage/users.js';
import {
  createMotoboy,
  deleteMotoboySchedule,
  getAllMotoboys,
  getLatestMotoboyLocations,
  getMotoboy,
  getMotoboySchedules,
  setMotoboyOnline,
  updateMotoboy,
  updateMotoboyLocation,
  updateMotoboyOnlineStatus,
  upsertMotoboySchedule,
} from './storage/motoboys.js';
import {
  assignOrderToMotoboy,
  createOrder,
  getAllOrders,
  getOrder,
  getOrdersByClientId,
  getOrdersByMotoboyId,
  getPendingOrders,
  updateOrderStatus,
} from './storage/orders.js';
import { createChatMessage, getChatMessages } from './storage/chat.js';
import {
  getAllClients,
  getAllClientSchedules,
  getClientSchedule,
  updateClient,
} from './storage/clients.js';
import { createLiveDoc } from './storage/uploads.js';
import logger from './logger.js';

// Helper utilities and database client are provided via modular storage submodules

// ========================================
// CLASSE PRINCIPAL: DrizzleStorage
// ========================================
/**
 * CLASSE: DrizzleStorage
 * PROPÓSITO: Encapsula todas as operações de banco de dados em métodos reutilizáveis
 * PADRÃO: Repository Pattern - separa lógica de persistência da lógica de negócio
 * NOTA: Esta classe é instanciada uma única vez e exportada como 'storage'
 */
class DrizzleStorage /* implements IStorage */ {
  
  // ========================================
  // MÉTODOS: USUÁRIOS (AUTENTICAÇÃO)
  // ========================================

  /**
   * MÉTODO: getUser(id)
   * PROPÓSITO: Busca usuário por ID (UUID)
   * USADO EM: Validação de token JWT em middleware/auth.ts
   */
  async getUser(id: string) {
    return getUser(id);
  }

  /**
   * MÉTODO: getUserByEmail(email)
   * PROPÓSITO: Busca usuário por email (usado no login)
   * USADO EM: /api/auth/login em routes.ts
   * CORREÇÃO: Adicionada para substituir busca por ID no login
   */
  async getUserByEmail(email: string) {
    return getUserByEmail(email);
  }

  /**
   * MÉTODO: getAllUsers() - STEP 4
   * PROPÓSITO: Lista todos os usuários do sistema
   * USADO EM: GET /api/users (central dashboard)
   */
  async getAllUsers() {
    return getAllUsers();
  }

  /**
   * MÉTODO: createClientWithUser(payload, passwordHash)
   * PROPÓSITO: Cadastra cliente completo (user + client) em transação atômica (Etapa 05)
   * PARÂMETROS:
   *   - payload: ClientOnboardingPayload (sem password, já removido em routes.ts)
   *   - passwordHash: string (bcrypt hash gerado em routes.ts)
   * RETORNO: ClientProfileDto (perfil completo do cliente criado)
   * 
   * FLUXO TRANSACIONAL:
   * 1. Valida email único (lança EMAIL_IN_USE se duplicado)
   * 2. Normaliza documento (remove máscaras) e valida unicidade (lança DOCUMENT_IN_USE)
   * 3. Insere registro em users (tabela de autenticação)
   * 4. Insere registro em clients (tabela de dados complementares)
   * 5. Retorna ClientProfileDto mapeado
   * 
   * GARANTIA TRANSACIONAL:
   * - db.transaction() garante commit ou rollback completo
   * - Se qualquer passo falhar, nenhum registro é criado
   * - Previne inconsistências (user sem client ou vice-versa)
   * 
   * PADRÃO: Unit of Work - múltiplas operações executadas como unidade atômica
   */
  async createClientWithUser(payload: Omit<ClientOnboardingPayload, 'password'>, passwordHash: string): Promise<ClientProfileDto> {
    return createClientWithUser(payload, passwordHash);
  }

  /**
   * MÉTODO: createMotoboyWithUser(payload, passwordHash)
   * PROPÓSITO: Criar motoboy com usuário em transação atômica
   * PARÂMETROS:
   *   - payload: Dados do motoboy (nome, email, phone, cpf, placa, pix)
   *   - passwordHash: Senha já hasheada com bcrypt
   * RETORNO: Objeto com dados do motoboy criado
   */
  async createMotoboyWithUser(
    payload: { name: string; email: string; phone: string; cpf: string; placa?: string; pix?: string },
    passwordHash: string
  ) {
    return createMotoboyWithUser(payload, passwordHash);
  }

  /**
   * MÉTODO: getClientProfile(id)
   * PROPÓSITO: Busca perfil completo do cliente (Etapa 06 - auto-fill coleta)
   * PARÂMETRO: id (string) - UUID do cliente (PK da tabela clients)
   * RETORNO: ClientProfileDto | null
   * 
   * USADO EM:
   * - GET /api/me/profile (retorna dados do cliente logado)
   * - POST /api/orders (busca endereço para auto-fill da coleta)
   * 
   * TRANSFORMAÇÃO: Usa mapClientToProfile para converter Client → ClientProfileDto
   */
  async getClientProfile(id: string): Promise<ClientProfileDto | null> {
    return getClientProfile(id);
  }


  // ========================================
  // MÉTODOS: LOCALIZAÇÃO GPS DE MOTOBOYS
  // ========================================

  /**
   * MÉTODO: updateMotoboyLocation(id, lat, lng)
   * PROPÓSITO: Registra nova localização GPS do motoboy no histórico
   * USADO EM: POST /api/motoboys/:id/location em routes.ts
   * NOTA: Cria novo registro (INSERT) em vez de atualizar (UPDATE) para manter histórico
   */
  async updateMotoboyLocation(id: string, lat: number, lng: number) {
    return updateMotoboyLocation(id, lat, lng);
  }

  /**
   * MÉTODO: getLatestMotoboyLocations()
   * PROPÓSITO: Obtém a localização mais recente de cada motoboy
   * RETORNA: Map<motoboyId, location> - Um Map com ID do motoboy como chave
   * USADO EM: AIEngine para calcular distâncias e atribuir pedidos
   */
  async getLatestMotoboyLocations() {
    return getLatestMotoboyLocations();
  }

  // ========================================
  // MÉTODOS: GERENCIAMENTO DE MOTOBOYS
  // ========================================

  /**
   * MÉTODO: getAllMotoboys()
   * PROPÓSITO: Lista todos os motoboys cadastrados
   * USADO EM: GET /api/motoboys em routes.ts (apenas central)
   */
  async getAllMotoboys() {
    return getAllMotoboys();
  }

  /**
   * MÉTODO: getMotoboy(id)
   * PROPÓSITO: Busca motoboy específico por ID
   * USADO EM: Validações de atribuição de pedidos
   */
  async getMotoboy(id: string) {
    return getMotoboy(id);
  }

  /**
   * MÉTODO: updateMotoboyOnlineStatus(id, online)
   * PROPÓSITO: Atualiza status online/offline do motoboy
   * USADO EM: WebSocket connection/disconnection no index.ts
   */
  async updateMotoboyOnlineStatus(id: string, online: boolean) {
    return updateMotoboyOnlineStatus(id, online);
  }

  /**
   * MÉTODO: createMotoboy(insertMotoboy)
   * PROPÓSITO: Cadastra novo motoboy no sistema
   * USADO EM: Scripts de importação (import-motoboys-reais.ts)
   */
  async createMotoboy(insertMotoboy: InsertMotoboy) {
    return createMotoboy(insertMotoboy);
  }

  /**
   * MÉTODO: updateMotoboy(id, data)
   * PROPÓSITO: Atualiza dados parciais de um motoboy
   * PARÂMETROS: data - Objeto Partial<Motoboy> (pode conter apenas campos a atualizar)
   */
  async updateMotoboy(id: string, data: Partial<Motoboy>) {
    return updateMotoboy(id, data);
  }

  /**
   * MÉTODO: setMotoboyOnline(id, online)
   * PROPÓSITO: Marca motoboy como online/offline
   * USADO EM: Conexão/desconexão de WebSocket em index.ts
   */
  async setMotoboyOnline(id: string, online: boolean) {
    return setMotoboyOnline(id, online);
  }

  // ========================================
  // MÉTODOS: GERENCIAMENTO DE PEDIDOS
  // ========================================

  /**
   * MÉTODO: getAllOrders()
   * PROPÓSITO: Lista todos os pedidos ordenados por data de criação (mais recentes primeiro)
   * USADO EM: GET /api/orders em routes.ts
   */
  async getAllOrders() {
    return getAllOrders();
  }

  /**
   * MÉTODO: getOrder(id)
   * PROPÓSITO: Busca pedido específico por ID
   * USADO EM: Rotas de accept/deliver para retornar pedido atualizado
   */
  async getOrder(id: string) {
    return getOrder(id);
  }

  /**
   * MÉTODO: getPendingOrders()
   * PROPÓSITO: Lista apenas pedidos com status "pending" (sem motoboy atribuído)
   * USADO EM: GET /api/orders/pending em routes.ts
   */
  async getPendingOrders() {
    return getPendingOrders();
  }

  /**
   * MÉTODO: createOrder(order)
   * PROPÓSITO: Cria novo pedido no banco de dados
   * USADO EM: POST /api/orders em routes.ts
   * RETORNA: Pedido recém-criado com ID gerado
   */
  async createOrder(order: InsertOrder) {
    return createOrder(order);
  }

  /**
   * MÉTODO: updateOrderStatus(id, status, proofUrl)
   * PROPÓSITO: Atualiza status do pedido (pending, in_progress, delivered, cancelled)
   * USADO EM: POST /api/orders/:id/deliver em routes.ts
   * NOTA: Também atualiza deliveredAt para timestamp atual e salva comprovante se fornecido
   */
  async updateOrderStatus(id: string, status: "pending" | "in_progress" | "delivered" | "cancelled", proofUrl?: string) {
    return updateOrderStatus(id, status, proofUrl);
  }

  /**
   * MÉTODO: assignOrderToMotoboy(orderId, motoboyId, motoboyName)
   * PROPÓSITO: Atribui pedido a um motoboy específico (aceita o pedido)
   * USADO EM: POST /api/orders/:id/accept em routes.ts
   * ATUALIZA: motoboyId, motoboyName, status (para in_progress), acceptedAt (timestamp)
   */
  async assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string) {
    return assignOrderToMotoboy(orderId, motoboyId, motoboyName);
  }

  /**
   * MÉTODO: getOrdersByClientId(clientId)
   * PROPÓSITO: Lista pedidos de um cliente específico
   * USADO EM: GET /api/orders (filtro por role client)
   */
  async getOrdersByClientId(clientId: string) {
    return getOrdersByClientId(clientId);
  }

  /**
   * MÉTODO: getOrdersByMotoboyId(motoboyId)
   * PROPÓSITO: Lista pedidos atribuídos a um motoboy específico
   * USADO EM: GET /api/orders (filtro por role motoboy)
   */
  async getOrdersByMotoboyId(motoboyId: string) {
    return getOrdersByMotoboyId(motoboyId);
  }

  // ========================================
  // MÉTODOS: CHAT E MENSAGENS
  // ========================================

  /**
   * MÉTODO: getChatMessages(limit?)
   * PROPÓSITO: Obtém mensagens de chat ordenadas por data (mais recentes primeiro)
   * PARÂMETROS: limit (opcional) - Limita número de mensagens retornadas
   * USADO EM: GET /api/chat em routes.ts
   */
  async getChatMessages(limit?: number) {
    return getChatMessages(limit);
  }

  /**
   * MÉTODO: createChatMessage(message)
   * PROPÓSITO: Cria nova mensagem de chat
   * USADO EM: POST /api/chat em routes.ts
   * RETORNA: Mensagem recém-criada com ID e timestamp gerados
   */
  async createChatMessage(message: any) {
    return createChatMessage(message);
  }

  /**
   * MÉTODO: getClientSchedule(clientId)
   * PROPÓSITO: Busca horários de funcionamento do cliente (todos os dias)
   * RETORNA: Array de schedules com diaSemana, horários e status fechado
   */
  async getClientSchedule(clientId: string) {
    return getClientSchedule(clientId);
  }

  /**
   * MÉTODO: getMotoboySchedules(motoboyId)
   * PROPÓSITO: Busca disponibilidade semanal do motoboy
   * USADO EM: GET /api/motoboys/:id/schedules
   * RETORNA: Array de schedules com diaSemana e turnos (manha/tarde/noite)
   */
  async getMotoboySchedules(motoboyId: string) {
    return getMotoboySchedules(motoboyId);
  }

  /**
   * MÉTODO: upsertMotoboySchedule(motoboyId, diaSemana, shifts)
   * PROPÓSITO: Cria ou atualiza disponibilidade para um dia específico
   * USADO EM: POST /api/motoboys/:id/schedules
   * LÓGICA: Delete existing + Insert new (simula UPSERT)
   */
  async upsertMotoboySchedule(
    motoboyId: string, 
    diaSemana: number, 
    turnoManha: boolean, 
    turnoTarde: boolean, 
    turnoNoite: boolean
  ) {
    return upsertMotoboySchedule(motoboyId, diaSemana, turnoManha, turnoTarde, turnoNoite);
  }

  /**
   * MÉTODO: deleteMotoboySchedule(id)
   * PROPÓSITO: Remove entrada de disponibilidade específica
   * USADO EM: DELETE /api/motoboy-schedules/:id
   */
  async deleteMotoboySchedule(id: string) {
    return deleteMotoboySchedule(id);
  }

  // ========================================
  // MÉTODOS: GESTÃO DE CLIENTES (CENTRAL)
  // ========================================

  /**
   * MÉTODO: getAllClients()
   * PROPÓSITO: Lista todos os clientes cadastrados (para painel Central)
   * USADO EM: GET /api/clients
   */
  async getAllClients() {
    return getAllClients();
  }

  /**
   * MÉTODO: updateClient(clientId, data)
   * PROPÓSITO: Atualiza informações de um cliente
   * USADO EM: PATCH /api/clients/:id
   */
  async updateClient(clientId: string, data: Partial<Client>) {
    return updateClient(clientId, data);
  }

  // ========================================
  // MÉTODOS: GESTÃO DE USUÁRIOS
  // ========================================

  /**
   * MÉTODO: updateUser(userId, data)
   * PROPÓSITO: Atualiza dados de usuário (nome, telefone, senha)
   * USADO EM: PATCH /api/users/:id
   */
  async updateUser(userId: string, data: Partial<typeof users.$inferSelect>) {
    const result = await db.update(users).set(data).where(eq(users.id, userId)).returning();
    return result[0];
  }

  /**
   * MÉTODO: createLiveDoc(doc)
   * PROPÓSITO: Registra um novo documento/foto no banco
   * USADO EM: POST /api/upload/live-doc
   */
  async createLiveDoc(doc: typeof liveDocs.$inferInsert) {
    return createLiveDoc(doc);
  }

  /**
   * MÉTODO: upsertClientSchedule(data)
   * PROPÓSITO: Cria horário de funcionamento do cliente
   * USADO EM: POST /api/clients/:id/schedules
   */
  async upsertClientSchedule(data: {
    clientId: string;
    diaSemana: number;
    horaAbertura: string | null;
    horaFechamento: string | null;
    fechado: boolean;
  }) {
    return upsertClientSchedule(data);
  }

  /**
   * MÉTODO: deleteClientSchedule(id)
   * PROPÓSITO: Remove horário de funcionamento específico
   * USADO EM: POST /api/clients/:id/schedules (delete before insert)
   */
  async deleteClientSchedule(id: string) {
    return deleteClientSchedule(id);
  }

  /**
   * MÉTODO: getAllClientSchedules()
   * PROPÓSITO: Busca TODOS os horários de TODOS os clientes de uma vez
   * USADO EM: GET /api/schedules/all-clients (otimização para central dashboard)
   * RETORNA: Array completo de schedules com clientId
   */
  async getAllClientSchedules() {
    return getAllClientSchedules();
  }

  /**
   * MÉTODO: getAllMotoboySchedules()
   * PROPÓSITO: Busca TODOS os horários de TODOS os motoboys de uma vez
   * USADO EM: GET /api/schedules/all-motoboys (análise operacional)
   * RETORNA: Array completo de schedules com motoboyId e turnos
   */
  async getAllMotoboySchedules() {
    return await db.select().from(motoboySchedules).orderBy(motoboySchedules.motoboyId, motoboySchedules.diaSemana);
  }
}

// ========================================
// EXPORTAÇÃO DA INSTÂNCIA SINGLETON
// ========================================

/**
 * CONSTANTE EXPORTADA: storage
 * PROPÓSITO: Instância única (singleton) da classe DrizzleStorage
 * PADRÃO: Singleton - garante que todos os módulos usem a mesma conexão ao banco
 * USADO EM: server/routes.ts (em todas as rotas da API)
 * NOTA: Esta é a principal interface de acesso ao banco de dados em todo o projeto
 */
export const storage = new DrizzleStorage();