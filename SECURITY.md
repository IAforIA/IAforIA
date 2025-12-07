# Relatório de Segurança

## Status das Vulnerabilidades (Novembro 2025)

### ✅ Resolvidas
- **Vite**: Atualizado de 5.x para 6.4.1 (corrige GHSA-67mh-4wv8-2f99)
- **Esbuild**: Atualizado para 0.27.0 nas dependências diretas

### ⚠️ Vulnerabilidades Residuais (Ambiente de Desenvolvimento Apenas)

#### drizzle-kit → @esbuild-kit → esbuild <=0.24.2
- **Severidade**: Moderada (4 ocorrências)
- **CVE**: GHSA-67mh-4wv8-2f99
- **Descrição**: esbuild permite que sites enviem requisições ao servidor de desenvolvimento
- **Impacto**: **ZERO em produção** - apenas afeta `drizzle-kit` (ferramenta de migrations)
- **Status**: Aguardando atualização do drizzle-kit (versão atual: 0.31.7)

#### Análise de Risco
1. **Ambiente de Produção**: ✅ SEGURO
   - drizzle-kit não é usado em produção
   - Vulnerabilidade afeta apenas dev server do esbuild
   - Build final usa esbuild 0.27.0 (sem vulnerabilidade)

2. **Ambiente de Desenvolvimento**: ⚠️ BAIXO RISCO
   - Requer servidor rodando em rede local
   - Atacante precisa ter acesso à mesma rede
   - Servidor de desenvolvimento não é exposto publicamente

#### Mitigação
- ✅ Vite atualizado (servidor principal protegido)
- ✅ Esbuild principal atualizado
- ✅ Overrides configurados no package.json
- ⏳ Aguardando drizzle-kit migrar de @esbuild-kit para tsx

#### Pacotes Obsoletos Detectados
- `@esbuild-kit/esm-loader@2.6.5` → Merged into tsx
- `@esbuild-kit/core-utils@3.3.2` → Merged into tsx
- Estes pacotes são dependências transitivas do drizzle-kit

## Recomendações
1. Monitorar atualizações do drizzle-kit
2. Não expor servidor de desenvolvimento publicamente
3. Usar firewall em ambiente de desenvolvimento
4. Executar `npm audit` periodicamente

## Controles Recentes

- **Request ID**: todas as requisições recebem `X-Request-Id` e são logadas de forma estruturada (`logs/app.log`, `logs/error.log`); erros retornam o ID para correlação.
- **Headers/Helmet**: Helmet permanece ativo; CORS segue allowlist por `ALLOWED_ORIGINS` (production bloqueia origens não listadas).
- **Build Guard**: `npm run build:ci` inclui `check:bundle` para impedir bundles excessivos em deploys.
- **Health/Ready**: `/health` (liveness) e `/ready` (readiness com ping no banco) para automação/monitoramento.

## Última Verificação

- Data: 21 de Novembro de 2025
- Vulnerabilidades em Produção: **0**
- Vulnerabilidades em Dev (baixo risco): 4
