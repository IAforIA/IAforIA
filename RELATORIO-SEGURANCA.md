# 🛡️ RELATÓRIO DE SEGURANÇA E CORREÇÕES CRÍTICAS
**Data:** 20/11/2025
**Status:** Ação Imediata Necessária

Este documento lista vulnerabilidades críticas identificadas no projeto e o plano de correção para garantir a segurança dos dados e da operação.

---

## 🚨 1. EXPOSIÇÃO DE SEGREDOS (CRÍTICO)

**Problema:**
- O arquivo `STATUS-ATUAL.md` contém a connection string completa do banco de dados Neon (incluindo senha) e senhas padrão de todos os usuários (admin, clientes, motoboys).
- Arquivos versionados no repositório não devem conter segredos reais.

**Ação Corretiva:**
- [ ] Remover connection string do `STATUS-ATUAL.md`.
- [ ] Remover senhas em texto plano do `STATUS-ATUAL.md`.
- [ ] Rotacionar credenciais do banco de dados Neon (ação manual no painel Neon).
- [ ] Mover credenciais de teste para um arquivo não versionado (ex: `.env.local` ou gerenciador de senhas).

---

## 🔓 2. VAZAMENTO DE DADOS MULTI-TENANT (ALTO RISCO)

**Problema:**
- `GET /api/orders`: Retorna **todos** os pedidos do sistema para qualquer usuário autenticado. Um cliente pode ver pedidos de outros clientes.
- `GET /api/chat`: Retorna **todo** o histórico de chat para qualquer usuário autenticado.

**Ação Corretiva:**
- [ ] Implementar filtro por role em `GET /api/orders`:
  - **Central:** Vê tudo.
  - **Client:** Vê apenas pedidos onde `clientId === req.user.id`.
  - **Motoboy:** Vê pedidos disponíveis (`pending`) OU atribuídos a ele (`motoboyId === req.user.id`).
- [ ] Implementar escopo em `GET /api/chat` ou restringir acesso apenas à Central/Motoboys envolvidos (dependendo do requisito de negócio).

---

## 👮 3. FALHAS DE AUTORIZAÇÃO / PRIVILEGE ESCALATION (ALTO RISCO)

**Problema:**
- `POST /api/motoboys/:id/location`: Não verifica se `req.user.id` corresponde ao `:id` da URL. Um motoboy pode falsificar a localização de outro.
- `POST /api/orders/:id/accept`: Confia no `motoboyId` enviado no corpo da requisição. Um usuário pode aceitar pedidos em nome de outro.
- `POST /api/orders/:id/deliver`: Permite que qualquer motoboy finalize qualquer pedido, sem verificar atribuição.

**Ação Corretiva:**
- [ ] Validar `req.user.id` contra `:id` ou garantir que a ação seja executada pelo usuário logado.
- [ ] Em `accept`, usar `req.user.id` como o ID do motoboy que está aceitando.
- [ ] Em `deliver`, verificar se o pedido está atribuído ao `req.user.id` antes de permitir a finalização.

---

## ⚠️ 4. RISCO OPERACIONAL (MÉDIO RISCO)

**Problema:**
- `start-server.ps1` executa `Stop-Process -Force` para todos os processos `node`. Isso pode encerrar ferramentas de desenvolvimento, outros servidores ou processos do sistema não relacionados ao projeto.

**Ação Corretiva:**
- [ ] Refinar o script para buscar processos específicos (ex: pela porta 5000) ou remover o kill switch global agressivo.

---

## ✅ PLANO DE EXECUÇÃO

1. **Sanitização:** Limpar `STATUS-ATUAL.md` imediatamente.
2. **Backend Hardening:** Aplicar correções em `server/routes.ts` para isolamento de dados e autorização.
3. **Scripting:** Ajustar `start-server.ps1`.
4. **Validação:** Testar cada endpoint corrigido para garantir que a funcionalidade legítima permanece intacta.
