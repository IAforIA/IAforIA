/**
 * 🛡️ ROLE VALIDATOR - Validação Automática de Acesso por Role
 * 
 * PROPÓSITO:
 * Centralizar lógica de autorização baseada em roles (central/client/motoboy)
 * 
 * REGRAS:
 * - central → sempre permitido (acesso total)
 * - client → apenas se resourceOwnerId === authUserId (isolamento)
 * - motoboy → apenas se resourceOwnerId === authUserId (isolamento)
 * 
 * INTEGRAÇÃO:
 * - /api/reports/clients/:id
 * - /api/reports/motoboys/:id
 * - /api/reports/orders
 */

import { Response } from 'express';

// ========================================
// TIPOS
// ========================================

export type UserRole = 'central' | 'client' | 'motoboy';

export interface AccessCheckParams {
  resourceOwnerId: string | number;
  authUserId: string | number;
  role: UserRole;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

// ========================================
// FUNÇÃO PRINCIPAL
// ========================================

/**
 * Valida se o usuário autenticado tem permissão para acessar o recurso
 * 
 * @param resourceOwnerId - ID do dono do recurso (ex: clientId no relatório)
 * @param authUserId - ID do usuário autenticado (do token JWT)
 * @param role - Role do usuário autenticado
 * @returns { allowed: boolean, reason?: string }
 * 
 * @example
 * ```typescript
 * const check = assertUserCanAccess(
 *   'cliente-123',
 *   'cliente-456',
 *   'client'
 * );
 * 
 * if (!check.allowed) {
 *   return res.status(403).json({ error: check.reason });
 * }
 * ```
 */
export function assertUserCanAccess(
  resourceOwnerId: string | number,
  authUserId: string | number,
  role: UserRole
): AccessCheckResult {
  // REGRA 1: Central sempre permitido (acesso total)
  if (role === 'central') {
    return { allowed: true };
  }

  // Normalizar IDs para string para comparação segura
  const normalizedResourceId = String(resourceOwnerId);
  const normalizedAuthId = String(authUserId);

  // REGRA 2: Client e Motoboy apenas acessam próprios recursos
  if (normalizedResourceId === normalizedAuthId) {
    return { allowed: true };
  }

  // REGRA 3: Acesso negado (tentativa de acesso cruzado)
  return {
    allowed: false,
    reason: `Acesso negado: ${role} tentou acessar recurso de outro usuário`,
  };
}

// ========================================
// MIDDLEWARE EXPRESS
// ========================================

/**
 * Middleware Express para validar acesso a recursos
 * 
 * @param getResourceOwnerId - Função para extrair resourceOwnerId do request
 * 
 * @example
 * ```typescript
 * app.get('/api/reports/clients/:id', 
 *   authenticateToken,
 *   validateResourceAccess((req) => req.params.id),
 *   async (req, res) => { ... }
 * );
 * ```
 */
export function validateResourceAccess(
  getResourceOwnerId: (req: any) => string | number
) {
  return (req: any, res: Response, next: Function) => {
    const resourceOwnerId = getResourceOwnerId(req);
    const authUserId = req.user.id;
    const role = req.user.role as UserRole;

    const check = assertUserCanAccess(resourceOwnerId, authUserId, role);

    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        error: check.reason || 'Acesso negado',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Valida se role é válido
 */
export function isValidRole(role: string): role is UserRole {
  return ['central', 'client', 'motoboy'].includes(role);
}

/**
 * Retorna nível de permissão (maior = mais permissão)
 */
export function getRoleLevel(role: UserRole): number {
  switch (role) {
    case 'central':
      return 3;
    case 'client':
      return 2;
    case 'motoboy':
      return 1;
    default:
      return 0;
  }
}

/**
 * Verifica se role A tem mais permissão que role B
 */
export function hasHigherPermission(roleA: UserRole, roleB: UserRole): boolean {
  return getRoleLevel(roleA) > getRoleLevel(roleB);
}
