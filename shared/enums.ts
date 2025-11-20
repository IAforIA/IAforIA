/**
 * ARQUIVO: shared/enums.ts
 * PROPÓSITO: Definição de Enums compartilhados entre frontend e backend
 */

export enum UserRole {
  CENTRAL = 'central',
  CLIENT = 'client',
  MOTOBOY = 'motoboy'
}

export enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}
