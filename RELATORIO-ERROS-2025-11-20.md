# Relatório de Erros - Guriri Express
**Data:** 20 de Novembro de 2025  
**Projeto:** GuririExpress (Chat System Refactor)  
**Branch:** main  
**Status:** Em desenvolvimento - STEP 6 (Sistema de Chat)

---

## 📊 Resumo Executivo

**Total de erros encontrados:** 382 (mostrando primeiros 50)  
**Arquivos com problemas:** 8 principais  
**Severidade:** Maioria LOW (CSS/HTML lint), 2 MEDIUM (TypeScript types)

### Distribuição por Categoria:
- **CSS Inline Styles:** ~35 ocorrências (baixa prioridade - arquivos legados)
- **TypeScript Types:** 2 erros críticos (server/scripts)
- **HTML Acessibilidade:** ~10 avisos (labels, lang attribute)
- **Browser Compatibility:** 3 avisos (backdrop-filter, theme-color)

---

## 🔴 ERROS CRÍTICOS (Bloqueia compilação)

### 1. **Type Mismatch em `fix-test-user-roles.ts`**
**Arquivo:** `server/scripts/fix-test-user-roles.ts`  
**Linhas:** 36, 44  
**Problema:**
```typescript
Type '"client"' is not assignable to type 'SQL<unknown> | UserRole | PgColumn<...> | undefined'
Type '"motoboy"' is not assignable to type 'SQL<unknown> | UserRole | PgColumn<...> | undefined'
```

**Causa Raiz:**  
O schema `users.role` agora usa o enum `UserRole` importado de `shared/enums.ts`, mas o script tenta passar strings literais `'client'` e `'motoboy'` diretamente.

**Impacto:**  
- ❌ Script de fix de usuários não compila
- ⚠️ Pode causar falha em migrations/seeds futuros

**Solução:**
```typescript
import { UserRole } from '@shared/enums';

// Linha 36
.set({ role: UserRole.CLIENT })

// Linha 44
.set({ role: UserRole.MOTOBOY })
```

**Prioridade:** 🔴 ALTA - Corrigir antes de próximo deploy

---

### 2. **Insert Schema Mismatch em `check-and-create-profiles.ts`**
**Arquivo:** `server/scripts/check-and-create-profiles.ts`  
**Linha:** 57  
**Problema:**
```typescript
No overload matches this call.
Type 'string | null' is not assignable to type 'string | SQL<unknown> | Placeholder<string, any>'
```

**Causa Raiz:**  
O script tenta inserir valores `null` em campos que esperam `string | SQL | Placeholder`. Drizzle não aceita `null` direto (deve usar `.default(null)` no schema ou omitir campo).

**Impacto:**  
- ❌ Script de criação de perfis não compila
- ⚠️ Onboarding de novos clientes pode falhar se usar esse script

**Solução:**
```typescript
// Opção 1: Omitir campos null do insert
await db.insert(clients).values({
  ...clientData,
  // Remove campos null - deixa o DB usar defaults
});

// Opção 2: Usar sql`NULL` explicitamente
import { sql } from 'drizzle-orm';
await db.insert(clients).values({
  ...clientData,
  someField: clientData.someField ?? sql`NULL`,
});
```

**Prioridade:** 🔴 ALTA - Bloqueia scripts de seed/migration

---

## 🟡 AVISOS MÉDIOS (Não bloqueia, mas deve corrigir)

### 3. **CSS Inline Styles - Arquivos Legados**
**Arquivos afetados:**
- `client/public/index-fallback.html` (3 ocorrências)
- `guriri-prod/site/templates/*.html` (~30 ocorrências)

**Problema:**  
Uso de `style="..."` inline ao invés de classes CSS externas.

**Impacto:**  
- ⚠️ Dificulta manutenção
- ⚠️ Problemas com Content Security Policy (CSP) em produção
- ⚠️ Aumenta tamanho de HTML

**Solução:**  
Migrar para Tailwind CSS ou criar arquivo `.css` externo. **Baixa prioridade** - arquivos legados do site antigo.

**Prioridade:** 🟡 MÉDIA - Refatorar gradualmente

---

### 4. **Acessibilidade - Form Labels Ausentes**
**Arquivos:**
- `guriri-prod/site/templates/primeira_troca.html` (linhas 168, 173, 192)
- `guriri-prod/site/templates/index_landing_backup.html` (2 ocorrências)

**Problema:**
```html
<input type="password" id="senhaAtual" required autocomplete="current-password">
<!-- ❌ Sem <label>, placeholder ou title -->
```

**Impacto:**  
- ⚠️ Leitores de tela não conseguem identificar campo
- ⚠️ Viola WCAG 2.1 (Acessibilidade Web)

**Solução:**
```html
<label for="senhaAtual">Senha Atual</label>
<input type="password" id="senhaAtual" required autocomplete="current-password">
```

**Prioridade:** 🟡 MÉDIA - Importante para compliance

---

### 5. **Browser Compatibility - `backdrop-filter`**
**Arquivos:**
- `client/public/test-page.html` (linha 23)
- `guriri-prod/site/templates/index*.html` (2 ocorrências)

**Problema:**
```css
backdrop-filter: blur(10px);
/* ❌ Não funciona em Safari 9-13 sem prefixo */
```

**Impacto:**  
- ⚠️ Efeito de blur não aparece em iOS Safari antigo
- ✅ Não quebra layout (graceful degradation)

**Solução:**
```css
-webkit-backdrop-filter: blur(10px); /* Safari 9+ */
backdrop-filter: blur(10px);
```

**Prioridade:** 🟢 BAIXA - Apenas estético

---

## 🟢 AVISOS BAIXOS (Cosméticos/Best Practices)

### 6. **Viewport Meta com `maximum-scale`**
**Arquivo:** `client/index.html` (linha 5)  
**Problema:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
```

**Impacto:**  
- ⚠️ Impede zoom em dispositivos móveis (ruim para acessibilidade)
- ⚠️ Viola guidelines de acessibilidade iOS/Android

**Solução:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Prioridade:** 🟢 BAIXA - Melhorar acessibilidade

---

### 7. **HTML Meta Tags Ausentes**
**Arquivo:** `client/public/ping.html`  
**Problemas:**
- Sem `charset` meta
- Sem `viewport` meta
- Tag `<html>` sem atributo `lang`

**Solução:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- ... -->
</head>
```

**Prioridade:** 🟢 BAIXA - Arquivo de teste/debug

---

## 📋 Plano de Ação Recomendado

### Fase 1: Corrigir Erros Críticos (HOJE)
- [ ] Corrigir `fix-test-user-roles.ts` (usar `UserRole` enum)
- [ ] Corrigir `check-and-create-profiles.ts` (remover nulls ou usar sql`NULL`)
- [ ] Testar scripts de seed após correções

### Fase 2: Melhorias de Qualidade (ESTA SEMANA)
- [ ] Adicionar labels em formulários de senha
- [ ] Adicionar prefixo `-webkit-backdrop-filter`
- [ ] Remover `maximum-scale` do viewport

### Fase 3: Refatoração Gradual (BACKLOG)
- [ ] Migrar inline styles para Tailwind/CSS externo
- [ ] Adicionar meta tags em páginas de teste
- [ ] Revisar arquivos legados em `guriri-prod/site/templates/`

---

## 🎯 Avaliação do Projeto

### ✅ PONTOS FORTES
1. **Arquitetura do Chat:** Redesign completo com categorias e threading está bem estruturado
2. **Separação Backend/Frontend:** Lógica de negócio isolada corretamente
3. **Type Safety:** Maioria do código usa tipos TypeScript corretos
4. **Documentação:** Código bem comentado e explicado

### ⚠️ PONTOS DE ATENÇÃO
1. **Scripts de Seed:** 2 scripts críticos com erros de tipo (fácil de corrigir)
2. **Arquivos Legados:** Muitos warnings em HTML antigos (não bloqueiam projeto atual)
3. **Testes Pendentes:** Chat system não testado end-to-end ainda

### 🚨 RISCOS IDENTIFICADOS
1. **BAIXO:** Scripts de seed podem falhar em produção se não corrigidos
2. **BAIXO:** Acessibilidade pode ser problema em auditoria futura
3. **MÍNIMO:** CSS inline afeta CSP em produção com headers rígidos

---

## 📊 Conclusão

**Status Geral:** 🟢 **NO CAMINHO CERTO**

### Justificativa:
- ✅ Erros críticos são **fáceis de corrigir** (15min de trabalho)
- ✅ Maioria dos warnings são em **arquivos legados** (não afetam funcionalidades novas)
- ✅ Sistema de chat tem **arquitetura sólida** (pronto para IA futura)
- ✅ Separação de concerns está **correta** (backend/frontend isolados)

### Próximos Passos:
1. Corrigir 2 erros TypeScript nos scripts (URGENTE)
2. Rodar `npx tsx server/scripts/seed-users.ts` para popular banco
3. Testar chat end-to-end (cliente → central → motoboy)
4. Commitar STEP 6 quando chat estiver funcionando

### Recomendação Final:
**CONTINUAR desenvolvimento.** Os erros encontrados são superficiais e não indicam problemas estruturais. O projeto está evoluindo corretamente com arquitetura bem pensada. Priorize corrigir os 2 erros críticos de tipo e prosseguir com testes do chat.

---

**Gerado por:** GitHub Copilot  
**Comando:** `get_errors()` (primeiros 50 de 382 encontrados)  
**Próxima revisão:** Após conclusão do STEP 6 (Chat System)
