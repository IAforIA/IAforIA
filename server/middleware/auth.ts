import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// CRÍTICO: Usa a variável de ambiente dedicada para o JWT, não SESSION_SECRET
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for security');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Define a interface para os dados do usuário que serão anexados ao objeto Request do Express
export interface AuthUser {
  id: string;
  role: string;
}

// Estende a interface do Request do Express para incluir o campo opcional 'user'
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware para autenticar um token JWT presente no cabeçalho Authorization.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  // Extrai o token da string 'Bearer TOKEN'
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // 401 Unauthorized: Nenhuma credencial fornecida
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verifica o token usando o segredo seguro
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    // Anexa os dados do usuário decodificado ao objeto Request
    req.user = decoded;
    next();
  } catch (error) {
    // 403 Forbidden: Token inválido ou expirado (comum para tokens JWT inválidos)
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Função que retorna um middleware para verificar se o usuário autenticado possui uma das roles permitidas.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verifica se o middleware authenticateToken foi executado primeiro
    if (!req.user) {
      // Teoricamente, isso não deveria acontecer se authenticateToken vier antes
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // 403 Forbidden: Usuário não tem permissão para acessar o recurso
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Middleware de autenticação opcional. Tenta autenticar, mas continua mesmo se falhar.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
    } catch (error) {
      // Token é inválido, mas continuamos sem o req.user definido
      console.warn("Invalid token provided for optional auth, proceeding without user context.");
    }
  }

  next();
}

/**
 * Função utilitária para verificar um token diretamente de um query parameter (útil para WebSockets).
 */
export function verifyTokenFromQuery(token: string | null): AuthUser | null {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    console.warn("Invalid token from query parameter.");
    return null;
  }
}
