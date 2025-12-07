/**
 * ARQUIVO: server/config/apiVersion.ts
 * PROPÓSITO: Gerenciar versionamento da API de forma centralizada
 * 
 * NOTA: Este arquivo prepara a estrutura para versionamento futuro.
 * Atualmente, a API está na v1.0 sem mudanças de versão implementadas.
 * 
 * QUANDO USAR:
 * - Adicionar v2.0: criar nova pasta server/v2/ e duplicar routes.ts
 * - Breaking changes: incrementar MAJOR version
 * - Novas features: incrementar MINOR version
 * - Bug fixes: incrementar PATCH version
 */

export const API_VERSION = {
  MAJOR: 1,
  MINOR: 0,
  PATCH: 0,
  get FULL() {
    return `${this.MAJOR}.${this.MINOR}.${this.PATCH}`;
  },
  get PREFIX() {
    return `/api/v${this.MAJOR}`;
  }
} as const;

/**
 * CONSTANTE: Versões suportadas da API
 * Quando v2.0 for lançada, adicionar aqui e manter v1.0 por 6 meses (deprecation period)
 */
export const SUPPORTED_VERSIONS = ['v1'] as const;

/**
 * CONSTANTE: Versão default caso cliente não especifique
 */
export const DEFAULT_VERSION = 'v1';

/**
 * TIPO: Versão válida da API (TypeScript type safety)
 */
export type ApiVersion = typeof SUPPORTED_VERSIONS[number];

/**
 * FUNÇÃO: Valida se versão solicitada é suportada
 * 
 * @param version - Versão da API (ex: "v1", "v2")
 * @returns boolean - true se versão é válida
 * 
 * @example
 * isValidVersion('v1') // true
 * isValidVersion('v3') // false
 */
export function isValidVersion(version: string): version is ApiVersion {
  return SUPPORTED_VERSIONS.includes(version as ApiVersion);
}

/**
 * CONSTANTE: Changelog de versões
 * Documentar todas as mudanças entre versões
 */
export const VERSION_CHANGELOG = {
  'v1.0.0': {
    releaseDate: '2024-11-24',
    description: 'Initial API release',
    changes: [
      'Authentication endpoints (register, login)',
      'Order management (create, accept, deliver, cancel)',
      'Motoboy management (GPS tracking, schedules)',
      'Chat with AI filtering (GPT-4 Turbo)',
      'Analytics and reporting',
      'WebSocket real-time events',
      'RBAC with 3 roles (client, motoboy, central)'
    ],
    breakingChanges: [],
    deprecations: []
  }
  // Quando v2.0.0 for lançada:
  // 'v2.0.0': {
  //   releaseDate: '2025-XX-XX',
  //   description: 'Major update with breaking changes',
  //   changes: [
  //     'Pagination added to all list endpoints',
  //     'New webhook system',
  //     'GraphQL support'
  //   ],
  //   breakingChanges: [
  //     'GET /api/v2/orders now returns paginated response',
  //     'Removed `coletaOverride` field (always auto-fills)',
  //     'Changed date format to ISO 8601'
  //   ],
  //   deprecations: [
  //     'v1.0 will be sunset on 2025-06-XX'
  //   ]
  // }
} as const;

/**
 * CONSTANTE: Migration guides entre versões
 */
export const MIGRATION_GUIDES = {
  'v1-to-v2': {
    guide: '/docs/guides/migration-v1-to-v2.md',
    estimatedEffort: '2-4 hours',
    keyChanges: [
      // Preencher quando v2.0 existir
    ]
  }
} as const;

/**
 * EXEMPLO DE USO NO server/index.ts:
 * 
 * import { API_VERSION } from './config/apiVersion';
 * import routes from './routes';
 * 
 * // Versão atual (v1)
 * app.use(API_VERSION.PREFIX, routes);
 * 
 * // Quando v2 existir:
 * import routesV2 from './v2/routes';
 * app.use('/api/v2', routesV2);
 * 
 * // Health endpoint com versão
 * app.get('/health', (req, res) => {
 *   res.json({
 *     status: 'ok',
 *     version: API_VERSION.FULL,
 *     supportedVersions: SUPPORTED_VERSIONS
 *   });
 * });
 */
