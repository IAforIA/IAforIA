/**
 * ARQUIVO: server/middleware/auth.ts
 * PROPÓSITO: Middlewares de autenticação e autorização JWT (JSON Web Tokens)
 * 
 * MIDDLEWARES EXPORTADOS:
 * - authenticateToken: Valida JWT no header Authorization
 * - requireRole: Verifica se usuário tem papel (role) necessário
 * - optionalAuth: Autenticação opcional (continua sem token)
 * - verifyTokenFromQuery: Valida token de query string (WebSocket)
 */

// Express: Tipos para Request, Response, NextFunction
import { Request, Response, NextFunction } from 'express';
// jwt: Biblioteca para criar e validar tokens JWT
import jwt from 'jsonwebtoken';

// ========================================
// VARIÁVEL DE AMBIENTE: JWT_SECRET
// ========================================

// CRÍTICO: Garante que JWT_SECRET existe antes de iniciar autenticação
// NOTA: Usa JWT_SECRET dedicada (NÃO SESSION_SECRET) para segurança
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for security');
}

// CONSTANTE GLOBAL: Segredo para assinar e verificar tokens JWT
// CONEXÃO: Mesma constante usada em server/routes.ts (linha ~30)
// SEGURANÇA: Nunca expor este valor - usado apenas internamente
const JWT_SECRET = process.env.JWT_SECRET;

// ========================================
// TIPOS E INTERFACES
// ========================================

/**
 * INTERFACE EXPORTADA: AuthUser
 * PROPÓSITO: Define estrutura dos dados do usuário no token JWT
 * USADO EM: req.user após autenticação bem-sucedida
 * CAMPOS:
 *   - id: UUID do usuário (chave primária na tabela users)
 *   - role: Papel do usuário ('client' | 'motoboy' | 'central')
 */
export interface AuthUser {
  id: string;   // UUID do usuário autenticado
  role: string; // Papel para controle de acesso baseado em função (RBAC)
  name: string; // Nome do usuário para exibição
}

// ========================================
// EXTENSÃO DO TIPO EXPRESS REQUEST
// ========================================

/**
 * DECLARAÇÃO GLOBAL: Estende interface Request do Express
 * PROPÓSITO: Adiciona campo opcional 'user' ao objeto Request
 * RESULTADO: req.user fica disponível em todas as rotas após authenticateToken
 * TIPO: AuthUser | undefined
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser; // Campo opcional preenchido por authenticateToken
    }
  }
}

// ========================================
// MIDDLEWARE: AUTENTICAÇÃO JWT
// ========================================

/**
 * FUNÇÃO EXPORTADA: authenticateToken
 * PROPÓSITO: Middleware que valida token JWT do header Authorization
 * FORMATO ESPERADO: Authorization: Bearer <token>
 * COMPORTAMENTO:
 *   - Token válido: req.user preenchido, executa next()
 *   - Token ausente: retorna 401 Unauthorized
 *   - Token inválido: retorna 403 Forbidden
 * USADO EM: Todas as rotas protegidas em routes.ts
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // CONSTANTE: Header Authorization completo (ex: "Bearer eyJhbGc...")
  const authHeader = req.headers['authorization'];
  
  // CONSTANTE: Extrai o token removendo o prefixo "Bearer "
  // LÓGICA: authHeader.split(' ')[1] obtém a segunda parte após o espaço
  const token = authHeader && authHeader.split(' ')[1];

  // VALIDAÇÃO: Se não há token, retorna erro 401
  if (!token) {
    // 401 Unauthorized: Nenhuma credencial fornecida
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // CONSTANTE: Token decodificado e validado usando JWT_SECRET
    // TIPO: Garantimos que decoded segue a interface AuthUser
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // MODIFICAÇÃO: Anexa os dados do usuário ao objeto Request
    // NOTA: A partir daqui, todas as rotas podem acessar req.user
    req.user = decoded;
    
    // SUCESSO: Prossegue para o próximo middleware ou rota
    next();
  } catch (error) {
    // 403 Forbidden: Token inválido ou expirado
    // NOTA: jwt.verify() lança exceção se token for malformado, expirado ou assinatura inválida
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// ========================================
// MIDDLEWARE FACTORY: AUTORIZAÇÃO POR PAPEL (RBAC)
// ========================================

/**
 * FUNÇÃO EXPORTADA: requireRole(...allowedRoles)
 * PROPÓSITO: Factory function que retorna middleware de autorização baseado em papel
 * PARÂMETROS: ...allowedRoles - Lista de papéis permitidos ('client', 'motoboy', 'central')
 * RETORNA: Middleware que verifica se req.user.role está na lista permitida
 * COMPORTAMENTO:
 *   - Papel permitido: executa next()
 *   - Papel não permitido: retorna 403 Forbidden
 *   - req.user não existe: retorna 401 Unauthorized
 * USADO EM: Rotas com controle de acesso específico em routes.ts
 * EXEMPLO: requireRole('motoboy', 'central') permite apenas motoboys e central
 */
export function requireRole(...allowedRoles: string[]) {
  // RETORNA: Função middleware (closure que captura allowedRoles)
  return (req: Request, res: Response, next: NextFunction) => {
    // VALIDAÇÃO: Verifica se authenticateToken foi executado antes
    if (!req.user) {
      // NOTA: Teoricamente não deveria acontecer se authenticateToken estiver antes
      return res.status(401).json({ error: 'Authentication required' });
    }

    // VALIDAÇÃO: Verifica se o papel do usuário está na lista de papéis permitidos
    if (!allowedRoles.includes(req.user.role)) {
      // 403 Forbidden: Usuário autenticado mas sem permissão para este recurso
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // SUCESSO: Usuário tem papel adequado, prossegue
    next();
  };
}

// ========================================
// MIDDLEWARE: AUTENTICAÇÃO OPCIONAL
// ========================================

/**
 * FUNÇÃO EXPORTADA: optionalAuth
 * PROPÓSITO: Middleware que tenta autenticar, mas continua mesmo se falhar
 * COMPORTAMENTO:
 *   - Token válido: req.user preenchido
 *   - Token inválido ou ausente: req.user fica undefined, mas continua
 * USADO EM: Rotas que têm comportamento diferente para usuários autenticados vs anônimos
 * NOTA: Atualmente não usado no projeto, mas útil para endpoints híbridos
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // CONSTANTE: Header Authorization
  const authHeader = req.headers['authorization'];
  // CONSTANTE: Token extraído (pode ser undefined)
  const token = authHeader && authHeader.split(' ')[1];

  // LÓGICA: Só tenta validar se token existir
  if (token) {
    try {
      // CONSTANTE: Token decodificado
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
    } catch (error) {
      // Token inválido: loga aviso mas continua sem req.user
      console.warn("Invalid token provided for optional auth, proceeding without user context.");
    }
  }

  // SEMPRE continua, com ou sem autenticação
  next();
}

// ========================================
// FUNÇÃO UTILITÁRIA: AUTENTICAÇÃO WEBSOCKET
// ========================================

/**
 * FUNÇÃO EXPORTADA: verifyTokenFromQuery(token)
 * PROPÓSITO: Valida token JWT de query string (usado para WebSocket)
 * PARÂMETROS: token - String do token ou null
 * RETORNA: AuthUser se válido, null se inválido ou ausente
 * USADO EM: server/index.ts na conexão WebSocket (query param ?token=...)
 * MOTIVO: WebSocket não suporta headers customizados, então token vai na URL
 * EXEMPLO: ws://localhost:5000?token=eyJhbGc...
 */
export function verifyTokenFromQuery(token: string | null): AuthUser | null {
  // VALIDAÇÃO: Se token não fornecido, retorna null
  if (!token) {
    return null;
  }

  try {
    // CONSTANTE: Token decodificado e validado usando JWT_SECRET
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    // Token inválido: loga aviso e retorna null
    console.warn("Invalid token from query parameter.");
    return null;
  }
}
