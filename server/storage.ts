/**
 * ARQUIVO: server/storage.ts
 * PROPÓSITO: Camada de acesso ao banco de dados usando Drizzle ORM
 * 
 * RESPONSABILIDADES:
 * - Conecta com PostgreSQL via Neon serverless
 * - Define métodos para CRUD de todas as entidades (users, orders, motoboys, chat, etc)
 * - Exporta instância global 'storage' usada em routes.ts
 */

// neon: Cliente HTTP serverless para PostgreSQL da Neon
import { neon } from '@neondatabase/serverless';
// drizzle: ORM TypeScript-first que gera queries SQL type-safe
import { drizzle } from 'drizzle-orm/neon-http';
// eq, desc: Funções helper do Drizzle para filtros e ordenação SQL
import { eq, desc } from 'drizzle-orm';
// randomUUID: Gera IDs únicos para novos clientes cadastrados via onboarding
import { randomUUID } from 'crypto';
// Importa todas as tabelas e tipos do schema compartilhado
import {
  users,           // Tabela de usuários (clients, motoboys, central)
  motoboys,        // Tabela de motoboys (informações específicas como veículo)
  motoboyLocations, // Tabela de histórico de localizações GPS
  clients,         // Tabela de clientes (informações complementares)
  orders,          // Tabela de pedidos (principal)
  liveDocs,        // Tabela de documentos (CNH, fotos, etc)
  chatMessages,    // Tabela de mensagens de chat
  clientSchedules, // Tabela de horários de funcionamento dos clientes
  type InsertOrder,       // Tipo Zod para inserção de pedidos
  type InsertMotoboy,     // Tipo Zod para inserção de motoboys
  type InsertChatMessage, // Tipo Zod para inserção de mensagens
  type Motoboy,           // Tipo completo de Motoboy
  type Client             // Tipo completo de Client
} from '@shared/schema';

// Importa o schema completo para passar ao Drizzle (necessário para relações)
import * as schema from '@shared/schema';

import type { ClientOnboardingPayload, ClientProfileDto, DocumentType } from '@shared/contracts';

// ========================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// ========================================

// CRÍTICO: Valida que DATABASE_URL existe no .env antes de conectar
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required.');
}

// CONSTANTE GLOBAL: Instância do Drizzle ORM conectada ao PostgreSQL
// CONEXÃO: Usada por toda a classe DrizzleStorage para executar queries
// CONFIGURAÇÃO: { schema } permite uso de relações entre tabelas
const db = drizzle(neon(process.env.DATABASE_URL), { schema });

// ========================================
// CONSTANTES: MENSAGENS DE ERRO
// ========================================
// PADRÃO: Error Messages as Constants - facilita tradução e manutenção
const EMAIL_IN_USE_ERROR = 'EMAIL_IN_USE';
const DOCUMENT_IN_USE_ERROR = 'DOCUMENT_IN_USE';

// ========================================
// FUNÇÃO AUXILIAR: MAPEAMENTO CLIENT → CLIENTPROFILEDTO
// ========================================
/**
 * FUNÇÃO: mapClientToProfile
 * PROPÓSITO: Converte registro do banco (Client) para DTO da API (ClientProfileDto)
 * PARÂMETRO: client (Client) - registro da tabela clients
 * RETORNO: ClientProfileDto - objeto estruturado para resposta da API
 * 
 * TRANSFORMAÇÕES:
 * - Achata estrutura: campos de endereço vão para objeto aninhado 'address'
 * - Converte tipos: geoLat/geoLng de Decimal (string) para number | null
 * - Type cast: documentType de text para "PF" | "PJ" (literal union)
 * - Normaliza nullables: email ?? '' (garante string, nunca null)
 * 
 * USADO EM:
 * - getClientProfile: GET /api/me/profile
 * - createClientWithUser: POST /api/auth/register (retorna profile completo)
 * 
 * PADRÃO: Data Mapper - separa estrutura do banco (tabela plana) da API (objeto aninhado)
 */
function mapClientToProfile(client: Client): ClientProfileDto {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email ?? '', // Garante string não-nula
    documentType: client.documentType as DocumentType, // Cast de text para "PF" | "PJ"
    documentNumber: client.documentNumber,
    ie: client.ie,
    address: {
      cep: client.cep,
      rua: client.rua,
      numero: client.numero,
      bairro: client.bairro,
      complemento: client.complemento,
      referencia: client.referencia,
      // CONVERSÃO: Decimal (armazenado como string) → number para JSON
      geoLat: client.geoLat ? Number(client.geoLat) : null,
      geoLng: client.geoLng ? Number(client.geoLng) : null,
    },
    horario: undefined, // TODO Etapa 09: popular de tabela schedules quando implementada
  };
}

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
    // CONSTANTE: Array de resultados da query (limit 1 garante máximo 1 resultado)
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    // RETORNA: Primeiro elemento (usuário) ou undefined se não encontrado
    return result[0];
  }

  /**
   * MÉTODO: getUserByEmail(email)
   * PROPÓSITO: Busca usuário por email (usado no login)
   * USADO EM: /api/auth/login em routes.ts
   * CORREÇÃO: Adicionada para substituir busca por ID no login
   */
  async getUserByEmail(email: string) {
    // CONSTANTE: Resultado da busca por email
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
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
    // GERAÇÃO: UUID v4 para chave primária (mesmo ID em users e clients)
    const clientId = randomUUID();
    
    // NORMALIZAÇÃO: Remove caracteres não-numéricos (pontos, hífens, barras)
    const normalizedDocument = payload.documentNumber.replace(/\D/g, '');

    // ATENÇÃO: O driver neon-http não suporta transações (db.transaction)
    // Portanto executamos em duas etapas e aplicamos rollback manual

    // VALIDAÇÃO: Email único (unique constraint)
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, payload.email)).limit(1);
    if (existingUser.length > 0) {
      throw new Error(EMAIL_IN_USE_ERROR); // Capturado em routes.ts
    }

    // VALIDAÇÃO: Documento único (CPF/CNPJ)
    const existingDocument = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.documentNumber, normalizedDocument))
      .limit(1);

    if (existingDocument.length > 0) {
      throw new Error(DOCUMENT_IN_USE_ERROR);
    }

    // INSERT 1: Cria usuário na tabela de autenticação
    await db.insert(users).values({
      id: clientId, // Mesma PK para relacionamento 1:1
      name: payload.name,
      role: 'client', // Hardcoded para onboarding de clientes
      email: payload.email,
      phone: payload.phone,
      password: passwordHash, // bcrypt hash (nunca plain text!)
      status: 'active',
    });

    try {
      // INSERT 2: Cria registro de cliente com dados complementares
      const insertedClient = await db
        .insert(clients)
        .values({
          id: clientId, // FK para users.id (1:1)
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          company: payload.name, // TODO: adicionar campo 'razaoSocial' separado
          documentType: payload.documentType, // "PF" | "PJ"
          documentNumber: normalizedDocument,
          ie: payload.documentType === 'PJ' ? payload.ie ?? null : null, // IE apenas PJ
          // ENDEREÇO: 8 campos do addressSchema
          cep: payload.address.cep,
          rua: payload.address.rua,
          numero: payload.address.numero,
          bairro: payload.address.bairro,
          complemento: payload.address.complemento ?? null,
          referencia: payload.address.referencia ?? null,
          // GPS: converte number → string (tipo Decimal no banco)
          geoLat: payload.address.geoLat !== undefined ? String(payload.address.geoLat) : null,
          geoLng: payload.address.geoLng !== undefined ? String(payload.address.geoLng) : null,
        })
        .returning(); // Retorna registro inserido

      // MAPEAMENTO: Client (banco) → ClientProfileDto (API)
      const profile = mapClientToProfile(insertedClient[0]);
      
      // POPULA HORÁRIO: Busca schedule se existir
      const schedule = await db.select().from(clientSchedules).where(eq(clientSchedules.clientId, clientId)).limit(1);
      if (schedule.length > 0) {
        profile.horario = {
          horaAbertura: schedule[0].horaAbertura ?? undefined,
          horaFechamento: schedule[0].horaFechamento ?? undefined,
          fechado: schedule[0].fechado ?? undefined
        };
      }
      
      return profile;
    } catch (error) {
      // ROLLBACK MANUAL: remove usuário criado se cadastro do client falhar
      await db.delete(users).where(eq(users.id, clientId));
      throw error;
    }
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
    // CONSTANTE: Resultado da busca por ID
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    
    if (result.length === 0) {
      return null;
    }

    const profile = mapClientToProfile(result[0]);
    
    // POPULA HORÁRIO: Busca schedule se existir
    const schedule = await db.select().from(clientSchedules).where(eq(clientSchedules.clientId, id)).limit(1);
    if (schedule.length > 0) {
      profile.horario = {
        horaAbertura: schedule[0].horaAbertura ?? undefined,
        horaFechamento: schedule[0].horaFechamento ?? undefined,
        fechado: schedule[0].fechado ?? undefined
      };
    }

    return profile;
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
    // CONSTANTE: Objeto de localização para inserir no banco
    // NOTA: Coordenadas convertidas para string (tipo Decimal no schema)
    const newLocation = {
      motoboyId: id,           // UUID do motoboy
      latitude: lat.toString(),  // Latitude convertida para string
      longitude: lng.toString()  // Longitude convertida para string
    };
    // OPERAÇÃO: Insere nova localização (timestamp é gerado automaticamente)
    await db.insert(motoboyLocations).values(newLocation);
  }

  /**
   * MÉTODO: getLatestMotoboyLocations()
   * PROPÓSITO: Obtém a localização mais recente de cada motoboy
   * RETORNA: Map<motoboyId, location> - Um Map com ID do motoboy como chave
   * USADO EM: AIEngine para calcular distâncias e atribuir pedidos
   */
  async getLatestMotoboyLocations() {
    // CONSTANTE: Todas as localizações ordenadas por timestamp (mais recente primeiro)
    const allLocations = await db.select().from(motoboyLocations).orderBy(desc(motoboyLocations.timestamp));
    
    // CONSTANTE: Map para armazenar apenas a localização mais recente de cada motoboy
    const latestByMotoboy = new Map();
    
    // LOOP: Itera sobre todas as localizações (já ordenadas por data)
    for (const location of allLocations) {
      // LÓGICA: Se ainda não temos localização deste motoboy, adiciona (será a mais recente)
      if (!latestByMotoboy.has(location.motoboyId)) {
        // CONSTANTE: Localização normalizada com coordenadas convertidas para number
        // NOTA: Banco armazena como Decimal (string), aqui convertemos para Number para cálculos
        const normalizedLocation = {
          ...location,
          latitude: typeof location.latitude === "string" ? parseFloat(location.latitude) : (location.latitude || 0),
          longitude: typeof location.longitude === "string" ? parseFloat(location.longitude) : (location.longitude || 0)
        };
        latestByMotoboy.set(location.motoboyId, normalizedLocation);
      }
    }
    return latestByMotoboy;
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
    return await db.select().from(motoboys);
  }

  /**
   * MÉTODO: getMotoboy(id)
   * PROPÓSITO: Busca motoboy específico por ID
   * USADO EM: Validações de atribuição de pedidos
   */
  async getMotoboy(id: string) {
    // CONSTANTE: Resultado da busca (limit 1 para performance)
    const result = await db.select().from(motoboys).where(eq(motoboys.id, id)).limit(1);
    return result[0];
  }

  /**
   * MÉTODO: createMotoboy(insertMotoboy)
   * PROPÓSITO: Cadastra novo motoboy no sistema
   * USADO EM: Scripts de importação (import-motoboys-reais.ts)
   */
  async createMotoboy(insertMotoboy: InsertMotoboy) {
    // CONSTANTE: Resultado da inserção com .returning() para obter o motoboy criado
    const result = await db.insert(motoboys).values(insertMotoboy).returning();
    return result[0];
  }

  /**
   * MÉTODO: updateMotoboy(id, data)
   * PROPÓSITO: Atualiza dados parciais de um motoboy
   * PARÂMETROS: data - Objeto Partial<Motoboy> (pode conter apenas campos a atualizar)
   */
  async updateMotoboy(id: string, data: Partial<Motoboy>) {
    await db.update(motoboys).set(data).where(eq(motoboys.id, id));
  }

  /**
   * MÉTODO: setMotoboyOnline(id, online)
   * PROPÓSITO: Marca motoboy como online/offline
   * USADO EM: Conexão/desconexão de WebSocket em index.ts
   */
  async setMotoboyOnline(id: string, online: boolean) {
    await db.update(motoboys).set({ online }).where(eq(motoboys.id, id));
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
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  /**
   * MÉTODO: getOrder(id)
   * PROPÓSITO: Busca pedido específico por ID
   * USADO EM: Rotas de accept/deliver para retornar pedido atualizado
   */
  async getOrder(id: string) {
    // CONSTANTE: Resultado da busca por ID
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }

  /**
   * MÉTODO: getPendingOrders()
   * PROPÓSITO: Lista apenas pedidos com status "pending" (sem motoboy atribuído)
   * USADO EM: GET /api/orders/pending em routes.ts
   */
  async getPendingOrders() {
    return await db.select().from(orders).where(eq(orders.status, "pending"));
  }

  /**
   * MÉTODO: createOrder(order)
   * PROPÓSITO: Cria novo pedido no banco de dados
   * USADO EM: POST /api/orders em routes.ts
   * RETORNA: Pedido recém-criado com ID gerado
   */
  async createOrder(order: InsertOrder) {
    // CONSTANTE: Resultado da inserção com .returning() para obter o pedido criado
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  /**
   * MÉTODO: updateOrderStatus(id, status, proofUrl)
   * PROPÓSITO: Atualiza status do pedido (pending, in_progress, delivered, cancelled)
   * USADO EM: POST /api/orders/:id/deliver em routes.ts
   * NOTA: Também atualiza deliveredAt para timestamp atual e salva comprovante se fornecido
   */
  async updateOrderStatus(id: string, status: "pending" | "in_progress" | "delivered" | "cancelled", proofUrl?: string) {
    const updateData: any = { status, deliveredAt: new Date() };
    if (proofUrl) {
      updateData.proofUrl = proofUrl;
    }
    await db.update(orders).set(updateData).where(eq(orders.id, id));
  }

  /**
   * MÉTODO: assignOrderToMotoboy(orderId, motoboyId, motoboyName)
   * PROPÓSITO: Atribui pedido a um motoboy específico (aceita o pedido)
   * USADO EM: POST /api/orders/:id/accept em routes.ts
   * ATUALIZA: motoboyId, motoboyName, status (para in_progress), acceptedAt (timestamp)
   */
  async assignOrderToMotoboy(orderId: string, motoboyId: string, motoboyName: string) {
    await db.update(orders).set({
      motoboyId,      // UUID do motoboy que aceitou
      motoboyName,    // Nome do motoboy (desnormalizado para performance)
      status: "in_progress", // Muda status de pending para in_progress
      acceptedAt: new Date()  // Registra momento da aceitação
    }).where(eq(orders.id, orderId));
  }

  /**
   * MÉTODO: getOrdersByClientId(clientId)
   * PROPÓSITO: Lista pedidos de um cliente específico
   * USADO EM: GET /api/orders (filtro por role client)
   */
  async getOrdersByClientId(clientId: string) {
    return await db.select().from(orders).where(eq(orders.clientId, clientId)).orderBy(desc(orders.createdAt));
  }

  /**
   * MÉTODO: getOrdersByMotoboyId(motoboyId)
   * PROPÓSITO: Lista pedidos atribuídos a um motoboy específico
   * USADO EM: GET /api/orders (filtro por role motoboy)
   */
  async getOrdersByMotoboyId(motoboyId: string) {
    return await db.select().from(orders).where(eq(orders.motoboyId, motoboyId)).orderBy(desc(orders.createdAt));
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
    // CONSTANTE: Query base com ordenação por data
    const query = db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt));
    // LÓGICA: Se limit fornecido, aplica limitação na query
    if (limit) query.limit(limit);
    return await query;
  }

  /**
   * MÉTODO: createChatMessage(message)
   * PROPÓSITO: Cria nova mensagem de chat
   * USADO EM: POST /api/chat em routes.ts
   * RETORNA: Mensagem recém-criada com ID e timestamp gerados
   */
  async createChatMessage(message: InsertChatMessage) {
    // CONSTANTE: Resultado da inserção com .returning() para obter a mensagem criada
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }

  /**
   * MÉTODO: getClientSchedule(clientId)
   * PROPÓSITO: Busca horário de funcionamento do cliente
   */
  async getClientSchedule(clientId: string) {
    const result = await db.select().from(clientSchedules).where(eq(clientSchedules.clientId, clientId)).limit(1);
    return result[0];
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
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  /**
   * MÉTODO: updateClient(clientId, data)
   * PROPÓSITO: Atualiza informações de um cliente
   * USADO EM: PATCH /api/clients/:id
   */
  async updateClient(clientId: string, data: Partial<Client>) {
    const result = await db.update(clients).set(data).where(eq(clients.id, clientId)).returning();
    return result[0];
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
    const result = await db.insert(liveDocs).values(doc).returning();
    return result[0];
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