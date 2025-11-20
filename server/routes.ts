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
// AIEngine: Classe com lógica de atribuição inteligente de motoboys (definida em ai-engine.ts)
import { AIEngine } from "./ai-engine.ts";
// bcrypt: Biblioteca para hash e comparação segura de senhas
import bcrypt from "bcryptjs";
// jwt: Biblioteca para criar e validar tokens JWT (JSON Web Tokens)
import jwt from "jsonwebtoken";
// Schemas de validação Zod gerados automaticamente do Drizzle schema
import { insertOrderSchema, insertChatMessageSchema } from "@shared/schema";
import { clientOnboardingSchema } from "@shared/contracts";
// Middlewares de autenticação JWT
import { authenticateToken, requireRole, verifyTokenFromQuery } from "./middleware/auth.ts";
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
  max: 5, // Máximo de 5 tentativas por IP nesta janela
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

      await storage.updateOrderStatus(req.params.id, 'delivered');
      const order = await storage.getOrder(req.params.id);
      
      broadcast({ type: 'order_delivered', payload: order });
      
      res.json(order);
    } catch (error) {
      console.error('💥 Erro ao entregar pedido:', error);
      res.status(500).json({ error: "Erro ao entregar pedido" });
    }
  });

  // ========================================
  // ROTAS: GERENCIAMENTO DE MOTOBOYS
  // ========================================

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
  // ROTAS: CHAT E INSIGHTS (INTELIGÊNCIA ARTIFICIAL)
  // ========================================

  // ROTA: GET /api/chat
  // PROPÓSITO: Lista todas as mensagens do histórico de chat
  // MIDDLEWARE: authenticateToken + requireRole (apenas staff)
  // ACESSO: Restrito a Central e Motoboys (Clientes não veem chat operacional)
  router.get("/api/chat", authenticateToken, requireRole('central', 'motoboy'), async (req, res) => {
    try {
      // CONSTANTE: Array de todas as mensagens de chat do banco
      // CONEXÃO: storage.getChatMessages() definida em storage.ts
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });

  // ROTA: POST /api/chat
  // PROPÓSITO: Envia nova mensagem de chat
  // MIDDLEWARE: authenticateToken (requer JWT válido)
  // ACESSO: Qualquer usuário autenticado pode enviar mensagens
  router.post("/api/chat", authenticateToken, async (req, res) => {
    try {
      // CONSTANTE: Mensagem validada pelo schema Zod
      // CONEXÃO: insertChatMessageSchema definido em @shared/schema.ts
      const validated = insertChatMessageSchema.parse(req.body);
      
      // CONSTANTE: Mensagem recém-criada no banco de dados
      // CONEXÃO: storage.createChatMessage() definida em storage.ts
      const message = await storage.createChatMessage(validated);
      
      // BROADCAST: Notifica todos os clientes WebSocket sobre nova mensagem
      // NOTA: Chat funciona em tempo real - todos veem a mensagem instantaneamente
      broadcast({ type: 'chat_message', payload: message });
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao enviar mensagem" });
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
  // STATUS: Implementado (Local Storage)
  router.post("/api/upload/live-doc", authenticateToken, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      
      // TODO: Salvar referência no banco de dados (tabela liveDocs)
      // Por enquanto retorna o caminho do arquivo salvo
      res.json({ 
        message: "Upload realizado com sucesso", 
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
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
  // RETORNO DA FUNÇÃO PRINCIPAL
  // ========================================
  // RETORNA: Instância do Router configurada com todas as rotas
  // CONEXÃO: Este router é usado em server/index.ts com app.use(await registerRoutes())
  return router;
}