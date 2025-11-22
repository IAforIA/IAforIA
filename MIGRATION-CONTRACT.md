# 🔒 CONTRATO DE MIGRAÇÃO VISUAL - GARANTIA TOTAL

**Data:** 22 de Novembro de 2025  
**Projeto:** GuiriExpress - Central Dashboard V2  
**Desenvolvedor:** GitHub Copilot (Claude Sonnet 4.5)  
**Stakeholder:** JEAN (Product Owner)

---

## 📋 OBJETIVO

Migrar o **visual completo** do protótipo HTML (`interactive_prototype.html`) para o dashboard React (`central-dashboard.tsx`) preservando **100% da funcionalidade existente** + **adicionar Mapa em Tempo Real de Guriri**.

---

## ✅ GARANTIAS TÉCNICAS

### 1. FUNCIONALIDADES PRESERVADAS (ZERO ALTERAÇÕES)

#### 1.1 Autenticação & Segurança
- ✅ `useAuth()` - Sistema JWT intacto
- ✅ Token validation em todas as queries
- ✅ Proteção de rotas via `enabled: !!token`
- ✅ Logout function preservada

#### 1.2 Banco de Dados (Neon DB)
- ✅ **9 Queries React Query** mantidas
- ✅ Mesmo `queryClient`, mesmas `queryKeys`, mesmo cache

#### 1.3 Mutations (Ações no Banco)
- ✅ `toggleUserStatusMutation` - Ativa/desativa usuários
- ✅ `changeUserRoleMutation` - Altera permissões
- ✅ `toggleMotoboyOnlineMutation` - Status motoboy
- ✅ `cancelOrderMutation` - Cancela pedido
- ✅ `reassignOrderMutation` - Reatribui pedido

#### 1.4 WebSocket (Tempo Real)
- ✅ Conexão autenticada via `resolveWebSocketUrl(token)`
- ✅ Event handlers preservados
- ✅ Cleanup automático no `useEffect` return

#### 1.5 Roteamento
- ✅ `<NestedRouter base="/central">` mantido
- ✅ **10 rotas** preservadas

---

## 🗺️ NOVA FEATURE: MAPA INTERATIVO DE GURIRI EM TEMPO REAL

### Coordenadas de Guriri (ES)
```typescript
const GURIRI_CENTER = {
  lat: -18.715,
  lng: -39.75,
  zoom: 14
};
```

### Elementos do Mapa (3 Tipos de Pins)

#### 1. Clientes (Pontos de Coleta - Azul 🔵)
- Pin azul com dados do cliente
- Click abre popup com nome, endereço, telefone
- Filtro: Mostrar apenas clientes abertos

#### 2. Motoboys (Entregadores Ativos - Verde 🟢)
- Pin verde para motoboy livre
- Atualização de posição via WebSocket a cada 5s
- Click mostra nome, placa, pedidos ativos

#### 3. Pedidos - Destino Final (Vermelho Pulsante 🔴)
- Pin vermelho com animação de pulsar
- Apenas pedidos ativos aparecem
- Click mostra detalhes + botão de rastreio
- Remove pin quando pedido é concluído

### Funcionalidades do Mapa

#### Rotas Dinâmicas
- Linha azul tracejada mostrando cliente → motoboy → destino
- Atualiza em tempo real conforme motoboy se move

#### Filtros Interativos
- Toggle para mostrar/ocultar clientes
- Toggle para mostrar/ocultar motoboys
- Toggle para mostrar/ocultar pedidos

#### Legenda
- Explicação visual dos tipos de pins
- Posicionada no canto inferior esquerdo

---

## 🔄 PROCESSO DE MIGRAÇÃO

### Etapa 1: Criar Componentes Glass
1. `client/src/components/glass/GlassStatCard.tsx`
2. `client/src/components/glass/GlassPanel.tsx`
3. `client/src/components/glass/GlassSidebar.tsx`
4. `client/src/components/glass/MapOverlay.tsx`

### Etapa 2: Criar CSS Global
- `client/src/styles/glass.css`

### Etapa 3: Adicionar Campos Geográficos
- Migration SQL: `migrations/add_geolocation.sql`

### Etapa 4: Criar Dashboard V2
- `client/src/pages/central-dashboard-v2.tsx`

### Etapa 5: Validação
- Testar lado-a-lado: `/central` vs `/central-v2`

---

## 🧪 TESTES DE ACEITAÇÃO

### Teste 1: Autenticação
✅ Dashboard carrega com dados reais do banco

### Teste 2: Dados em Tempo Real
✅ WebSocket atualiza ambas as versões

### Teste 3: Mutations
✅ Pedido cancelado e UI atualizada

### Teste 4: Visual Idêntico
✅ Visualmente indistinguível

### Teste 5: Mapa em Tempo Real
✅ Mapa renderiza corretamente  
✅ Pins aparecem nas posições corretas  
✅ WebSocket atualiza mapa em tempo real  
✅ Popups abrem ao clicar nos pins  
✅ Filtros funcionam

---

## 🛡️ ROLLBACK PLAN

```bash
# Deletar arquivos V2
rm client/src/pages/central-dashboard-v2.tsx
rm -r client/src/components/glass/
rm client/src/styles/glass.css

# Reiniciar servidor
npm run dev
```

**Tempo de rollback:** < 2 minutos  
**Risco de perda de dados:** ZERO

---

## 🎯 CRITÉRIO FINAL DE SUCESSO

1. ✅ Todos os 5 testes de aceitação passarem
2. ✅ Zero erros no console
3. ✅ Visual 95%+ idêntico ao protótipo
4. ✅ 100% das funcionalidades antigas funcionando
5. ✅ Mapa renderiza e atualiza em tempo real
6. ✅ Aprovação formal do stakeholder (JEAN)

---

**FIM DO CONTRATO**
