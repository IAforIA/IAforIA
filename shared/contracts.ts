/**
 * ARQUIVO: shared/contracts.ts
 * PROPÓSITO: Fonte única de verdade para DTOs (Data Transfer Objects) e schemas Zod compartilhados
 * 
 * RESPONSABILIDADES:
 * - Define interfaces TypeScript para comunicação type-safe entre frontend/backend
 * - Exporta schemas Zod para validação em runtime (evita inconsistências)
 * - Centraliza tipos de documentos, endereços e payloads de onboarding
 * 
 * PADRÃO ARQUITETURAL:
 * - Shared Layer Pattern: código compartilhado garante que ambos os lados "falem a mesma língua"
 * - Contract-First Design: DTOs definem o contrato antes da implementação
 * 
 * USADO EM:
 * - Backend: validação de payloads (server/routes.ts), mapeamento de entidades (server/storage.ts)
 * - Frontend: validação de formulários (client/src/pages/*.tsx), tipagem de APIs
 * 
 * REFERÊNCIA: docs/CONTRATOS-COMPARTILHADOS.md (Etapa 03 do manual sequencial)
 */

import { z } from "zod";
import type { OrderStatus } from "./schema";

// ========================================
// TIPOS DE DOCUMENTOS (PF/PJ)
// ========================================

/**
 * CONSTANTE EXPORTADA: documentTypeValues
 * PROPÓSITO: Array readonly que define os únicos valores válidos para tipo de documento
 * PADRÃO: Const Assertion (`as const`) garante que TypeScript trate como literal types
 * USADO EM: Enum do Zod e type guard no frontend/backend
 */
export const documentTypeValues = ["PF", "PJ"] as const;

/**
 * TIPO EXPORTADO: DocumentType
 * PROPÓSITO: Union type derivado do array de valores ("PF" | "PJ")
 * TÉCNICA: Indexed Access Type - extrai valores do array como union literal
 * BENEFÍCIO: Single source of truth - mudar documentTypeValues atualiza o tipo automaticamente
 */
export type DocumentType = (typeof documentTypeValues)[number];

// ========================================
// SCHEMA ZOD: ENDEREÇO (REUTILIZÁVEL)
// ========================================

/**
 * SCHEMA EXPORTADO: addressSchema
 * PROPÓSITO: Validação de endereços brasileiros com CEP/rua/número/bairro
 * 
 * CAMPOS OBRIGATÓRIOS:
 * - cep: 8+ caracteres (formato 12345-678 ou 12345678)
 * - rua: 3+ caracteres (nome da via pública)
 * - numero: 1+ caracteres (aceita "S/N" para sem número)
 * - bairro: 3+ caracteres
 * 
 * CAMPOS OPCIONAIS:
 * - complemento: máx 120 chars (apto, bloco, sala)
 * - referencia: máx 120 chars (ponto de referência para entrega)
 * - geoLat/geoLng: coordenadas GPS (number ou string para flexibilidade com Decimal do Postgres)
 * 
 * USADO EM:
 * - clientOnboardingSchema (endereço fixo do cadastro)
 * - Futuramente em schemas de pedido para validar entregas
 * 
 * PADRÃO: Schema Composition - reutilizar validações complexas evita duplicação
 */
export const addressSchema = z.object({
  cep: z.string().min(8, "CEP obrigatorio"),
  rua: z.string().min(3, "Rua obrigatoria"),
  numero: z.string().min(1, "Numero obrigatorio"),
  bairro: z.string().min(3, "Bairro obrigatorio"),
  complemento: z.string().max(120).optional(),
  referencia: z.string().max(120).optional(),
  geoLat: z.number().or(z.string()).optional(), // Aceita number (JS) ou string (Postgres Decimal)
  geoLng: z.number().or(z.string()).optional(),
});

// ========================================
// SCHEMA ZOD: ONBOARDING DE CLIENTES (PF/PJ)
// ========================================

/**
 * SCHEMA EXPORTADO: clientOnboardingSchema
 * PROPÓSITO: Validação completa do cadastro inicial de clientes (Etapa 05)
 * 
 * ESTRATÉGIA DE VALIDAÇÃO:
 * 1. Validação básica via z.object() - tipos, tamanhos mínimos/máximos
 * 2. Validação customizada via .superRefine() - regras de negócio (CPF 11 dígitos, CNPJ 14 dígitos)
 * 3. Validação condicional - IE opcional apenas para PJ
 * 
 * CAMPOS PRINCIPAIS:
 * - name: razão social ou nome completo (3+ chars)
 * - email: validação built-in do Zod (formato RFC 5322)
 * - phone: 8+ chars (aceita formatações variadas)
 * - password: 8+ chars (backend adiciona hash bcrypt)
 * - documentType: enum PF/PJ (restrito aos valores de documentTypeValues)
 * - documentNumber: 11-18 chars bruto (aceita máscaras, backend normaliza)
 * - ie: opcional, apenas para PJ (Inscrição Estadual)
 * - address: reutiliza addressSchema completo
 * - acceptFixedAddress: checkbox obrigatório (LGPD/consentimento explícito)
 * 
 * LÓGICA CUSTOMIZADA (.superRefine):
 * - Remove caracteres não-numéricos do documento
 * - Valida tamanho exato: PF = 11 dígitos (CPF), PJ = 14 dígitos (CNPJ)
 * - Adiciona erro no path correto para feedback visual no formulário
 * 
 * PADRÃO: Progressive Enhancement - validação básica + refinamentos incrementais
 * USADO EM: POST /api/auth/register (backend), landing page wizard (frontend)
 */
export const clientOnboardingSchema = z
  .object({
    name: z.string().min(3, "Nome obrigatorio"),
    email: z.string().email("Email invalido"),
    phone: z.string().min(8, "Telefone obrigatorio"),
    password: z.string().min(8, "Senha com no minimo 8 caracteres"),
    documentType: z.enum(documentTypeValues), // Restringe a "PF" | "PJ"
    documentNumber: z
      .string()
      .min(11, "Documento incompleto")
      .max(18, "Documento invalido"), // Aceita máscaras (999.999.999-99)
    ie: z.string().max(20).optional(), // Inscrição Estadual (apenas PJ)
    address: addressSchema, // Composição: reutiliza schema completo
    acceptFixedAddress: z
      .boolean()
      .refine((value) => value === true, "E necessario aceitar o uso do endereco fixo"),
  })
  .superRefine((value, ctx) => {
    // VALIDAÇÃO CUSTOMIZADA: normaliza documento removendo pontos/hífens/barras
    const digitsOnly = value.documentNumber.replace(/\D/g, "");
    
    // REGRA DE NEGÓCIO: CPF deve ter exatamente 11 dígitos
    if (value.documentType === "PF" && digitsOnly.length !== 11) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: "CPF deve ter 11 digitos", 
        path: ["documentNumber"] // Anexa erro ao campo correto
      });
    }
    
    // REGRA DE NEGÓCIO: CNPJ deve ter exatamente 14 dígitos
    if (value.documentType === "PJ" && digitsOnly.length !== 14) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        message: "CNPJ deve ter 14 digitos", 
        path: ["documentNumber"] 
      });
    }
  });

/**
 * TIPO EXPORTADO: ClientOnboardingPayload
 * PROPÓSITO: TypeScript type inferido do schema Zod
 * TÉCNICA: Type Inference - garante sincronia automática entre validação e tipos
 * BENEFÍCIO: Mudar o schema atualiza o tipo sem código duplicado
 */
export type ClientOnboardingPayload = z.infer<typeof clientOnboardingSchema>;

// ========================================
// SCHEMA ZOD: ONBOARDING DE MOTOBOYS
// ========================================

/**
 * SCHEMA EXPORTADO: motoboyOnboardingSchema
 * PROPÓSITO: Validação do cadastro inicial de motoboys/entregadores
 * 
 * CAMPOS PRINCIPAIS:
 * - name: nome completo (3+ chars)
 * - email: validação de email
 * - phone: telefone (8+ chars)
 * - password: senha (8+ chars)
 * - cpf: CPF do entregador (11 dígitos)
 * - placa: placa da moto (opcional)
 * 
 * NOTA: PIX não é coletado no cadastro inicial por segurança.
 * O administrador pode atualizar depois em Entregadores > Ver detalhes.
 */
export const motoboyOnboardingSchema = z
  .object({
    name: z.string().min(3, "Nome obrigatório"),
    email: z.string().email("Email inválido"),
    phone: z.string().min(8, "Telefone obrigatório"),
    password: z.string().min(8, "Senha com no mínimo 8 caracteres"),
    cpf: z.string().min(11, "CPF obrigatório").max(14, "CPF inválido"),
    placa: z.string().max(10).optional(),
    acceptTerms: z
      .boolean()
      .refine((value) => value === true, "É necessário aceitar os termos de uso"),
  })
  .superRefine((value, ctx) => {
    // VALIDAÇÃO: CPF deve ter 11 dígitos numéricos
    const digitsOnly = value.cpf.replace(/\D/g, "");
    if (digitsOnly.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF deve ter 11 dígitos",
        path: ["cpf"],
      });
    }
  });

/**
 * TIPO EXPORTADO: MotoboyOnboardingPayload
 * PROPÓSITO: TypeScript type inferido do schema Zod
 */
export type MotoboyOnboardingPayload = z.infer<typeof motoboyOnboardingSchema>;

// ========================================
// DTOS: CLIENTE E HORÁRIOS
// ========================================

/**
 * INTERFACE EXPORTADA: ClientScheduleDto
 * PROPÓSITO: Horários de funcionamento do estabelecimento cliente
 * 
 * CAMPOS:
 * - horaAbertura/horaFechamento: formato "HH:MM" (ex: "08:00", "18:30")
 * - fechado: flag temporária para desativar recebimento de pedidos
 * 
 * USADO EM: 
 * - ClientProfileDto (horário associado ao cliente)
 * - Futura validação de janelas de entrega (Etapa 09)
 * 
 * PADRÃO: Optional Properties - todos campos opcionais permitem cadastro gradual
 */
export interface ClientScheduleDto {
  horaAbertura?: string;
  horaFechamento?: string;
  fechado?: boolean;
}

/**
 * INTERFACE EXPORTADA: ClientProfileDto
 * PROPÓSITO: Representação completa do perfil do cliente (retorno de APIs)
 * 
 * ESTRUTURA:
 * - Dados básicos: id, name, phone, email
 * - Documentação fiscal: documentType (PF/PJ), documentNumber, ie (opcional)
 * - Endereço fixo: objeto aninhado com todos os campos do addressSchema
 * - Horário de funcionamento: opcional (ClientScheduleDto)
 * 
 * CAMPOS ANINHADOS (address):
 * - Mapeia exatamente a estrutura do banco (clients table)
 * - Tipos nullable (?:) refletem colunas opcionais do Postgres
 * - geoLat/geoLng: number | null (convertido de Decimal string no backend)
 * 
 * USADO EM:
 * - GET /api/me/profile (retorna perfil completo)
 * - POST /api/auth/register (retorno após cadastro bem-sucedido)
 * - Auto-preenchimento de coleta (Etapa 06)
 * 
 * PADRÃO: Rich Domain Model - DTO carrega todos os dados necessários, reduzindo round-trips
 */
export interface ClientProfileDto {
  id: string;
  name: string;
  phone: string;
  email: string;
  documentType: DocumentType; // "PF" | "PJ"
  documentNumber: string;
  ie?: string | null; // Inscrição Estadual (apenas PJ)
  mensalidade: number; // Valor da mensalidade (0 = sem mensalidade)
  address: {
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
    complemento?: string | null;
    referencia?: string | null;
    geoLat?: number | null; // Coordenadas GPS (futura integração com mapas)
    geoLng?: number | null;
  };
  horario?: ClientScheduleDto | null;
}

// ========================================
// DTOS: MOTOBOY E LOCALIZAÇÃO
// ========================================

/**
 * INTERFACE EXPORTADA: MotoboyDto
 * PROPÓSITO: Representação completa do motoboy (entregador) no sistema
 * 
 * CAMPOS:
 * - Identificação: id (PK na tabela motoboys), name, phone
 * - Veículo: vehicleType ("moto" | "bicicleta" | "carro"), placa
 * - Status operacional: status ("ativo" | "inativo"), online (conectado WebSocket)
 * - Localização em tempo real: geoLat/geoLng (number | null)
 * 
 * LOCALIZAÇÃO GPS:
 * - Coordenadas armazenadas na tabela motoboyLocations (append-only, preserva histórico)
 * - Atualizadas via WebSocket (mensagem tipo "motoboy-location")
 * - Nulas até primeira transmissão de GPS do app mobile
 * - FUTURO (Etapa 14): cálculo de raio de alcance e despacho inteligente
 * 
 * STATUS vs ONLINE:
 * - status: cadastral (ativo = pode receber pedidos, inativo = bloqueado administrativamente)
 * - online: conexão WebSocket (true = app aberto em tempo real)
 * - Apenas motoboys com status=ativo AND online=true recebem notificações
 * 
 * USADO EM:
 * - Dashboard Central: listagem e atribuição manual de pedidos
 * - WebSocket: broadcast de posições para clientes acompanharem entregas
 * - Algoritmo de despacho (Etapa 14): critério proximidade + disponibilidade
 * 
 * PADRÃO: Data Transfer Object - sem lógica de negócio, apenas estrutura de dados
 */
export interface MotoboyDto {
  id: string;
  name: string;
  phone?: string | null;
  vehicleType?: string | null; // TODO Etapa 14: transformar em enum ("moto" | "bicicleta" | "carro")
  placa?: string | null;
  status?: string | null; // "ativo" | "inativo"
  online?: boolean;       // WebSocket connection status
  geoLat?: number | null; // Última localização conhecida
  geoLng?: number | null;
}

// ========================================
// DTOS: ENDEREÇOS DE COLETA E ENTREGA
// ========================================

/**
 * INTERFACE EXPORTADA: ColetaDto
 * PROPÓSITO: Endereço de coleta (origem) do pedido
 * 
 * COMPORTAMENTO (ETAPA 06 - AUTO-FILL):
 * - Por padrão: pré-preenchido com endereço cadastral do cliente (clients.address)
 * - Override: cliente pode desmarcar toggle e fornecer endereço alternativo
 * - Campo coletaOverride (boolean) na tabela orders rastreia se usou endereço alternativo
 * 
 * CAMPOS:
 * - Endereço completo: rua, numero, bairro, cep
 * - Referência opcional: ponto de referência para facilitar localização
 * 
 * VALIDAÇÃO:
 * - Todos campos obrigatórios exceto referencia
 * - Backend valida presença antes de aceitar pedido
 * 
 * USADO EM:
 * - POST /api/orders (payload de criação)
 * - Dashboard Cliente: formulário de novo pedido
 * - Dashboard Motoboy: exibe origem da coleta
 */
export interface ColetaDto {
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  referencia?: string | null;
}

/**
 * INTERFACE EXPORTADA: EntregaDto
 * PROPÓSITO: Endereço de entrega (destino) do pedido
 * 
 * PADRÃO: Interface Inheritance - estende ColetaDto pois estrutura é idêntica
 * BENEFÍCIO: DRY (Don't Repeat Yourself) + permite evoluir independentemente no futuro
 * 
 * CAMPOS (HERDADOS):
 * - Mesma estrutura de ColetaDto: rua, numero, bairro, cep, referencia
 * 
 * USADO EM:
 * - POST /api/orders (payload de criação)
 * - Dashboard Cliente: formulário de novo pedido (segundo endereço)
 * - Dashboard Motoboy: exibe destino da entrega
 * - Cálculo de distância (Etapa 14): origem-destino para precificação dinâmica
 */
export interface EntregaDto extends ColetaDto {}

// ========================================
// DTOS: PEDIDOS (ORDERS)
// ========================================

/**
 * INTERFACE EXPORTADA: OrderSummaryDto
 * PROPÓSITO: Representação completa de um pedido com dados relacionados (cliente, motoboy)
 * 
 * ESTRUTURA:
 * - Identificação: id (UUID), status (enum OrderStatus), timestamps
 * - Valores: valor (total), taxaMotoboy (comissão entregador)
 * - Pagamento: pagamento (forma selecionada pelo cliente)
 * - Endereços: coleta (ColetaDto), entrega (EntregaDto), coletaOverride (boolean)
 * - Relações: cliente (subset de ClientProfileDto), motoboy (opcional, MotoboyDto completo)
 * 
 * RELAÇÕES ANINHADAS:
 * - cliente: Pick<ClientProfileDto, "id" | "name" | "phone"> (apenas dados essenciais)
 * - motoboy?: MotoboyDto (opcional, null quando status=pending)
 * 
 * USADO EM:
 * - GET /api/orders (lista pedidos do cliente logado)
 * - Dashboard Central: grid de pedidos com filtros
 * - Dashboard Motoboy: pedidos atribuídos
 * - WebSocket: broadcast de atualizações de status
 * 
 * PADRÃO: Aggregate Root - carrega todas as informações necessárias para exibir pedido completo
 */
export interface OrderSummaryDto {
  id: string;
  status: OrderStatus;
  createdAt: string;
  valor: number;
  taxaMotoboy: number;
  pagamento: string;
  coletaOverride: boolean;
  coleta: ColetaDto;
  entrega: EntregaDto;
  cliente: Pick<ClientProfileDto, "id" | "name" | "phone">;
  motoboy?: MotoboyDto;
}

// ========================================
// DTOS: AUTENTICAÇÃO E RESPOSTAS
// ========================================

/**
 * INTERFACE EXPORTADA: RegisterResponseDto
 * PROPÓSITO: Resposta de sucesso ao cadastrar novo cliente (POST /api/auth/register)
 * 
 * CAMPOS:
 * - access_token: JWT para autenticação subsequente (Bearer token)
 * - profile: ClientProfileDto completo (evita chamada extra a GET /api/me/profile)
 * 
 * FLUXO:
 * 1. Cliente preenche formulário multi-step na landing page
 * 2. Frontend envia POST /api/auth/register com ClientOnboardingPayload
 * 3. Backend cria user + client em transação (createClientWithUser)
 * 4. Backend gera JWT e retorna RegisterResponseDto
 * 5. Frontend armazena token + redireciona para dashboard
 * 
 * BENEFÍCIO: Elimina round-trip extra ao incluir profile na resposta de registro
 * PADRÃO: Command Response - retorna tudo que frontend precisa para prosseguir
 */
export interface RegisterResponseDto {
  access_token: string;
  profile: ClientProfileDto;
}

// ========================================
// WEBSOCKET: ENVELOPE GENÉRICO
// ========================================

/**
 * INTERFACE EXPORTADA: WsEnvelope<TType, TPayload>
 * PROPÓSITO: Envelope genérico para mensagens WebSocket tipadas
 * 
 * TÉCNICA: TypeScript Generics - permite criar mensagens fortemente tipadas
 * PARÂMETROS:
 * - TType: string literal type para discriminação (ex: "order-update" | "chat-message")
 * - TPayload: tipo do payload específico de cada mensagem
 * 
 * ESTRUTURA:
 * - type: discriminador para pattern matching no frontend/backend
 * - payload: dados da mensagem (tipo varia conforme TType)
 * 
 * EXEMPLOS DE USO:
 * ```typescript
 * // Mensagem de atualização de pedido
 * type OrderUpdateMessage = WsEnvelope<"order-update", OrderSummaryDto>;
 * 
 * // Mensagem de localização do motoboy
 * type LocationMessage = WsEnvelope<"motoboy-location", { 
 *   motoboyId: string; 
 *   lat: number; 
 *   lng: number; 
 * }>;
 * 
 * // Pattern matching no cliente
 * if (message.type === "order-update") {
 *   // TypeScript infere message.payload como OrderSummaryDto
 *   updateOrderInUI(message.payload);
 * }
 * ```
 * 
 * BENEFÍCIO: Type Safety - previne erros de envio de payloads incompatíveis
 * PADRÃO: Discriminated Union - permite switch/if exhaustivo nos handlers
 */
export interface WsEnvelope<TType extends string, TPayload> {
  type: TType;
  payload: TPayload;
  emittedAt: string; // ISO 8601 timestamp (ex: "2024-01-15T10:30:00.000Z")
}

// ========================================
// FIM DO ARQUIVO shared/contracts.ts
// ========================================
// PRÓXIMOS PASSOS (Roadmap):
// - Etapa 07: Calculadora de taxas (taxaSchema, cálculo dinâmico distância+peso)
// - Etapa 08: Timeline de status + chat em tempo real (mensagens WebSocket)
// - Etapa 09-13: Dashboards Central/Motoboy completos + despacho inteligente
// - Etapa 14: Integração GPS + geocoding + cálculo de rotas
// - Etapa 15-20: Testes E2E, otimizações, rollout produção
// ========================================

// ========================================
// TIPOS ADICIONADOS NA AUDITORIA MIT 2025-12-13
// ========================================

/**
 * INTERFACE: ClientScheduleEntry
 * PROPÓSITO: Entrada de horário de funcionamento por dia da semana
 * USADO EM: central-dashboard.tsx, central/home.tsx, central/clients.tsx
 */
export interface ClientScheduleEntry {
  id?: string;
  clientId: string;
  diaSemana: number; // 0-6 (domingo = 0)
  horaAbertura: string; // "HH:MM"
  horaFechamento: string; // "HH:MM"
  ativo: boolean;
}

/**
 * INTERFACE: MotoboyScheduleEntry
 * PROPÓSITO: Disponibilidade do motoboy por dia/turno
 * USADO EM: central-dashboard.tsx, ScheduleGrid.tsx
 */
export interface MotoboyScheduleEntry {
  id?: string;
  motoboyId: string;
  diaSemana: number; // 0-6 (domingo = 0)
  turnoManha: boolean;
  turnoTarde: boolean;
  turnoNoite: boolean;
}

/**
 * INTERFACE: ApiError
 * PROPÓSITO: Tipagem segura para erros em catch blocks
 * PADRÃO: Substituir catch(error: any) por type guard
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * FUNÇÃO: getErrorMessage
 * PROPÓSITO: Extrai mensagem de erro de qualquer tipo (unknown)
 * USADO EM: Todos os catch blocks do servidor
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Erro desconhecido';
}

/**
 * INTERFACE: MotoboyReport
 * PROPÓSITO: Relatório financeiro do motoboy
 * USADO EM: driver-dashboard.tsx, central/financial.tsx
 */
export interface MotoboyReport {
  stats: {
    totalEntregas: number;
    totalGanho: string;
    mediaAvaliacao: number;
    taxaAceitacao: number;
  };
  breakdown: {
    hoje: { entregas: number; valor: string };
    semana: { entregas: number; valor: string };
    mes: { entregas: number; valor: string };
  };
  recentOrders: Array<{
    id: string;
    clientName: string;
    valor: string;
    status: string;
    createdAt: string;
  }>;
}

/**
 * INTERFACE: ClientReport
 * PROPÓSITO: Relatório financeiro do cliente
 * USADO EM: client-dashboard.tsx, central/financial.tsx
 */
export interface ClientReport {
  stats: {
    totalPedidos: number;
    totalGasto: string;
    mediaValor: string;
    pedidosHoje: number;
  };
  breakdown: {
    hoje: { pedidos: number; valor: string };
    semana: { pedidos: number; valor: string };
    mes: { pedidos: number; valor: string };
  };
  recentOrders: Array<{
    id: string;
    motoboyName: string | null;
    valor: string;
    status: string;
    createdAt: string;
  }>;
}

/**
 * INTERFACE: CompanyReport
 * PROPÓSITO: Relatório geral da empresa
 * USADO EM: central-dashboard.tsx, central/home.tsx
 */
export interface CompanyReport {
  summary: {
    totalOrders: number;
    totalRevenue: string;
    totalProfit: string;
    activeClients: number;
    activeMotoboys: number;
  };
  breakdown: {
    hoje: { pedidos: number; receita: string };
    semana: { pedidos: number; receita: string };
    mes: { pedidos: number; receita: string };
  };
}

/**
 * INTERFACE: ChatMessagePayload
 * PROPÓSITO: Payload para criação/recebimento de mensagens de chat
 * USADO EM: server/routes/chat.ts, client/components/chat/*
 */
export interface ChatMessagePayload {
  id?: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  receiverId?: string | null;
  message: string;
  category?: string;
  orderId?: string | null;
  threadId?: string | null;
  createdAt?: string;
}

/**
 * INTERFACE: FinancialSnapshot
 * PROPÓSITO: Snapshot financeiro para relatórios
 * USADO EM: central/financial.tsx
 */
export interface MotoboyFinancialSnapshot {
  id: string;
  name: string;
  totalEntregas: number;
  totalRepasse: string;
  mediaAvaliacao: number;
}

export interface ClientFinancialSnapshot {
  id: string;
  name: string;
  totalPedidos: number;
  totalGasto: string;
  mensalidade: string;
}
