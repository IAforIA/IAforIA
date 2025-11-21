/**
 * ARQUIVO: shared/schema.ts
 * PROPÓSITO: Define todas as tabelas do banco de dados usando Drizzle ORM
 * 
 * RESPONSABILIDADES:
 * - Esquemas das tabelas PostgreSQL (users, motoboys, orders, chat, etc)
 * - Tipos TypeScript gerados automaticamente ($inferSelect)
 * - Schemas de validação Zod para inserção (createInsertSchema)
 * 
 * TABELAS:
 * - users: Usuários (clientes, motoboys, central)
 * - motoboys: Motoboys (placa, CPF, taxa)
 * - motoboyLocations: Histórico GPS
 * - clients: Clientes corporativos
 * - orders: Pedidos de entrega
 * - liveDocs: Documentos/fotos
 * - chatMessages: Chat em tempo real
 * - motoboySchedules/clientSchedules: Agendamentos
 */

// sql: Helper do Drizzle para SQL raw (ex: gen_random_uuid())
import { sql } from "drizzle-orm";
// Tipos de colunas PostgreSQL do Drizzle
import { pgTable, text, varchar, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
// createInsertSchema: Gera schema Zod automaticamente da definição Drizzle
import { createInsertSchema } from "drizzle-zod";
// z: Biblioteca Zod para validação de dados em runtime
import { z } from "zod";
import { UserRole } from './enums';

// ========================================
// TABELA: USERS (USUÁRIOS DO SISTEMA)
// ========================================
/**
 * TABELA EXPORTADA: users
 * PROPÓSITO: Armazena todos os usuários do sistema (clientes, motoboys, central)
 * USADO EM: Autenticação (storage.getUserByEmail em routes.ts)
 * 
 * CAMPOS:
 *   - id: VARCHAR primary key (UUID)
 *   - name: TEXT nome completo
 *   - role: TEXT papel ('client', 'motoboy', 'central')
 *   - phone: TEXT telefone (opcional)
 *   - email: TEXT email (usado no login)
 *   - password: TEXT hash bcrypt da senha
 *   - status: TEXT status ('active', 'inactive') default 'active'
 *   - createdAt: TIMESTAMP data de criação
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // UUID gerado no script de import
  name: text("name").notNull(),   // Nome de exibição
  role: text("role").notNull().$type<UserRole>(),   // Controle de acesso (RBAC)
  phone: text("phone"),            // Telefone (opcional)
  email: text("email"),            // Email para login
  password: text("password").notNull(), // Hash bcrypt (NUNCA senha plana!)
  status: text("status").notNull().default("active"), // Permite desativar usuários
  createdAt: timestamp("created_at").defaultNow().notNull(), // Audit trail
});

// SCHEMA ZOD: Validação para inserção de usuário (omite createdAt - gerado pelo banco)
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
// TIPO: Infere tipo TypeScript do schema Zod
export type InsertUser = z.infer<typeof insertUserSchema>;
// TIPO: Infere tipo TypeScript da tabela Drizzle (inclui createdAt)
export type User = typeof users.$inferSelect;

// ========================================
// TABELA: MOTOBOYS (ENTREGADORES)
// ========================================
/**
 * TABELA EXPORTADA: motoboys
 * PROPÓSITO: Dados específicos de motoboys (veículo, documentos, taxa)
 * USADO EM: GET /api/motoboys, AIEngine para atribuição de pedidos
 * 
 * CAMPOS:
 *   - id: VARCHAR UUID gerado automaticamente (gen_random_uuid())
 *   - name: TEXT nome completo
 *   - phone: TEXT telefone (opcional)
 *   - placa: TEXT placa do veículo (opcional)
 *   - cpf: TEXT CPF (opcional)
 *   - taxaPadrao: DECIMAL(10,2) taxa por entrega (default R$ 7.00)
 *   - status: TEXT status ('ativo', 'inativo') default 'ativo'
 *   - online: BOOLEAN se está conectado via WebSocket (default false)
 *   - createdAt: TIMESTAMP data de cadastro
 * 
 * NOTA: currentLat/currentLng REMOVIDOS - agora usam motoboyLocations
 */
export const motoboys = pgTable("motoboys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // UUID automático
  name: text("name").notNull(),
  phone: text("phone"),
  placa: text("placa"),               // Placa do veículo
  cpf: text("cpf"),                   // CPF para compliance
  taxaPadrao: decimal("taxa_padrao", { precision: 10, scale: 2 }).notNull().default("7.00"),
  status: text("status").notNull().default("ativo"),
  available: boolean("available").default(true), // Disponível para aceitar pedidos
  online: boolean("online").default(false), // Atualizado por WebSocket
  updatedAt: timestamp("updated_at").defaultNow(), // Última atualização
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMotoboySchema = createInsertSchema(motoboys).omit({ 
  id: true,        // Gerado pelo banco
  createdAt: true, // Gerado pelo banco
  updatedAt: true, // Gerenciado automaticamente
  online: true,    // Controlado pelo WebSocket
});
export type InsertMotoboy = z.infer<typeof insertMotoboySchema>;
export type Motoboy = typeof motoboys.$inferSelect;

// ========================================
// TABELA: MOTOBOY_LOCATIONS (HISTÓRICO GPS)
// ========================================
/**
 * TABELA EXPORTADA: motoboyLocations
 * PROPÓSITO: Rastreamento em tempo real e histórico de localizações GPS
 * USADO EM: AIEngine (getLatestMotoboyLocations), dashboard de monitoramento
 * PADRÃO: Append-only (INSERT sempre, nunca UPDATE) para manter histórico
 * 
 * CAMPOS:
 *   - id: VARCHAR UUID gerado automaticamente
 *   - motoboyId: VARCHAR referência ao motoboy
 *   - latitude: DECIMAL(10,7) coordenada GPS (precisão 7 casas decimais ~1cm)
 *   - longitude: DECIMAL(10,7) coordenada GPS
 *   - timestamp: TIMESTAMP momento do registro (default NOW())
 * 
 * NOTA: Decimal usado para precisão GPS (string no banco, convertido para number no código)
 */
export const motoboyLocations = pgTable("motoboy_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  motoboyId: varchar("motoboy_id").notNull(), // FK para motoboys.id (sem constraint explícita)
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),  // Ex: -23.5505199
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(), // Ex: -46.6333094
  timestamp: timestamp("timestamp").defaultNow().notNull(), // Momento da leitura GPS
});

export const insertMotoboyLocationSchema = createInsertSchema(motoboyLocations).omit({
  id: true,        // Gerado pelo banco
  timestamp: true, // Gerado pelo banco
});
export type InsertMotoboyLocation = z.infer<typeof insertMotoboyLocationSchema>;
export type MotoboyLocation = typeof motoboyLocations.$inferSelect;

// ========================================
// TABELA: CLIENTS (CLIENTES CORPORATIVOS)
// ========================================
/**
 * TABELA EXPORTADA: clients
 * PROPÓSITO: Clientes corporativos com mensalidade e horários de funcionamento
 * USADO EM: Cadastro de empresas, validações de horário de entrega
 * 
 * CAMPOS:
 *   - id: VARCHAR UUID (primary key)
 *   - name: TEXT nome da empresa
 *   - phone: TEXT telefone de contato
 *   - email: TEXT email (opcional)
 *   - company: TEXT razão social (opcional)
 *   - mensalidade: DECIMAL(10,2) valor mensal (default 0)
 *   - horarioFuncionamento: TEXT horários (formato livre)
 *   - createdAt: TIMESTAMP data de cadastro
 */
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  company: text("company"),       // Razão social
  documentType: text("document_type").notNull().default('PF'), // PF ou PJ
  documentNumber: text("document_number").notNull().default('PENDING'), // CPF/CNPJ cadastrado
  ie: text("ie"), // Inscrição estadual (apenas PJ)
  cep: text("cep").notNull().default('00000-000'), // CEP fixo da coleta
  rua: text("rua").notNull().default('ENDERECO-PENDENTE'), // Rua/Avenida fixa
  numero: text("numero").notNull().default('0'), // Número fixo
  bairro: text("bairro").notNull().default('BAIRRO-PENDENTE'), // Bairro fixo
  complemento: text("complemento"), // Complemento opcional
  referencia: text("referencia"), // Ponto de referência
  geoLat: decimal("geo_lat", { precision: 10, scale: 7 }), // Futuro geocoding
  geoLng: decimal("geo_lng", { precision: 10, scale: 7 }),
  mensalidade: decimal("mensalidade", { precision: 10, scale: 2 }).default("0"),
  horarioFuncionamento: text("horario_funcionamento"), // Ex: "8h-18h"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ========================================
// TABELA: ORDERS (PEDIDOS DE ENTREGA)
// ========================================
/**
 * TABELA EXPORTADA: orders
 * PROPÓSITO: Entidade principal - pedidos de entrega com coleta/entrega e pagamento
 * USADO EM: Todas as rotas /api/orders, AIEngine para atribuição
 * 
 * GRUPOS DE CAMPOS:
 * 1. Identificação: id, clientId, clientName, clientPhone
 * 2. Coleta: coletaRua, coletaNumero, coletaComplemento, coletaBairro, coletaCep
 * 3. Entrega: entregaRua, entregaNumero, entregaComplemento, entregaBairro, entregaCep
 * 4. Detalhes: referencia, observacoes
 * 5. Financeiro: valor, taxaMotoboy, formaPagamento, hasTroco, trocoValor
 * 6. Atribuição: motoboyId, motoboyName, status
 * 7. Timestamps: createdAt, acceptedAt, deliveredAt
 */
export const orders = pgTable("orders", {
  // GRUPO 1: IDENTIFICAÇÃO
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // UUID automático
  clientId: varchar("client_id").notNull(),      // FK para clients.id
  clientName: text("client_name").notNull(),     // Desnormalizado para performance
  clientPhone: text("client_phone").notNull(),   // Telefone do cliente
  clienteRefId: text("cliente_ref_id"),           // Identificador lógico para múltiplas unidades

  // GRUPO 2: ENDEREÇO DE COLETA
  coletaRua: text("coleta_rua").notNull(),           // Rua de origem
  coletaNumero: text("coleta_numero").notNull(),     // Número
  coletaComplemento: text("coleta_complemento"),     // Apto/Sala (opcional)
  coletaBairro: text("coleta_bairro").notNull(),     // Bairro
  coletaCep: text("coleta_cep").notNull(),           // CEP (sem formatação)
  coletaOverride: boolean("coleta_override").notNull().default(false), // Flag indicando edição manual

  // GRUPO 3: ENDEREÇO DE ENTREGA
  entregaRua: text("entrega_rua").notNull(),         // Rua de destino
  entregaNumero: text("entrega_numero").notNull(),   // Número
  entregaComplemento: text("entrega_complemento"),   // Apto/Sala (opcional)
  entregaBairro: text("entrega_bairro").notNull(),   // Bairro
  entregaCep: text("entrega_cep").notNull(),         // CEP

  // GRUPO 4: DETALHES ADICIONAIS
  referencia: text("referencia"),           // Ponto de referência (ex: "Próximo ao metrô")
  observacoes: text("observacoes"),         // Observações gerais

  // GRUPO 5: FINANCEIRO
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),              // Valor total do pedido
  taxaMotoboy: decimal("taxa_motoboy", { precision: 10, scale: 2 }).notNull().default("7.00"), // Taxa do motoboy
  formaPagamento: text("forma_pagamento").notNull(),  // Ex: "Dinheiro", "Cartão", "Pix"
  hasTroco: boolean("has_troco").default(false),      // Se cliente precisa de troco
  trocoValor: decimal("troco_valor", { precision: 10, scale: 2 }), // Valor para troco (opcional)

  // GRUPO 6: ATRIBUIÇÃO E STATUS
  motoboyId: varchar("motoboy_id"),      // FK para motoboys.id (null se pending)
  motoboyName: text("motoboy_name"),     // Desnormalizado para performance
  status: text("status").notNull().default("pending"), // 'pending' | 'in_progress' | 'delivered' | 'cancelled'
  proofUrl: text("proof_url"),           // URL ou texto do comprovante de entrega

  // GRUPO 7: AUDIT TRAIL (TIMESTAMPS)
  createdAt: timestamp("created_at").defaultNow().notNull(),     // Quando pedido foi criado
  acceptedAt: timestamp("accepted_at"),                          // Quando motoboy aceitou
  deliveredAt: timestamp("delivered_at"),                        // Quando foi entregue
});

// SCHEMA ZOD: Omite campos gerados automaticamente e campos de sistema
export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true,          // Gerado pelo banco
  createdAt: true,   // Gerado pelo banco
  acceptedAt: true,  // Preenchido ao aceitar
  deliveredAt: true, // Preenchido ao entregar
  motoboyId: true,   // Atribuído ao aceitar
  motoboyName: true, // Atribuído ao aceitar
  status: true,      // Default 'pending'
  clienteRefId: true,
}).extend({
  coletaOverride: z.boolean().default(false),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
// TIPO AUXILIAR: Union type para status do pedido
export type OrderStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled';

// ========================================
// TABELA: LIVE_DOCS (DOCUMENTOS COM GPS)
// ========================================
/**
 * TABELA EXPORTADA: liveDocs
 * PROPÓSITO: Armazenar fotos/documentos capturados durante entregas com localização GPS
 * USADO EM: Upload de provas de entrega, CNH, fotos de documentos
 * RECURSOS: Geotagging automático (gpsLat/gpsLng capturados no momento do upload)
 * 
 * CAMPOS:
 *   - id: VARCHAR UUID gerado automaticamente
 *   - orderId: VARCHAR referência ao pedido
 *   - motoboyId: VARCHAR quem fez o upload
 *   - tipo: TEXT tipo de documento ('CNH', 'Comprovante', 'Foto Entrega', etc)
 *   - fileUrl: TEXT URL do arquivo no storage (S3, Cloudinary, etc)
 *   - fileName: TEXT nome original do arquivo
 *   - gpsLat: DECIMAL latitude onde foi tirada a foto (opcional)
 *   - gpsLng: DECIMAL longitude onde foi tirada a foto (opcional)
 *   - uploadedAt: TIMESTAMP momento do upload
 */
export const liveDocs = pgTable("live_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),     // FK para orders.id
  motoboyId: varchar("motoboy_id").notNull(), // FK para motoboys.id
  tipo: text("tipo").notNull(),                // Categoria do documento
  fileUrl: text("file_url").notNull(),         // URL completa do arquivo
  fileName: text("file_name").notNull(),       // Nome original
  gpsLat: decimal("gps_lat", { precision: 10, scale: 7 }),   // Latitude do upload
  gpsLng: decimal("gps_lng", { precision: 10, scale: 7 }),   // Longitude do upload
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(), // Timestamp do upload
});

export const insertLiveDocSchema = createInsertSchema(liveDocs).omit({ 
  id: true,         // Gerado pelo banco
  uploadedAt: true, // Gerado pelo banco
});
export type InsertLiveDoc = z.infer<typeof insertLiveDocSchema>;
export type LiveDoc = typeof liveDocs.$inferSelect;

// ========================================
// TABELA: CHAT_MESSAGES (MENSAGENS EM TEMPO REAL)
// ========================================
/**
 * TABELA EXPORTADA: chatMessages
 * PROPÓSITO: Sistema de chat em tempo real entre clientes, motoboys e central
 * USADO EM: GET/POST /api/chat, broadcast via WebSocket
 * RECURSOS: Mensagens públicas (toId=null) ou privadas (toId especificado)
 * 
 * CAMPOS:
 *   - id: VARCHAR UUID gerado automaticamente
 *   - fromId: VARCHAR quem enviou (UUID do user)
 *   - fromName: TEXT nome de quem enviou (desnormalizado)
 *   - fromRole: TEXT papel de quem enviou ('client', 'motoboy', 'central')
 *   - toId: VARCHAR destinatário (null = mensagem pública para todos)
 *   - message: TEXT conteúdo da mensagem
 *   - orderId: VARCHAR pedido relacionado (opcional)
 *   - createdAt: TIMESTAMP momento do envio
 */
/**
 * TABELA: CHAT_MESSAGES
 * ARQUITETURA: Cliente/Motoboy → Central (futura IA) → destinatário
 * NUNCA comunicação direta entre cliente e motoboy
 * 
 * CATEGORIAS DE CONVERSA:
 * - status_entrega: Cliente pergunta sobre pedido → Central → Motoboy
 * - suporte: Dúvidas gerais, problemas → Central
 * - problema: Urgências, reportar issues → Central (alta prioridade)
 */
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // REMETENTE
  fromId: varchar("from_id").notNull(),     // UUID do remetente
  fromName: text("from_name").notNull(),    // Nome para exibição
  fromRole: text("from_role").notNull(),    // 'client' | 'motoboy' | 'central'
  
  // DESTINATÁRIO (sempre via Central)
  toId: varchar("to_id"),                   // UUID destinatário (null = para Central)
  toRole: text("to_role"),                  // Papel do destinatário
  
  // CATEGORIA E CONTEXTO
  category: text("category").notNull().default('suporte'), // 'status_entrega' | 'suporte' | 'problema'
  orderId: varchar("order_id"),             // Pedido relacionado (obrigatório para status_entrega)
  threadId: varchar("thread_id").notNull().default('legacy'), // Agrupa mensagens da mesma conversa
  
  // CONTEÚDO
  message: text("message").notNull(),       // Texto da mensagem
  isFromCentral: boolean("is_from_central").default(false).notNull(), // true = resposta da IA/Central
  
  // METADATA
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ 
  id: true,        // Gerado pelo banco
  createdAt: true, // Gerado pelo banco
});
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ========================================
// TABELA: MOTOBOY_SCHEDULES (AGENDAMENTO DE MOTOBOYS)
// ========================================
/**
 * TABELA EXPORTADA: motoboySchedules
 * PROPÓSITO: Disponibilidade semanal de motoboys por turno
 * USADO EM: AIEngine para atribuição considerando disponibilidade, dashboard de escala
 * PADRÃO: Um registro por motoboy por dia da semana
 * 
 * CAMPOS:
 *   - id: VARCHAR UUID gerado automaticamente
 *   - motoboyId: VARCHAR referência ao motoboy
 *   - diaSemana: INTEGER dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
 *   - turnoManha: BOOLEAN disponivel no turno manhã (6h-12h) default false
 *   - turnoTarde: BOOLEAN disponivel no turno tarde (12h-18h) default false
 *   - turnoNoite: BOOLEAN disponivel no turno noite (18h-00h) default false
 */
export const motoboySchedules = pgTable("motoboy_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  motoboyId: varchar("motoboy_id").notNull(), // FK para motoboys.id
  diaSemana: integer("dia_semana").notNull(),  // 0-6 (JavaScript Date.getDay())
  turnoManha: boolean("turno_manha").default(false),  // 6h-12h
  turnoTarde: boolean("turno_tarde").default(false),  // 12h-18h
  turnoNoite: boolean("turno_noite").default(false),  // 18h-00h
});

export const insertMotoboyScheduleSchema = createInsertSchema(motoboySchedules).omit({ id: true });
export type InsertMotoboySchedule = z.infer<typeof insertMotoboyScheduleSchema>;
export type MotoboySchedule = typeof motoboySchedules.$inferSelect;

// ========================================
// TABELA: CLIENT_SCHEDULES (HORÁRIOS DE FUNCIONAMENTO)
// ========================================
/**
 * TABELA EXPORTADA: clientSchedules
 * PROPÓSITO: Horários de funcionamento de clientes corporativos por dia da semana
 * USADO EM: Validação de pedidos (não aceitar entregas fora do horário)
 * PADRÃO: Múltiplos registros por cliente (um por dia da semana)
 * 
 * CAMPOS:
 *   - id: VARCHAR UUID gerado automaticamente
 *   - clientId: VARCHAR referência ao cliente
 *   - diaSemana: INTEGER dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
 *   - horaAbertura: TEXT horário de abertura (ex: "08:00")
 *   - horaFechamento: TEXT horário de fechamento (ex: "18:00")
 *   - fechado: BOOLEAN se cliente está fechado neste dia (default false)
 */
export const clientSchedules = pgTable("client_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(), // FK para clients.id
  diaSemana: integer("dia_semana").notNull(),  // 0-6 (JavaScript Date.getDay())
  horaAbertura: text("hora_abertura"),      // Formato "HH:MM"
  horaFechamento: text("hora_fechamento"),  // Formato "HH:MM"
  fechado: boolean("fechado").default(false), // Dia fechado
});

export const insertClientScheduleSchema = createInsertSchema(clientSchedules).omit({ id: true });
export type InsertClientSchedule = z.infer<typeof insertClientScheduleSchema>;
export type ClientSchedule = typeof clientSchedules.$inferSelect;
