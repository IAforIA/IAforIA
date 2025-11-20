import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
// --- Tabela de Usuários (users) ---
export const users = pgTable("users", {
    id: varchar("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    phone: text("phone"),
    email: text("email"),
    password: text("password").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
// --- Tabela de Motoboys (motoboys) ---
export const motoboys = pgTable("motoboys", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    name: text("name").notNull(),
    phone: text("phone"),
    placa: text("placa"),
    cpf: text("cpf"),
    taxaPadrao: decimal("taxa_padrao", { precision: 10, scale: 2 }).notNull().default("7.00"),
    status: text("status").notNull().default("ativo"),
    online: boolean("online").default(false),
    // REMOVIDOS: currentLat e currentLng
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertMotoboySchema = createInsertSchema(motoboys).omit({
    id: true,
    createdAt: true,
    online: true,
    // currentLat e currentLng não estão mais aqui
});
// --- NOVA TABELA: motoboy_locations (Rastreamento em tempo real/Histórico) ---
export const motoboyLocations = pgTable("motoboy_locations", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    motoboyId: varchar("motoboy_id").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(), // Usando decimal para precisão GPS
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});
export const insertMotoboyLocationSchema = createInsertSchema(motoboyLocations).omit({
    id: true,
    timestamp: true,
});
// --- Tabela de Clientes (clients) ---
export const clients = pgTable("clients", {
    id: varchar("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    company: text("company"),
    mensalidade: decimal("mensalidade", { precision: 10, scale: 2 }).default("0"),
    horarioFuncionamento: text("horario_funcionamento"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertClientSchema = createInsertSchema(clients).omit({ createdAt: true });
// --- Tabela de Pedidos (orders) ---
export const orders = pgTable("orders", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    clientId: varchar("client_id").notNull(),
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone").notNull(),
    coletaRua: text("coleta_rua").notNull(),
    coletaNumero: text("coleta_numero").notNull(),
    coletaComplemento: text("coleta_complemento"),
    coletaBairro: text("coleta_bairro").notNull(),
    coletaCep: text("coleta_cep").notNull(),
    entregaRua: text("entrega_rua").notNull(),
    entregaNumero: text("entrega_numero").notNull(),
    entregaComplemento: text("entrega_complemento"),
    entregaBairro: text("entrega_bairro").notNull(),
    entregaCep: text("entrega_cep").notNull(),
    referencia: text("referencia"),
    observacoes: text("observacoes"),
    valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
    taxaMotoboy: decimal("taxa_motoboy", { precision: 10, scale: 2 }).notNull().default("7.00"),
    formaPagamento: text("forma_pagamento").notNull(),
    hasTroco: boolean("has_troco").default(false),
    trocoValor: decimal("troco_valor", { precision: 10, scale: 2 }),
    motoboyId: varchar("motoboy_id"),
    motoboyName: text("motoboy_name"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at"),
    deliveredAt: timestamp("delivered_at"),
});
export const insertOrderSchema = createInsertSchema(orders).omit({
    id: true,
    createdAt: true,
    acceptedAt: true,
    deliveredAt: true,
    motoboyId: true,
    motoboyName: true,
    status: true,
});
// --- Tabela de Live Docs (live_docs) ---
export const liveDocs = pgTable("live_docs", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    orderId: varchar("order_id").notNull(),
    motoboyId: varchar("motoboy_id").notNull(),
    tipo: text("tipo").notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    gpsLat: decimal("gps_lat", { precision: 10, scale: 7 }),
    gpsLng: decimal("gps_lng", { precision: 10, scale: 7 }),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
export const insertLiveDocSchema = createInsertSchema(liveDocs).omit({
    id: true,
    uploadedAt: true,
});
// --- Tabela de Mensagens de Chat (chat_messages) ---
export const chatMessages = pgTable("chat_messages", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    fromId: varchar("from_id").notNull(),
    fromName: text("from_name").notNull(),
    fromRole: text("from_role").notNull(),
    toId: varchar("to_id"),
    message: text("message").notNull(),
    orderId: varchar("order_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
    id: true,
    createdAt: true,
});
// --- Tabela de Agendamentos de Motoboys (motoboy_schedules) ---
export const motoboySchedules = pgTable("motoboy_schedules", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    motoboyId: varchar("motoboy_id").notNull(),
    diaSemana: integer("dia_semana").notNull(),
    turnoManha: boolean("turno_manha").default(false),
    turnoTarde: boolean("turno_tarde").default(false),
    turnoNoite: boolean("turno_noite").default(false),
});
export const insertMotoboyScheduleSchema = createInsertSchema(motoboySchedules).omit({ id: true });
// --- Tabela de Agendamentos de Clientes (client_schedules) ---
export const clientSchedules = pgTable("client_schedules", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    clientId: varchar("client_id").notNull(),
    horaAbertura: text("hora_abertura"),
    horaFechamento: text("hora_fechamento"),
    fechado: boolean("fechado").default(false),
});
export const insertClientScheduleSchema = createInsertSchema(clientSchedules).omit({ id: true });
