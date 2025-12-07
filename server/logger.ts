/**
 * 📝 LOGGER ESTRUTURADO - Sistema de Logs Centralizado
 * 
 * PROPÓSITO:
 * Centralizar todos os logs do sistema com formato estruturado e persistência
 * 
 * FUNÇÕES:
 * - info(event, data) - Logs informativos (ex: rota acessada)
 * - warn(event, data) - Avisos (ex: tentativa de acesso sem permissão)
 * - error(event, data) - Erros críticos (ex: falha no banco de dados)
 * 
 * ARQUIVOS:
 * - logs/app.log - Todos os logs (info, warn, error)
 * - logs/error.log - Apenas erros (error)
 * 
 * FORMATO:
 * ```
 * 2024-01-24T10:30:45.123Z [INFO] route_accessed { path: '/api/orders', user: 'cliente-123' }
 * 2024-01-24T10:30:46.456Z [WARN] access_denied { userId: 'cliente-123', resource: 'cliente-456' }
 * 2024-01-24T10:30:47.789Z [ERROR] database_error { message: 'Connection timeout', stack: '...' }
 * ```
 */

import fs from 'fs';
import path from 'path';

// ========================================
// CONFIGURAÇÕES
// ========================================

const LOGS_DIR = path.join(process.cwd(), 'logs');
const APP_LOG_FILE = path.join(LOGS_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOGS_DIR, 'error.log');

// Criar diretório de logs se não existir
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ========================================
// TIPOS
// ========================================

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  data?: any;
}

// ========================================
// FUNÇÃO DE LOG ESTRUTURADO
// ========================================

/**
 * Grava log em formato estruturado
 * 
 * @param level - Nível do log (INFO, WARN, ERROR)
 * @param event - Nome do evento (ex: 'route_accessed', 'access_denied')
 * @param data - Dados adicionais (objeto JSON)
 * 
 * @example
 * ```typescript
 * log('INFO', 'route_accessed', { path: '/api/orders', user: 'cliente-123' });
 * log('ERROR', 'database_error', { message: err.message, stack: err.stack });
 * ```
 */
function log(level: LogLevel, event: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data,
  };

  // Formato de linha: [TIMESTAMP] [LEVEL] event { data }
  const line = `${entry.timestamp} [${level}] ${event} ${data ? JSON.stringify(data) : ''}\n`;

  // Escrever em app.log (todos os logs)
  fs.appendFileSync(APP_LOG_FILE, line, 'utf-8');

  // Escrever em error.log apenas se for ERROR
  if (level === 'ERROR') {
    fs.appendFileSync(ERROR_LOG_FILE, line, 'utf-8');
  }

  // Console (desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    const colors = {
      INFO: '\x1b[36m', // Ciano
      WARN: '\x1b[33m', // Amarelo
      ERROR: '\x1b[31m', // Vermelho
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}[${level}]${reset} ${event}`, data || '');
  }
}

// ========================================
// FUNÇÕES PÚBLICAS
// ========================================

/**
 * Log informativo (nível INFO)
 * 
 * @param event - Nome do evento
 * @param data - Dados adicionais
 * 
 * @example
 * ```typescript
 * logger.info('report_generated', { 
 *   reportType: 'company', 
 *   userId: 'central-123', 
 *   duration: 150 
 * });
 * ```
 */
export function info(event: string, data?: any): void {
  log('INFO', event, data);
}

/**
 * Log de aviso (nível WARN)
 * 
 * @param event - Nome do evento
 * @param data - Dados adicionais
 * 
 * @example
 * ```typescript
 * logger.warn('access_denied', { 
 *   userId: 'cliente-123', 
 *   attemptedResource: 'cliente-456',
 *   role: 'client'
 * });
 * ```
 */
export function warn(event: string, data?: any): void {
  log('WARN', event, data);
}

/**
 * Log de erro (nível ERROR)
 * 
 * @param event - Nome do evento
 * @param data - Dados adicionais (inclua message e stack)
 * 
 * @example
 * ```typescript
 * logger.error('database_connection_failed', { 
 *   message: err.message, 
 *   stack: err.stack,
 *   database: 'postgres'
 * });
 * ```
 */
export function error(event: string, data?: any): void {
  log('ERROR', event, data);
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Retorna quantidade de linhas em um arquivo de log
 */
export function getLogLineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').filter(line => line.trim()).length;
}

/**
 * Retorna últimas N linhas de um arquivo de log
 */
export function getLastLogs(filePath: string, count: number = 100): string[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  return lines.slice(-count);
}

/**
 * Limpa arquivo de log (use com cuidado!)
 */
export function clearLog(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf-8');
  }
}

/**
 * Retorna estatísticas de logs
 */
export function getLogStats(): {
  appLogLines: number;
  errorLogLines: number;
  appLogSize: number;
  errorLogSize: number;
} {
  return {
    appLogLines: getLogLineCount(APP_LOG_FILE),
    errorLogLines: getLogLineCount(ERROR_LOG_FILE),
    appLogSize: fs.existsSync(APP_LOG_FILE) ? fs.statSync(APP_LOG_FILE).size : 0,
    errorLogSize: fs.existsSync(ERROR_LOG_FILE) ? fs.statSync(ERROR_LOG_FILE).size : 0,
  };
}

// ========================================
// EXPORTAÇÃO DEFAULT
// ========================================

export default {
  info,
  warn,
  error,
  getLogStats,
  getLastLogs,
  clearLog,
};
