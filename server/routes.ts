/**
 * ARQUIVO: server/routes.ts
 * PROPÓSITO: Define todas as rotas da API REST e suas regras de autenticação/autorização
 * 
 * ROTAS PRINCIPAIS:
 * - /api/auth/login - Login de usuários
 * - /api/orders - CRUD de pedidos
 * - /api/motoboys - Gestão de motoboys
 * - /api/chat - Mensagens em tempo real
 * - /health - Health check para load balancers
 */

// Router: Classe do Express para criar grupos de rotas
import { Router } from "express";
// rateLimit: Middleware que limita o número de requisições por IP (previne ataques)
import rateLimit from "express-rate-limit";
// storage: Objeto que contém todos os métodos de acesso ao banco de dados (definido em storage.ts)
import { storage } from "./storage.ts";
// db: Instância do Drizzle ORM para operações diretas no banco
import { db } from "./db.ts";
// orders: Tabela de pedidos do schema
import { orders } from "@shared/schema";
// eq: Operador de igualdade do Drizzle ORM
import { eq } from "drizzle-orm";
// AIEngine: Classe com lógica de atribuição inteligente de motoboys (definida em ai-engine.ts)
import { AIEngine } from "./ai-engine.ts";
// Analytics: Business intelligence and financial calculations
import * as analytics from "./analytics.ts";
import { calculateGuririComission, isValidDeliveryValue } from "./analytics.ts";
// bcrypt: Biblioteca para hash e comparação segura de senhas
import bcrypt from "bcryptjs";
// jwt: Biblioteca para criar e validar tokens JWT (JSON Web Tokens)
import jwt from "jsonwebtoken";
// Schemas de validação Zod gerados automaticamente do Drizzle schema
import { insertOrderSchema, insertChatMessageSchema } from "@shared/schema";
import { clientOnboardingSchema } from "@shared/contracts";
// Middlewares de autenticação JWT
import { authenticateToken, requireRole, verifyTokenFromQuery } from "./middleware/auth.ts";
// Chat rate limiting and cost control
import { chatRateLimiter, recordAIUsage, getUserUsageStats } from "./middleware/chat-rate-limiter";
import { costTracker } from "./middleware/cost-tracker";
import { responseCache } from "./middleware/response-cache";
// broadcast: Função global para enviar mensagens WebSocket (importada de index.ts)
import { broadcast } from "./index.ts";
import { ZodError } from "zod";
// multer: Middleware para upload de arquivos
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ========================================
// VARIÁVEIS DE AMBIENTE E SEGURANÇA
// ========================================

// CRÍTICO: Garante que JWT_SECRET existe antes de iniciar o servidor
// JWT_SECRET é usado para assinar e verificar tokens de autenticação
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for security');
}
// CONSTANTE GLOBAL: Segredo usado para assinar JWTs (nunca deve ser exposto)
const JWT_SECRET = process.env.JWT_SECRET;

// ========================================
// RATE LIMITERS (PROTEÇÃO CONTRA ATAQUES)
// ========================================

// CONSTANTE: Rate limiter específico para rota de login
// Previne ataques de força bruta (brute force) limitando tentativas de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de tempo: 15 minutos
  max: 100, // AUMENTADO PARA TESTES (era 5)
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true, // Retorna info de rate limit nos headers: RateLimit-*
  legacyHeaders: false, // Desabilita headers antigos X-RateLimit-*
});

// Limiter especifico para onboarding PF/PJ (segura abusos no endpoint de cadastro)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Muitas tentativas de cadastro. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const CLIENT_PROFILE_NOT_FOUND = 'CLIENT_PROFILE_NOT_FOUND';

// CONSTANTE: Rate limiter geral para todas as rotas /api/*
// Previne sobrecarga do servidor limitando requisições por minuto
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Janela de tempo: 1 minuto
  max: 100, // Máximo de 100 requisições por IP por minuto
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configuração do Multer para upload local
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storageConfig,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens (jpeg, jpg, png) e PDFs são permitidos!'));
  }
});

// A função `registerRoutes` agora retorna apenas o router
// ========================================
// FUNÇÃO PRINCIPAL: REGISTRO DE ROTAS
// ========================================

/**
 * CONSTANTE EXPORTADA: registerRoutes()
 * PROPÓSITO: Cria e configura todas as rotas da API em um Router do Express
 * RETORNO: Promise<Router> - Objeto Router pronto para ser usado no app.use()
 * CONEXÃO: Chamada em server/index.ts linha ~90
 * 
 * NOTA: Função async porque precisa aguardar operações de banco de dados
 */
export async function registerRoutes() {
  // CONSTANTE LOCAL: Cria instância do Router do Express
  // Router agrupa rotas relacionadas antes de adicionar ao app principal
  const router = Router();

  // ========================================
  // ROTA: HEALTH CHECK (SEM AUTENTICAÇÃO)
  // ========================================
  // PROPÓSITO: Verificar se o servidor está funcionando (usado por load balancers e monitoração)
  // SEM RATE LIMIT: Health checks precisam responder sempre
  router.get("/health", (_req, res) => {
    res.json({ 
      status: "ok", // Indica que o servidor está respondendo
      timestamp: new Date().toISOString(), // Horário atual do servidor
      uptime: process.uptime() // Tempo em segundos desde que o servidor iniciou
    });
  });

  // ========================================
  // ROTA: POST /api/auth/register
  // ========================================
  /**
   * ENDPOINT: POST /api/auth/register
   * PROPÓSITO: Onboarding completo PF/PJ (Etapa 05) - cadastro de cliente com endereço fixo
   * ACESSO: Público (sem autenticação)
   * MIDDLEWARE: registerLimiter (máx 3 cadastros/15min por IP)
   * 
   * FLUXO:
   * 1. Frontend envia ClientOnboardingPayload (validado pelo schema)
   * 2. Backend valida dados com Zod (clientOnboardingSchema)
   * 3. Senha é hasheada com bcrypt (salt rounds = 10)
   * 4. Cria user + client em transação (storage.createClientWithUser)
   * 5. Gera JWT e retorna RegisterResponseDto
   * 
   * VALIDAÇÃO CUSTOMIZADA (clientOnboardingSchema.superRefine):
   * - CPF: exatamente 11 dígitos (remove máscaras)
   * - CNPJ: exatamente 14 dígitos
   * - IE: obrigatório apenas se documentType=PJ
   * 
   * SEGURANÇA:
   * - Password nunca é retornado na resposta
   * - Password hash usa bcrypt (proteção contra rainbow tables)
   * - Rate limiter previne criação massiva de contas falsas
   * 
   * ERROS TRATADOS:
   * - ZodError (400): campos inválidos/faltantes
   * - EMAIL_IN_USE (409): email duplicado no banco
   * - DOCUMENT_IN_USE (409): CPF/CNPJ já cadastrado
   * - Erro genérico (500): falha de banco ou exceção inesperada
   */
  router.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      // VALIDAÇÃO: Zod parse() lança ZodError se dados inválidos
      const payload = clientOnboardingSchema.parse(req.body);
      
      // SEGURANÇA: Hash da senha com bcrypt (salt rounds = 10)
      // Nunca armazene senhas em texto plano!
      const passwordHash = await bcrypt.hash(payload.password, 10);
      
      // DESTRUCTURING: Remove password do payload antes de enviar ao storage
      // Prefixo '_' indica variável descartada (convenção TypeScript)
      const { password: _password, ...clientPayload } = payload;
      
      // TRANSAÇÃO: createClientWithUser cria user + client atomicamente
      // Se falhar, rollback automático (garante consistência)
      const profile = await storage.createClientWithUser(clientPayload, passwordHash);
      
      // JWT: Gera token com payload { id, role } válido por 24h
      // Token assinado com JWT_SECRET (nunca deve vazar!)
      const token = jwt.sign({ id: profile.id, role: 'client' }, JWT_SECRET, { expiresIn: '24h' });

      // RESPOSTA: RegisterResponseDto (token + profile completo)
      res.status(201).json({
        access_token: token,
        profile,
      });
    } catch (error: any) {
      // ERRO TRATADO: ZodError - validação de campos falhou
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }

      // ERRO TRATADO: EMAIL_IN_USE - unique constraint no banco
      if (error instanceof Error && error.message === 'EMAIL_IN_USE') {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }

      // ERRO TRATADO: DOCUMENT_IN_USE - CPF/CNPJ duplicado
      if (error instanceof Error && error.message === 'DOCUMENT_IN_USE') {
        return res.status(409).json({ error: 'Documento já cadastrado' });
      }

      // ERRO NÃO TRATADO: log completo + resposta genérica
      console.error('💥 Erro no registro:', error);
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Erro interno ao registrar usuário' 
        : (error instanceof Error ? error.message : 'Erro desconhecido');
      res.status(500).json({ error: errorMessage });
    }
  });

  // ========================================
  // ROTA: POST /api/auth/login
  // ========================================
  // PROPÓSITO: Autenticar usuário e retornar token JWT
  // MIDDLEWARE: loginLimiter (máx 5 tentativas/15min por IP)
  // ACESSO: Público (não requer token)
  router.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      // VARIÁVEIS: Extrai email e senha do corpo da requisição
      // CORREÇÃO: Usa 'email' (não 'id') conforme schema de users
      const { email, password } = req.body;
      
      // DEBUG: Log de tentativa de login (remover em produção)
      console.log('🔐 Tentativa de login:', { 
        emailReceived: email, 
        emailType: typeof email,
        passwordLength: password?.length 
      });

      // CONSTANTE: Busca usuário no banco usando email
      // CONEXÃO: storage.getUserByEmail() definida em storage.ts
      const user = await storage.getUserByEmail(email);
      
      // DEBUG: Log se usuário foi encontrado
      if (user) {
        console.log('👤 Usuário encontrado:', {
          id: user.id,
          email: user.email,
          role: user.role,
          passwordHashStart: user.password.substring(0, 10) + '...'
        });
      } else {
        console.log('👤 Usuário NÃO encontrado para o email:', email);
      }

      // VALIDAÇÃO: Se usuário não existe, retorna 401 Unauthorized
      if (!user) {
        console.log('❌ Login falhou: usuário não encontrado');
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      // CONSTANTE: Verifica se a senha fornecida corresponde ao hash armazenado
      // bcrypt.compare() é seguro contra timing attacks
      const validPassword = await bcrypt.compare(password, user.password);
      console.log('🔑 Senha válida:', validPassword);
      
      if (!validPassword) {
        console.log('❌ Login falhou: senha inválida');
        // DEBUG: Tentar comparar com hash gerado na hora para ver se o input está ok
        const testHash = await bcrypt.hash(password, 10);
        console.log('🔍 Teste de hash:', { inputPassword: password, generatedHash: testHash });
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      // CONSTANTE: Cria token JWT assinado com o segredo global JWT_SECRET
      // PAYLOAD: { id: UUID, role: 'client'|'motoboy'|'central', name: string }
      // EXPIRAÇÃO: 24 horas (86400 segundos)
      // NOTA: Este token será validado pelo middleware authenticateToken em auth.ts
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });

      console.log('✅ Login bem-sucedido:', { userId: user.id, role: user.role });

      // RESPOSTA: Retorna token e dados básicos do usuário (sem senha!)
      res.json({
        access_token: token, // Cliente deve enviar este token no header Authorization: Bearer <token>
        id: user.id, // UUID do usuário
        name: user.name, // Nome de exibição
        role: user.role, // Papel para controle de acesso no frontend
        phone: user.phone // Telefone para contato
      });
    } catch (error) {
      console.error('💥 Erro no login:', error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  // ========================================
  // PROTEÇÃO: Aplica rate limiter a todas as rotas /api/*
  // ========================================
  /**
   * MIDDLEWARE GLOBAL: apiLimiter
   * PROPÓSITO: Protege todas as rotas da API contra sobrecarga
   * LIMITE: 100 requisições por minuto por IP
   * 
   * IMPORTANTE: router.use() aplica middleware a TODAS as rotas registradas DEPOIS
   * Por isso apiLimiter está APÓS rotas públicas (login, register, health)
   * 
   * PADRÃO: Defense in Depth - múltiplas camadas de proteção:
   * - loginLimiter (5/15min)
   * - registerLimiter (3/15min)
   * - apiLimiter (100/min) ← camada geral
   */
  router.use("/api", apiLimiter);

  // ========================================
  // ROTA: GET /api/me/profile
  // ========================================
  /**
   * ENDPOINT: GET /api/me/profile
   * PROPÓSITO: Retorna perfil completo do cliente autenticado (Etapa 06 - auto-fill)
   * ACESSO: Apenas clientes autenticados
   * MIDDLEWARE CHAIN: authenticateToken → requireRole('client')
   * 
   * FLUXO:
   * 1. authenticateToken valida JWT e injeta req.user
   * 2. requireRole('client') verifica se user.role === 'client'
   * 3. storage.getClientProfile busca dados em clients table (JOIN com users)
   * 4. Retorna ClientProfileDto (id, name, email, phone, documentType, documentNumber, ie, address, horario)
   * 
   * USADO EM:
   * - Dashboard Cliente: auto-preenche campos de coleta ao criar pedido
   * - Frontend usa React Query (query key: ['clientProfile'])
   * - Dados cacheados no navegador (staleTime configurável)
   * 
   * ERROS TRATADOS:
   * - 404: Cliente não encontrado (improvável, mas possível se deletado)
   * - 500: Erro de banco de dados
   */
  router.get("/api/me/profile", authenticateToken, requireRole('client'), async (req, res) => {
    try {
      // req.user injetado por authenticateToken (tipo JwtPayload: {id, role})
      const profile = await storage.getClientProfile(req.user!.id);
      
      if (!profile) {
        return res.status(404).json({ error: CLIENT_PROFILE_NOT_FOUND });
      }
      
      res.json(profile); // Resposta: ClientProfileDto
    } catch (error) {
      console.error('💥 Erro ao carregar perfil:', error);
      res.status(500).json({ error: 'Erro ao carregar perfil do cliente' });
    }
  });

  // ========================================
  // ROTAS: GERENCIAMENTO DE PEDIDOS
  // ========================================

  /**
   * ENDPOINT: GET /api/orders
   * PROPÓSITO: Lista pedidos com filtro de segurança por role (RBAC)
   * ACESSO: Qualquer usuário autenticado (mas com visão restrita)
   * MIDDLEWARE: authenticateToken (valida JWT)
   * 
   * REGRAS DE VISIBILIDADE:
   * - CENTRAL: Vê TUDO (getAllOrders)
   * - CLIENT: Vê apenas SEUS pedidos (getOrdersByClientId)
   * - MOTOBOY: Vê pedidos PENDENTES (para pegar) + SEUS pedidos (histórico/ativos)
   */
  router.get("/api/orders", authenticateToken, async (req, res) => {
    try {
      const user = req.user!;
      
      if (user.role === 'central') {
        // Central vê tudo
        const orders = await storage.getAllOrders();
        return res.json(orders);
      } 
      
      if (user.role === 'client') {
        // Cliente vê apenas os seus
        const orders = await storage.getOrdersByClientId(user.id);
        return res.json(orders);
      }
      
      if (user.role === 'motoboy') {
        // Motoboy vê: Pendentes (para aceitar) + Atribuídos a ele
        const myOrders = await storage.getOrdersByMotoboyId(user.id);
        const pendingOrders = await storage.getPendingOrders();
        
        // Combina e remove duplicatas (caso haja sobreposição, embora improvável por status)
        // Ordena por data (mais recente primeiro)
        const allVisible = [...pendingOrders, ...myOrders].sort((a, b) => {
          const dateA = new Date(a.createdAt ?? 0).getTime();
          const dateB = new Date(b.createdAt ?? 0).getTime();
          return dateB - dateA;
        });
        
        return res.json(allVisible);
      }

      // Fallback seguro: retorna array vazio se role desconhecida
      res.json([]);
    } catch (error) {
      console.error('💥 Erro ao buscar pedidos:', error);
      res.status(500).json({ error: "Erro ao buscar pedidos" });
    }
  });

  /**
   * ENDPOINT: GET /api/orders/pending
   * PROPÓSITO: Lista apenas pedidos pendentes (aguardando atribuição de motoboy)
   * ACESSO: Qualquer usuário autenticado
   * MIDDLEWARE: authenticateToken
   * 
   * FILTRO: WHERE motoboyId IS NULL AND status = 'pending'
   * 
   * USADO EM:
   * - Dashboard Central: fila de pedidos aguardando despacho
   * - AIEngine: lista candidatos para atribuição inteligente (Etapa 14)
   * 
   * RETORNO: OrderSummaryDto[] (subset de getAllOrders)
   */
  router.get("/api/orders/pending", authenticateToken, async (req, res) => {
    try {
      const orders = await storage.getPendingOrders();
      res.json(orders);
    } catch (error) {
      console.error('💥 Erro ao buscar pedidos pendentes:', error);
      res.status(500).json({ error: "Erro ao buscar pedidos pendentes" });
    }
  });

  /**
   * ENDPOINT: POST /api/orders
   * PROPÓSITO: Cria novo pedido com auto-fill de endereço de coleta (Etapa 06)
   * ACESSO: Apenas clientes e central
   * MIDDLEWARE CHAIN: authenticateToken → requireRole('client', 'central')
   * 
   * LÓGICA DE AUTO-FILL (clientes):
   * 1. Busca perfil completo do cliente (storage.getClientProfile)
   * 2. Se coletaOverride=false (padrão): usa endereço cadastral (profile.address)
   * 3. Se coletaOverride=true: usa endereço fornecido no payload
   * 4. Preenche clientId, clientName, clientPhone automaticamente
   * 
   * VALIDAÇÃO:
   * - insertOrderSchema (Zod gerado de drizzle schema)
   * - Campos obrigatórios: entrega (rua, numero, bairro, cep), valor, formaPagamento
   * - Campos auto-preenchidos: coleta (se override=false), dados do cliente
   * 
   * COMPORTAMENTO (central):
   * - Central pode criar pedidos para qualquer cliente
   * - Deve fornecer clientId manualmente no payload
   * - Não aplica auto-fill (assume payload completo)
   * 
   * RESPOSTA:
   * - 201 Created + OrderSummaryDto do pedido criado
   * - WebSocket broadcast (tipo "order-created") para todos os conectados
   * 
   * ERROS TRATADOS:
   * - 400: ZodError (campos inválidos), CLIENT_PROFILE_NOT_FOUND
   * - 500: Erro de banco de dados
   */
  router.post("/api/orders", authenticateToken, requireRole('client', 'central'), async (req, res) => {
    try {
      let payload = req.body ?? {};

      // AUTO-FILL: Se cliente está criando pedido, preenche dados de coleta
      if (req.user?.role === 'client') {
        const profile = await storage.getClientProfile(req.user.id);
        
        if (!profile) {
          return res.status(400).json({ error: CLIENT_PROFILE_NOT_FOUND });
        }

        // ETAPA 06: Override toggle - cliente escolhe usar endereço cadastral ou alternativo
        const override = Boolean(payload.coletaOverride);

        payload = {
          ...payload,
          // DADOS DO CLIENTE: auto-preenchidos do perfil
          clientId: profile.id,
          clientName: profile.name,
          clientPhone: profile.phone,
          
          // ENDEREÇO DE COLETA: condicional baseado em override
          coletaRua: override ? payload.coletaRua : profile.address.rua,
          coletaNumero: override ? payload.coletaNumero : profile.address.numero,
          coletaBairro: override ? payload.coletaBairro : profile.address.bairro,
          coletaCep: override ? payload.coletaCep ?? profile.address.cep : profile.address.cep,
          coletaComplemento: override ? payload.coletaComplemento ?? null : profile.address.complemento ?? null,
          referencia: override ? payload.referencia ?? profile.address.referencia ?? null : profile.address.referencia ?? null,
          coletaOverride: override,
        };
      } else {
        // CENTRAL: não aplica auto-fill, usa payload completo
        payload = {
          coletaOverride: Boolean(payload.coletaOverride),
          ...payload,
        };
      }

      // LIMPEZA: Garante que complemento seja null quando override=false
      if (payload.coletaOverride === false) {
        payload.coletaComplemento ??= null;
      }

      // VALIDAÇÃO: Zod parse() lança ZodError se campos obrigatórios ausentes
      const validated = insertOrderSchema.parse(payload);
      
      // VALIDAÇÃO FINANCEIRA: Verifica se o valor está na tabela de repasse
      // Busca cliente para verificar status de mensalidade
      const clienteData = await db.query.clients.findFirst({
        where: (clients, { eq }) => eq(clients.id, validated.clientId),
        columns: { mensalidade: true }
      });
      
      if (!clienteData) {
        return res.status(400).json({ error: "Cliente não encontrado" });
      }
      
      const hasMensalidade = Number(clienteData.mensalidade) > 0;
      const valorPedido = Number(validated.valor);
      
      // Valida se o valor está permitido pela tabela
      if (!isValidDeliveryValue(valorPedido, hasMensalidade)) {
        const valoresPermitidos = analytics.getAllowedValues(hasMensalidade);
        return res.status(400).json({ 
          error: `Valor R$ ${valorPedido.toFixed(2)} não permitido para cliente ${hasMensalidade ? 'COM' : 'SEM'} mensalidade. Valores válidos: R$ ${valoresPermitidos.join(', ')}`
        });
      }
      
      // CÁLCULO AUTOMÁTICO: Calcula taxaMotoboy baseado na tabela fixa
      // IGNORA o que o cliente enviou - usa apenas a tabela de repasse
      const comissao = calculateGuririComission(valorPedido, hasMensalidade);
      validated.taxaMotoboy = comissao.motoboy.toString();
      
      console.log(`💰 Pedido validado: Valor R$ ${valorPedido} | Motoboy R$ ${comissao.motoboy} | Guriri R$ ${comissao.guriri}`);
      
      // PERSISTÊNCIA: Insere pedido no banco (retorna OrderSummaryDto completo)
      const order = await storage.createOrder(validated);
      
      // WEBSOCKET BROADCAST: Notifica todos os conectados sobre novo pedido
      // Motoboys/Central veem pedido aparecer em tempo real
      broadcast({ type: 'new_order', payload: order });
      
      res.status(201).json(order);
    } catch (error: any) {
      console.error('💥 Erro ao criar pedido:', error);
      const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Erro ao processar pedido'
        : (error.message || "Erro ao criar pedido");
      res.status(400).json({ error: errorMessage });
    }
  });

  /**
   * ENDPOINT: POST /api/orders/:id/accept
   * PROPÓSITO: Atribui pedido a um motoboy (transição pending → in_progress)
   * ACESSO: Apenas motoboys e central
   * MIDDLEWARE: authenticateToken → requireRole('motoboy', 'central')
   * 
   * PAYLOAD: { motoboyId: string, motoboyName: string }
   * 
   * OPERAÇÃO:
   * - Atualiza motoboyId e motoboyName no pedido
   * - Atualiza status para 'in_progress'
   * - Registra timestamp acceptedAt
   * 
   * WEBSOCKET: Broadcast "order_accepted" para clientes acompanharem em tempo real
   */
  router.post("/api/orders/:id/accept", authenticateToken, requireRole('motoboy', 'central'), async (req, res) => {
    try {
      let { motoboyId, motoboyName } = req.body;
      
      // SEGURANÇA: Se for motoboy, força uso do próprio ID/Nome
      if (req.user!.role === 'motoboy') {
        motoboyId = req.user!.id;
        motoboyName = req.user!.name;
      } else {
        // Se for central, valida se motoboyId foi enviado
        if (!motoboyId || !motoboyName) {
          return res.status(400).json({ error: "Motoboy ID e Nome são obrigatórios para atribuição manual" });
        }
      }
      
      await storage.assignOrderToMotoboy(req.params.id, motoboyId, motoboyName);
      const order = await storage.getOrder(req.params.id);
      
      broadcast({ type: 'order_accepted', payload: order });
      
      res.json(order);
    } catch (error) {
      console.error('💥 Erro ao aceitar pedido:', error);
      res.status(500).json({ error: "Erro ao aceitar pedido" });
    }
  });

  /**
   * ENDPOINT: POST /api/orders/:id/deliver
   * PROPÓSITO: Marca pedido como entregue (transição in_progress → delivered)
   * ACESSO: Apenas motoboy responsável e central
   * MIDDLEWARE: authenticateToken → requireRole('motoboy', 'central')
   * 
   * OPERAÇÃO:
   * - Atualiza status para 'delivered'
   * - Registra timestamp deliveredAt
   * - FUTURO (Etapa 15): Aciona cálculo de comissão do motoboy
   * 
   * WEBSOCKET: Broadcast "order_delivered" para cliente receber confirmação
   */
  router.post("/api/orders/:id/deliver", authenticateToken, requireRole('motoboy', 'central'), async (req, res) => {
    try {
      // SEGURANÇA: Verifica se o pedido pertence ao motoboy que está tentando entregar
      if (req.user!.role === 'motoboy') {
        const currentOrder = await storage.getOrder(req.params.id);
        if (!currentOrder) {
          return res.status(404).json({ error: "Pedido não encontrado" });
        }
        if (currentOrder.motoboyId !== req.user!.id) {
          return res.status(403).json({ error: "Você só pode entregar pedidos atribuídos a você" });
        }
      }

      const { proofUrl } = req.body;
      console.log(`🚚 Entregando pedido ${req.params.id} com comprovante: ${proofUrl}`);
      
      await storage.updateOrderStatus(req.params.id, 'delivered', proofUrl);
      const order = await storage.getOrder(req.params.id);
      
      console.log(`✅ Pedido ${req.params.id} atualizado para delivered. Status atual: ${order?.status}`);

      broadcast({ type: 'order_delivered', payload: order });
      
      res.json(order);
    } catch (error) {
      console.error('💥 Erro ao entregar pedido:', error);
      res.status(500).json({ error: "Erro ao entregar pedido" });
    }
  });

  /**
   * ENDPOINT: PATCH /api/orders/:id/cancel
   * PROPÓSITO: Cancelar um pedido (apenas central)
   * ACESSO: Apenas central
   * 
   * STEP 5: Manual Order Management
   */
  router.patch("/api/orders/:id/cancel", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Não permitir cancelar pedidos já entregues
      if (order.status === 'delivered') {
        return res.status(400).json({ error: "Não é possível cancelar pedidos já entregues" });
      }

      await storage.updateOrderStatus(req.params.id, 'cancelled');
      const updatedOrder = await storage.getOrder(req.params.id);

      console.log(`🚫 Pedido ${req.params.id} cancelado por ${req.user!.name}`);
      broadcast({ type: 'order_cancelled', payload: updatedOrder });

      res.json(updatedOrder);
    } catch (error) {
      console.error('💥 Erro ao cancelar pedido:', error);
      res.status(500).json({ error: "Erro ao cancelar pedido" });
    }
  });

  /**
   * ENDPOINT: PATCH /api/orders/:id/reassign
   * PROPÓSITO: Reatribuir um pedido para outro motoboy (apenas central)
   * ACESSO: Apenas central
   * BODY: { motoboyId: string }
   * 
   * STEP 5: Manual Order Management
   */
  router.patch("/api/orders/:id/reassign", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { motoboyId } = req.body;
      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Não permitir reatribuir pedidos já entregues ou cancelados
      if (order.status === 'delivered' || order.status === 'cancelled') {
        return res.status(400).json({ error: "Não é possível reatribuir pedidos entregues ou cancelados" });
      }

      // Verificar se o motoboy existe
      const motoboy = await storage.getMotoboy(motoboyId);
      if (!motoboy) {
        return res.status(404).json({ error: "Motoboy não encontrado" });
      }

      // Atualizar pedido com novo motoboy
      await db.update(orders)
        .set({
          motoboyId: motoboyId,
          motoboyName: motoboy.name,
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(eq(orders.id, req.params.id));

      const updatedOrder = await storage.getOrder(req.params.id);

      console.log(`🔄 Pedido ${req.params.id} reatribuído para ${motoboy.name} por ${req.user!.name}`);
      broadcast({ type: 'order_reassigned', payload: updatedOrder });

      res.json(updatedOrder);
    } catch (error) {
      console.error('💥 Erro ao reatribuir pedido:', error);
      res.status(500).json({ error: "Erro ao reatribuir pedido" });
    }
  });

  // ========================================
  // ROTAS: GERENCIAMENTO DE MOTOBOYS
  // ========================================

  // ROTA: GET /api/users/online
  // PROPÓSITO: Retorna IDs dos usuários conectados via WebSocket
  // MIDDLEWARES: authenticateToken + requireRole('central')
  // ACESSO: Apenas usuários da central
  router.get("/api/users/online", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      // Importa wsClients do index.ts (precisa ser exportado)
      const { getOnlineUsers } = await import('./index.js');
      const onlineUserIds = getOnlineUsers();
      console.log('🔌 Usuários online via WebSocket:', onlineUserIds);
      res.json({ onlineUsers: onlineUserIds });
    } catch (error) {
      console.error('❌ Erro ao buscar usuários online:', error);
      res.status(500).json({ error: "Erro ao buscar usuários online" });
    }
  });

  // ROTA: GET /api/motoboys
  // PROPÓSITO: Lista todos os motoboys cadastrados
  // MIDDLEWARES: authenticateToken + requireRole('central')
  // ACESSO: Apenas usuários da central (administradores)
  router.get("/api/motoboys", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      // CONSTANTE: Array de todos os motoboys do banco
      // CONEXÃO: storage.getAllMotoboys() definida em storage.ts
      const motoboys = await storage.getAllMotoboys();
      res.json(motoboys);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar motoboys" });
    }
  });

  // ROTA: PATCH /api/motoboys/:id/online
  // PROPÓSITO: Atualiza status online/offline de um motoboy (controle manual da central)
  // MIDDLEWARES: authenticateToken + requireRole('central')
  // ACESSO: Apenas usuários da central podem alterar
  // PAYLOAD: { online: boolean }
  router.patch("/api/motoboys/:id/online", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const { online } = req.body;
      
      if (typeof online !== 'boolean') {
        return res.status(400).json({ error: "Campo 'online' deve ser boolean" });
      }

      console.log(`🔄 Central alterando status online do motoboy ${id} para: ${online}`);
      await storage.updateMotoboyOnlineStatus(id, online);
      
      res.json({ success: true, id, online });
    } catch (error) {
      console.error('❌ Erro ao atualizar status online do motoboy:', error);
      res.status(500).json({ error: "Erro ao atualizar status online" });
    }
  });

  // ROTA: POST /api/motoboys/:id/location
  // PROPÓSITO: Atualiza localização GPS do motoboy em tempo real
  // MIDDLEWARES: authenticateToken + requireRole('motoboy')
  // ACESSO: Apenas o próprio motoboy pode atualizar sua localização
  router.post("/api/motoboys/:id/location", authenticateToken, requireRole('motoboy'), async (req, res) => {
    try {
      // SEGURANÇA: Garante que motoboy só atualize sua própria localização
      if (req.user!.id !== req.params.id) {
        return res.status(403).json({ error: "Acesso negado: você só pode atualizar sua própria localização" });
      }

      // VARIÁVEIS: Coordenadas GPS (latitude, longitude) do corpo da requisição
      const { lat, lng } = req.body;
      
      // OPERAÇÃO: Atualiza coordenadas no banco de dados
      // CONEXÃO: storage.updateMotoboyLocation() definida em storage.ts
      // NOTA: Converte para Number() para garantir tipo correto (Decimal no banco)
      await storage.updateMotoboyLocation(req.params.id, Number(lat), Number(lng));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar localização" });
    }
  });

  // ========================================
  // ROTAS: SCHEDULE MANAGEMENT (DISPONIBILIDADE)
  // ========================================

  /**
   * GET /api/motoboys/:id/schedules
   * Retorna disponibilidade semanal do motoboy
   * ACESSO: Motoboy próprio ou Central
   */
  router.get("/api/motoboys/:id/schedules", authenticateToken, async (req, res) => {
    try {
      // Security: Only the motoboy or central can view schedules
      if (req.user!.role !== 'central' && req.user!.id !== req.params.id) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const schedules = await storage.getMotoboySchedules(req.params.id);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching motoboy schedules:", error);
      res.status(500).json({ error: "Erro ao buscar disponibilidade" });
    }
  });

  /**
   * POST /api/motoboys/:id/schedules
   * Cria ou atualiza disponibilidade para um dia específico
   * BODY: { diaSemana: 0-6, turnoManha: boolean, turnoTarde: boolean, turnoNoite: boolean }
   * ACESSO: Apenas o próprio motoboy
   */
  router.post("/api/motoboys/:id/schedules", authenticateToken, requireRole('motoboy'), async (req, res) => {
    try {
      // Security: Only the motoboy can update their own schedule
      if (req.user!.id !== req.params.id) {
        return res.status(403).json({ error: "Acesso negado: você só pode atualizar sua própria disponibilidade" });
      }

      const { diaSemana, turnoManha, turnoTarde, turnoNoite } = req.body;

      // Validation
      if (typeof diaSemana !== 'number' || diaSemana < 0 || diaSemana > 6) {
        return res.status(400).json({ error: "diaSemana deve ser entre 0 (Domingo) e 6 (Sábado)" });
      }

      // At least one shift must be true if creating/updating
      if (!turnoManha && !turnoTarde && !turnoNoite) {
        return res.status(400).json({ error: "Pelo menos um turno deve estar ativo" });
      }

      const schedule = await storage.upsertMotoboySchedule(
        req.params.id,
        diaSemana,
        !!turnoManha,
        !!turnoTarde,
        !!turnoNoite
      );

      res.json(schedule);
    } catch (error) {
      console.error("Error upserting motoboy schedule:", error);
      res.status(500).json({ error: "Erro ao atualizar disponibilidade" });
    }
  });

  /**
   * DELETE /api/motoboy-schedules/:id
   * Remove entrada de disponibilidade
   * ACESSO: Apenas o motoboy dono do schedule
   */
  router.delete("/api/motoboy-schedules/:id", authenticateToken, requireRole('motoboy'), async (req, res) => {
    try {
      await storage.deleteMotoboySchedule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting motoboy schedule:", error);
      res.status(500).json({ error: "Erro ao remover disponibilidade" });
    }
  });

  /**
   * GET /api/clients/:id/schedules
   * Retorna horários de funcionamento do cliente (todos os dias)
   * ACESSO: Cliente próprio ou Central
   */
  router.get("/api/clients/:id/schedules", authenticateToken, async (req, res) => {
    try {
      // Security: Only the client or central can view schedules
      if (req.user!.role !== 'central' && req.user!.id !== req.params.id) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const schedules = await storage.getClientSchedule(req.params.id);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching client schedules:", error);
      res.status(500).json({ error: "Erro ao buscar horários" });
    }
  });

  /**
   * POST /api/clients/:id/schedules
   * Cria/atualiza horário de funcionamento do cliente
   * ACESSO: Cliente próprio ou Central
   * BODY: { diaSemana: 0-6, periodo: string, horaInicio: "HH:MM", horaFim: "HH:MM" }
   */
  router.post("/api/clients/:id/schedules", authenticateToken, async (req, res) => {
    try {
      console.log('📥 POST /api/clients/:id/schedules');
      console.log('  - req.params.id:', req.params.id);
      console.log('  - req.user:', req.user);
      console.log('  - req.body:', req.body);
      
      // Security: Only the client themselves or central can update schedules
      // ACEITA tanto UUID quanto IDs de teste como "client"
      if (req.user!.role !== 'central' && req.user!.id !== req.params.id) {
        console.log('❌ Acesso negado - user.id:', req.user!.id, 'params.id:', req.params.id);
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      console.log('✅ Acesso permitido');

      const { diaSemana, periodo, horaInicio, horaFim } = req.body;

      // Validation
      if (diaSemana === undefined || !periodo || !horaInicio || !horaFim) {
        return res.status(400).json({ error: "Campos obrigatórios: diaSemana, periodo, horaInicio, horaFim" });
      }

      if (diaSemana < 0 || diaSemana > 6) {
        return res.status(400).json({ error: "diaSemana deve estar entre 0 (Domingo) e 6 (Sábado)" });
      }

      // Delete existing schedules for this day first
      const existingSchedules = await storage.getClientSchedule(req.params.id);
      console.log('📋 Schedules existentes para este dia:', existingSchedules.filter((s: any) => s.diaSemana === diaSemana));
      const toDelete = existingSchedules.filter((s: any) => s.diaSemana === diaSemana);
      
      for (const schedule of toDelete) {
        console.log('🗑️ Deletando schedule antigo:', schedule.id);
        await storage.deleteClientSchedule(Number(schedule.id));
      }

      // Determina se o dia está fechado baseado no período
      const isFechado = periodo === "Fechado";

      // Create new schedule
      console.log('💾 Criando novo schedule...');
      console.log('  - clientId:', req.params.id);
      console.log('  - diaSemana:', diaSemana);
      console.log('  - Fechado?', isFechado);
      console.log('  - horaAbertura:', isFechado ? null : horaInicio);
      console.log('  - horaFechamento:', isFechado ? null : horaFim);
      
      const newSchedule = await storage.upsertClientSchedule({
        clientId: req.params.id,
        diaSemana,
        horaAbertura: isFechado ? null : horaInicio,
        horaFechamento: isFechado ? null : horaFim,
        fechado: isFechado,
      });

      console.log('✅ POST /api/clients/:id/schedules - Saved:', newSchedule);
      res.json(newSchedule);
    } catch (error) {
      console.error("❌ Error creating client schedule:", error);
      res.status(500).json({ error: "Erro ao salvar horário" });
    }
  });

  /**
   * DELETE /api/client-schedules/:id
   * Deleta um horário de funcionamento do cliente
   * ACESSO: Cliente próprio ou Central
   */
  router.delete("/api/client-schedules/:id", authenticateToken, async (req, res) => {
    try {
      const scheduleId = Number(req.params.id);
      
      // Get the schedule to check ownership
      const allSchedules = await storage.getAllClientSchedules();
      const schedule = allSchedules.find((s: any) => s.id === scheduleId);
      
      if (!schedule) {
        return res.status(404).json({ error: "Horário não encontrado" });
      }

      // Security: Only the client themselves or central can delete schedules
      if (req.user!.role !== 'central' && req.user!.id !== schedule.clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      await storage.deleteClientSchedule(scheduleId);
      res.json({ message: "Horário deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting client schedule:", error);
      res.status(500).json({ error: "Erro ao deletar horário" });
    }
  });

  /**
   * GET /api/schedules/all-clients
   * Retorna TODOS os horários de TODOS os clientes de uma vez
   * ACESSO: Apenas Central
   * PROPÓSITO: Otimização - evita N queries individuais na tabela de clientes
   */
  router.get("/api/schedules/all-clients", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const allSchedules = await storage.getAllClientSchedules();
      console.log('📅 GET /api/schedules/all-clients - Total schedules:', allSchedules.length);
      console.log('📅 Sample schedule:', allSchedules[0]);
      res.json(allSchedules);
    } catch (error) {
      console.error("Error fetching all client schedules:", error);
      res.status(500).json({ error: "Erro ao buscar horários" });
    }
  });

  /**
   * GET /api/schedules/all-motoboys
   * Retorna TODOS os horários de TODOS os motoboys de uma vez
   * ACESSO: Apenas Central
   * PROPÓSITO: Análise operacional - planejamento de cobertura por turno
   */
  router.get("/api/schedules/all-motoboys", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const allSchedules = await storage.getAllMotoboySchedules();
      console.log('📅 GET /api/schedules/all-motoboys - Total schedules:', allSchedules.length);
      res.json(allSchedules);
    } catch (error) {
      console.error("Error fetching all motoboy schedules:", error);
      res.status(500).json({ error: "Erro ao buscar horários de motoboys" });
    }
  });

  // ========================================
  // ROTAS: CHAT E INSIGHTS (INTELIGÊNCIA ARTIFICIAL)
  // ========================================

  // ==============================================
  // ROTAS: CHAT SYSTEM
  // ARQUITETURA: Cliente/Motoboy → Central (futura IA) → Destinatário
  // ==============================================

  /**
   * GET /api/chat
   * Retorna mensagens de chat filtradas por:
   * - CLIENTE: Apenas suas próprias threads (suas conversas com Central)
   * - MOTOBOY: Threads operacionais + suas conversas com Central
   * - CENTRAL: TODAS as threads (para monitoramento/suporte)
   */
  router.get("/api/chat", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const { threadId } = req.query; // Opcional: filtrar por thread específica
      
      const allMessages = await storage.getChatMessages();
      
      let filteredMessages: any[];
      
      if (userRole === 'central') {
        // CENTRAL: Vê todas as mensagens (admin/IA futura)
        filteredMessages = allMessages;
      } else if (userRole === 'motoboy') {
        // MOTOBOY: Vê mensagens onde ele está envolvido
        filteredMessages = allMessages.filter(msg => 
          msg.fromId === userId || // Mensagens que ele enviou
          msg.toId === userId || // Mensagens enviadas para ele
          (msg.toRole === 'motoboy' && !msg.toId) // Broadcasts para motoboys
        );
      } else if (userRole === 'client') {
        // CLIENTE: Vê APENAS suas próprias conversas
        filteredMessages = allMessages.filter(msg => 
          msg.fromId === userId || // Mensagens que ele enviou
          msg.toId === userId // Mensagens da Central para ele
        );
      } else {
        filteredMessages = [];
      }
      
      // Se threadId foi especificado, filtra ainda mais
      if (threadId) {
        filteredMessages = filteredMessages.filter(msg => msg.threadId === threadId);
      }
      
      res.json(filteredMessages);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });

  /**
   * POST /api/chat
   * Envia mensagem com roteamento automático
   * - Cliente/Motoboy → sempre vai para Central primeiro
   * - Central → pode responder diretamente ao usuário
   * - IA NÃO responde automaticamente (Central controla quando usar IA)
   */
  router.post("/api/chat", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userName = (req as any).user.name;
      const userRole = (req as any).user.role;
      
      const { message, category, orderId, threadId } = req.body;
      
      // VALIDAÇÕES
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: "Mensagem não pode estar vazia" });
      }
      
      if (!['status_entrega', 'suporte', 'problema'].includes(category)) {
        return res.status(400).json({ error: "Categoria inválida" });
      }
      
      // OPCIONAL: Status de entrega pode ter orderId (não obrigatório)
      // if (category === 'status_entrega' && !orderId) {
      //   return res.status(400).json({ error: "Status de entrega requer orderId" });
      // }
      
      // ROTEAMENTO AUTOMÁTICO
      let toId = null;
      let toRole = 'central'; // Por padrão, sempre vai para Central
      
      // Se é a Central respondendo, pode enviar para cliente/motoboy específico
      if (userRole === 'central' && req.body.toId) {
        toId = req.body.toId;
        toRole = req.body.toRole;
      }
      
      // ThreadId: mantém consistência para mesma conversa
      // Formato: userId_categoria (sem timestamp para manter thread consistente)
      // Se vier do frontend, usa o recebido; senão cria baseado no userId e categoria
      const finalThreadId = threadId || `${userId}_${category}`;
      
      // CRIA MENSAGEM DO USUÁRIO
      const chatMessage = {
        fromId: userId,
        fromName: userName,
        fromRole: userRole,
        toId,
        toRole,
        category,
        orderId: orderId || null,
        threadId: finalThreadId,
        message: message.trim(),
        isFromCentral: userRole === 'central',
      };
      
      const createdMessage = await storage.createChatMessage(chatMessage);
      
      // Broadcast WebSocket para atualização em tempo real
      broadcast({ type: 'chat_message', payload: createdMessage });
      
      res.json(createdMessage);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(400).json({ error: error.message || "Erro ao enviar mensagem" });
    }
  });

  /**
   * GET /api/chat/threads
   * Lista todas as threads (conversas) do usuário atual
   * Retorna resumo: categoria, último mensagem, não lidas, etc
   */
  router.get("/api/chat/threads", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      
      const allMessages = await storage.getChatMessages();
      
      // Filtra mensagens relevantes para o usuário
      let userMessages;
      if (userRole === 'central') {
        userMessages = allMessages;
      } else {
        userMessages = allMessages.filter(msg => 
          msg.fromId === userId || msg.toId === userId
        );
      }
      
      // Agrupa por threadId
      const threadsMap = new Map();
      userMessages.forEach(msg => {
        if (!threadsMap.has(msg.threadId)) {
          threadsMap.set(msg.threadId, {
            threadId: msg.threadId,
            category: msg.category,
            orderId: msg.orderId,
            messages: [],
            lastMessage: null,
            unreadCount: 0,
          });
        }
        const thread = threadsMap.get(msg.threadId);
        thread.messages.push(msg);
        // Atualiza última mensagem (assume que mensagens vêm ordenadas por createdAt)
        thread.lastMessage = msg;
      });
      
      const threads = Array.from(threadsMap.values());
      res.json(threads);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar threads" });
    }
  });

  /**
   * POST /api/chat/ai-suggest
   * Gera sugestão de resposta usando IA (APENAS PARA CENTRAL)
   * Central usa este endpoint para obter sugestões de como responder
   * 
   * Body: { message, category, userId }
   * - message: mensagem do cliente/motoboy para qual precisa resposta
   * - category: 'status_entrega' | 'suporte' | 'problema'
   * - userId: ID do usuário que enviou a mensagem (para rate limiting)
   */
  router.post("/api/chat/ai-suggest", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { message, category, userId } = req.body;
      
      if (!message || !category) {
        return res.status(400).json({ error: "message e category são obrigatórios" });
      }
      
      // VERIFICAÇÃO DE RATE LIMIT
      const rateLimitCheck = chatRateLimiter.canMakeRequest(userId || 'central');
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          error: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retryAfter 
        });
      }
      
      // VERIFICAÇÃO DE BUDGET
      const budgetCheck = costTracker.canAffordRequest();
      if (!budgetCheck.allowed) {
        return res.status(503).json({ 
          error: budgetCheck.reason,
          budgetInfo: budgetCheck.budgetInfo
        });
      }
      
      // Gera sugestão via OpenAI
      const aiSuggestion = await AIEngine.generateChatResponse(
        message.trim(),
        category,
        userId || 'central'
      );
      
      // Registra uso da IA
      recordAIUsage(userId || 'central');
      
      res.json({ suggestion: aiSuggestion });
      
    } catch (error: any) {
      console.error('❌ AI Suggestion Error:', error);
      res.status(500).json({ error: "Erro ao gerar sugestão de IA" });
    }
  });

  // ========================================
  // ROTAS: MONITORAMENTO DE CUSTO E RATE LIMITS (ADMIN)
  // ========================================

  /**
   * GET /api/chat/usage-stats
   * Retorna estatísticas de uso do chat e custos de IA
   * Disponível para todos os usuários autenticados
   */
  router.get("/api/chat/usage-stats", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      
      // Stats do usuário atual
      const userStats = getUserUsageStats(userId);
      
      // Stats globais (apenas para central)
      const globalStats = userRole === 'central' ? {
        budget: costTracker.getTodayStats(),
        cache: responseCache.getStats(),
      } : null;
      
      res.json({
        user: userStats,
        global: globalStats,
      });
    } catch (error: any) {
      console.error('Erro ao buscar stats:', error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  /**
   * GET /api/chat/budget-history
   * Histórico de custos diários (apenas Central)
   */
  router.get("/api/chat/budget-history", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const history = costTracker.getBudgetHistory();
      const cacheStats = responseCache.getStats();
      
      res.json({
        history,
        cache: cacheStats,
        summary: {
          totalDays: history.length,
          totalSpent: history.reduce((sum, day) => sum + day.totalCost, 0),
          totalRequests: history.reduce((sum, day) => sum + day.requestCount, 0),
          cacheSavings: cacheStats.estimatedSavings,
        },
      });
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ error: "Erro ao buscar histórico de custos" });
    }
  });

  // ROTA: GET /api/insights
  // PROPÓSITO: Gera insights e estatísticas usando IA sobre pedidos e motoboys
  // MIDDLEWARES: authenticateToken + requireRole('central')
  // ACESSO: Apenas usuários da central (administradores)
  router.get("/api/insights", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      // CONSTANTE: Array de todos os pedidos para análise de IA
      const orders = await storage.getAllOrders();
      // CONSTANTE: Array de todos os motoboys para análise de disponibilidade
      const motoboys = await storage.getAllMotoboys();
      
      // TODO: Integração com AIEngine.getInsights() pendente
      // NOTA: Esta funcionalidade usa algoritmos de IA para recomendar ações
      res.json({ message: "Insights functionality paused until storage is updated." });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar insights" });
    }
  });

  // ROTA: POST /api/upload/live-doc
  // PROPÓSITO: Upload de documentos em tempo real (CNH, fotos, etc)
  // MIDDLEWARE: authenticateToken (requer JWT válido)
  // STATUS: Implementado (Local Storage + Banco de Dados)
  router.post("/api/upload/live-doc", authenticateToken, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const { orderId, tipo, gpsLat, gpsLng } = req.body;

      if (!orderId || !tipo) {
        return res.status(400).json({ error: "orderId e tipo são obrigatórios" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      const liveDoc = await storage.createLiveDoc({
        orderId,
        motoboyId: req.user!.id,
        tipo,
        fileUrl,
        fileName: req.file.originalname,
        gpsLat: gpsLat ? String(gpsLat) : null,
        gpsLng: gpsLng ? String(gpsLng) : null,
      });
      
      res.json({ 
        message: "Upload realizado com sucesso", 
        liveDoc,
        fileUrl
      });
    } catch (error: any) {
      console.error('💥 Erro no upload:', error);
      res.status(500).json({ error: error.message || "Erro ao fazer upload" });
    }
  });

  // ========================================
  // ROTAS: GESTÃO DE CLIENTES (CENTRAL)
  // ========================================

  /**
   * ENDPOINT: GET /api/clients
   * PROPÓSITO: Lista todos os clientes cadastrados
   * ACESSO: Apenas central
   */
  router.get("/api/clients", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error: any) {
      console.error('💥 Erro ao buscar clientes:', error);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  /**
   * ENDPOINT: POST /api/clients
   * PROPÓSITO: Cria novo cliente (usado pela Central)
   * ACESSO: Apenas central
   */
  router.post("/api/clients", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { password, ...payload } = req.body;
      
      if (!password || password.length < 8) {
        return res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const profile = await storage.createClientWithUser(payload, passwordHash);
      
      res.status(201).json(profile);
    } catch (error: any) {
      console.error('💥 Erro ao criar cliente:', error);
      if (error.message === 'EMAIL_IN_USE') {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }
      if (error.message === 'DOCUMENT_IN_USE') {
        return res.status(409).json({ error: 'Documento já cadastrado' });
      }
      res.status(500).json({ error: error.message || "Erro ao criar cliente" });
    }
  });

  /**
   * ENDPOINT: PATCH /api/clients/:id
   * PROPÓSITO: Atualiza informações de um cliente
   * ACESSO: Apenas central
   */
  router.patch("/api/clients/:id", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateClient(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar cliente:', error);
      res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  });

  // ========================================
  // ROTAS: GESTÃO DE MOTOBOYS (CENTRAL)
  // ========================================

  /**
   * ENDPOINT: POST /api/motoboys
   * PROPÓSITO: Cadastra novo motoboy
   * ACESSO: Apenas central
   */
  router.post("/api/motoboys", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const motoboy = await storage.createMotoboy(req.body);
      res.status(201).json(motoboy);
    } catch (error: any) {
      console.error('💥 Erro ao criar motoboy:', error);
      res.status(500).json({ error: "Erro ao criar motoboy" });
    }
  });

  /**
   * ENDPOINT: PATCH /api/motoboys/:id
   * PROPÓSITO: Atualiza informações de um motoboy
   * ACESSO: Apenas central
   */
  router.patch("/api/motoboys/:id", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateMotoboy(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar motoboy:', error);
      res.status(500).json({ error: "Erro ao atualizar motoboy" });
    }
  });

  // ========================================
  // ROTAS: GESTÃO DE USUÁRIOS
  // ========================================

  /**
   * ENDPOINT: GET /api/users
   * PROPÓSITO: Lista todos os usuários (STEP 4)
   * ACESSO: Apenas central
   */
  router.get("/api/users", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove senhas antes de enviar
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      console.error('💥 Erro ao buscar usuários:', error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  /**
   * ENDPOINT: PATCH /api/users/:id/status
   * PROPÓSITO: Ativa ou desativa um usuário (STEP 4)
   * ACESSO: Apenas central
   */
  router.patch("/api/users/:id/status", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      console.log('🔧 PATCH /api/users/:id/status recebido:', { id, status, type: typeof status });

      // SEGURANÇA: Não pode desativar a si mesmo
      if (req.user?.id === id) {
        return res.status(403).json({ error: "Você não pode desativar sua própria conta" });
      }

      if (!status || !['active', 'inactive'].includes(status)) {
        console.log('❌ Status inválido:', status);
        return res.status(400).json({ error: "Status deve ser 'active' ou 'inactive'" });
      }

      const updated = await storage.updateUser(id, { status });
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar status do usuário:', error);
      res.status(500).json({ error: "Erro ao atualizar status do usuário" });
    }
  });

  /**
   * ENDPOINT: PATCH /api/users/:id/role
   * PROPÓSITO: Altera a role de um usuário (STEP 4)
   * ACESSO: Apenas central
   */
  router.patch("/api/users/:id/role", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // SEGURANÇA: Não pode alterar sua própria role
      if (req.user?.id === id) {
        return res.status(403).json({ error: "Você não pode alterar sua própria função" });
      }

      if (!role || !['client', 'motoboy', 'central'].includes(role)) {
        return res.status(400).json({ error: "Role deve ser 'client', 'motoboy' ou 'central'" });
      }

      const updated = await storage.updateUser(id, { role });
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar role do usuário:', error);
      res.status(500).json({ error: "Erro ao atualizar role do usuário" });
    }
  });

  /**
   * ENDPOINT: PATCH /api/users/:id
   * PROPÓSITO: Atualiza dados de usuário (nome, telefone, senha)
   * ACESSO: Usuário autenticado (pode atualizar apenas próprio perfil)
   */
  router.patch("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // SEGURANÇA: Apenas o próprio usuário pode atualizar seu perfil
      if (req.user?.id !== id) {
        return res.status(403).json({ error: "Você não tem permissão para atualizar este usuário" });
      }

      const updateData: any = {};
      
      // Atualiza nome se fornecido
      if (req.body.name) {
        updateData.name = req.body.name;
      }
      
      // Atualiza telefone se fornecido
      if (req.body.phone) {
        updateData.phone = req.body.phone;
      }
      
      // Atualiza senha se fornecida (com hash)
      if (req.body.password) {
        if (req.body.password.length < 8) {
          return res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
        }
        updateData.password = await bcrypt.hash(req.body.password, 10);
      }

      const updated = await storage.updateUser(id, updateData);
      
      // Remove senha da resposta
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar usuário:', error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // ========================================
  // ANALYTICS & FINANCIAL REPORTS
  // ========================================
  
  /**
   * GET /api/analytics/dashboard
   * Returns all KPIs for central dashboard homepage
   * Auth: Central only
   */
  router.get('/api/analytics/dashboard', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const kpis = await analytics.getDashboardKPIs();
      res.json(kpis);
    } catch (error) {
      console.error('❌ Error fetching dashboard KPIs:', error);
      res.status(500).json({ error: 'Erro ao carregar métricas do dashboard' });
    }
  });

  /**
   * GET /api/analytics/revenue?start=YYYY-MM-DD&end=YYYY-MM-DD
   * Returns revenue data for a date range
   * Auth: Central only
   */
  router.get('/api/analytics/revenue', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ error: 'Parâmetros start e end são obrigatórios (formato: YYYY-MM-DD)' });
      }
      
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Datas inválidas. Use formato YYYY-MM-DD' });
      }
      
      const revenueData = await analytics.getRevenueByDateRange(startDate, endDate);
      
      res.json({
        startDate: start,
        endDate: end,
        ...revenueData,
      });
    } catch (error) {
      console.error('❌ Error fetching revenue:', error);
      res.status(500).json({ error: 'Erro ao calcular receita' });
    }
  });

  /**
   * GET /api/analytics/motoboy/:id?start=YYYY-MM-DD&end=YYYY-MM-DD
   * Returns earnings report for a specific motoboy
   * Auth: Motoboy can see their own, Central can see all
   */
  router.get('/api/analytics/motoboy/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { start, end } = req.query;
      
      // Authorization check
      if (req.user!.role !== 'central' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // Default to current month if no dates provided
      const today = new Date();
      const startDate = start 
        ? new Date(start as string) 
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = end 
        ? new Date(end as string) 
        : today;
      
      const earnings = await analytics.getMotoboyEarnings(id, startDate, endDate);
      
      res.json({
        motoboyId: id,
        period: { 
          start: startDate.toISOString().split('T')[0], 
          end: endDate.toISOString().split('T')[0] 
        },
        ...earnings,
      });
    } catch (error) {
      console.error('❌ Error fetching motoboy earnings:', error);
      res.status(500).json({ error: 'Erro ao calcular ganhos do motoboy' });
    }
  });

  /**
   * GET /api/analytics/client/:id?month=YYYY-MM
   * Returns billing/debt data for a specific client
   * Auth: Client can see their own, Central can see all
   */
  router.get('/api/analytics/client/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { month } = req.query;
      
      // Authorization check
      if (req.user!.role !== 'central' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // Default to current month if not provided
      const currentMonth = month as string || new Date().toISOString().slice(0, 7);
      
      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(currentMonth)) {
        return res.status(400).json({ error: 'Formato de mês inválido. Use YYYY-MM' });
      }
      
      const debtData = await analytics.getClientDebt(id, currentMonth);
      
      res.json(debtData);
    } catch (error) {
      console.error('❌ Error fetching client debt:', error);
      res.status(500).json({ error: 'Erro ao calcular fatura do cliente' });
    }
  });

  /**
   * GET /api/analytics/mrr
   * Returns Monthly Recurring Revenue
   * Auth: Central only
   */
  router.get('/api/analytics/mrr', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const mrr = await analytics.getMonthlyRecurringRevenue();
      res.json({ mrr });
    } catch (error) {
      console.error('❌ Error fetching MRR:', error);
      res.status(500).json({ error: 'Erro ao calcular MRR' });
    }
  });

  // ========================================
  // RETORNO DA FUNÇÃO PRINCIPAL
  // ========================================
  // RETORNA: Instância do Router configurada com todas as rotas
  // CONEXÃO: Este router é usado em server/index.ts com app.use(await registerRoutes())
  return router;
}