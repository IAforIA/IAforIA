# Guia de Lançamento Interno - Guriri Express

Este guia explica como lançar o sistema **apenas para uso interno** da sua empresa, sem permitir cadastros públicos.

## Situação Atual
- **28 clientes** existentes
- **10 motoboys** na equipe
- **1 central de operações** (você/equipe administrativa)
- Sem cadastros públicos (apenas usuários pré-cadastrados)

## 🔒 Estratégia de Segurança

### Bloqueio de Cadastros Públicos
O sistema já está preparado para isso! Não existe rota de cadastro público - **todos os usuários devem ser criados manualmente** pelo administrador.

**Funcionalidade atual:**
- ✅ Sistema usa autenticação JWT (login com email/senha)
- ✅ Não há rota `/api/register` - impossível criar conta sozinho
- ✅ Apenas administrador pode criar usuários via script ou banco de dados
- ✅ Três roles isoladas: `central`, `client`, `motoboy`

**Você está seguro por padrão!** ✨

## 📋 Passo a Passo para Lançamento

### Passo 1: Escolher Plataforma de Hospedagem

**Opção Mais Simples: Railway (Recomendado)**
- ✅ Gratuito para começar ($5/mês de crédito grátis)
- ✅ PostgreSQL incluído
- ✅ Deploy automático do GitHub
- ✅ HTTPS configurado automaticamente
- ⏱️ Tempo de setup: 10-15 minutos

**Outras Opções:**
- **Render**: Similar ao Railway, free tier disponível
- **Docker Local**: Se tem um servidor próprio
- **VPS**: Controle total, requer mais conhecimento técnico

### Passo 2: Deploy da Aplicação

#### Usando Railway (Mais Fácil)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Fazer login
railway login

# 3. Criar projeto
cd GuririExpress
railway init

# 4. Adicionar PostgreSQL
railway add -d postgres

# 5. Configurar variáveis de ambiente
railway variables set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex')")"
railway variables set SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex')")"

# 6. Fazer deploy
railway up

# 7. Obter a URL do seu app
railway open
```

Anote a URL (ex: `https://guriri-express-production.up.railway.app`)

### Passo 3: Configurar Banco de Dados

```bash
# Conectar ao Railway e aplicar schema
railway run npm run db:push
```

### Passo 4: Importar Seus Usuários

Edite o arquivo `server/scripts/import-users.ts` com os dados reais:

```typescript
const USUARIOS_EMPRESA = [
  // CENTRAL
  {
    tipo: 'central',
    id: 'admin-001',
    nome: 'Central Guriri Express',
    email: 'admin@guriri.com',
    telefone: '27999999999',
    senha: 'SenhaForte123!',
  },

  // CLIENTE 1
  {
    tipo: 'client',
    id: 'client-001',
    nome: 'Padaria Pão Quente',
    email: 'padaria@email.com',
    telefone: '27988881111',
    senha: 'Temp123',
    empresa: 'Padaria Pão Quente Ltda',
  },
  
  // ... repita para os 28 clientes
  
  // MOTOBOY 1
  {
    tipo: 'motoboy',
    id: 'moto-001',
    nome: 'João Silva',
    email: 'joao@email.com',
    telefone: '27977771111',
    senha: 'Moto123',
    placa: 'ABC-1234',
    cpf: '123.456.789-00',
  },
  
  // ... repita para os 10 motoboys
];
```

Execute a importação:

```bash
# Local
npx tsx server/scripts/import-users.ts

# Ou via Railway
railway run npx tsx server/scripts/import-users.ts
```

### Passo 5: Distribuir Credenciais

Crie uma planilha ou documento com:

| Tipo | Nome | Email | Senha Temporária | Link de Acesso |
|------|------|-------|------------------|----------------|
| Central | Admin | admin@guriri.com | SenhaForte123! | https://seu-app.railway.app |
| Cliente | Padaria | padaria@email.com | Temp123 | https://seu-app.railway.app |
| Motoboy | João | joao@email.com | Moto123 | https://seu-app.railway.app |

**Importante:**
- ✅ Envie individualmente (WhatsApp, email)
- ✅ Oriente trocar senha no primeiro acesso
- ✅ Explique qual dashboard usar (central/client/driver)
- ✅ Faça um pequeno treinamento/demo

## 🎯 Treinamento Rápido por Tipo

### Para a Central (Você/Equipe Admin)
1. Acesse: `https://seu-app.railway.app`
2. Login com credenciais de admin
3. Dashboard mostra:
   - Total de pedidos
   - Pedidos em andamento
   - Motoboys online
   - Feed em tempo real
4. Pode criar pedidos para qualquer cliente
5. Pode atribuir/reatribuir motoboys

### Para Clientes
1. Acesse: `https://seu-app.railway.app`
2. Login com email/senha fornecidos
3. Dashboard permite:
   - Criar novo pedido (endereços, valor, forma de pagamento)
   - Ver histórico de pedidos
   - Acompanhar status em tempo real
4. Recebe notificações quando motoboy aceita/entrega

### Para Motoboys
1. Acesse: `https://seu-app.railway.app`
2. Login com email/senha fornecidos
3. Dashboard mostra:
   - Pedidos disponíveis (pendentes)
   - Aceitar pedidos
   - Marcar como entregue
   - Ver histórico/ganhos

## 📱 Acesso Mobile

O sistema é **responsivo** e funciona perfeitamente em celulares!

**Para facilitar:**
1. Envie o link para os usuários
2. Oriente a "Adicionar à Tela Inicial" no celular
3. Funciona como um app nativo

**No Android:**
- Abrir no Chrome
- Menu (3 pontos) → "Adicionar à tela inicial"

**No iPhone:**
- Abrir no Safari
- Compartilhar → "Adicionar à Tela de Início"

## 🔐 Segurança Adicional (Opcional)

### 1. Restringir por IP (se sempre usarem mesma rede)
No Railway/Render, configure firewall para aceitar apenas IPs específicos.

### 2. Autenticação de Dois Fatores
(Requer desenvolvimento adicional - pode ser fase 2)

### 3. Auditoria de Logs
Monitore quem faz login e quando via logs do Railway/Render.

## 📊 Monitoramento

### Verificar se está funcionando:
```bash
# Via Railway
railway logs

# Ou acesse o dashboard do Railway/Render
```

### Métricas importantes:
- Número de logins por dia
- Pedidos criados vs entregues
- Motoboys online em tempo real
- Erros/falhas no sistema

## 🆘 Suporte aos Usuários

### Problemas Comuns:

**"Não consigo fazer login"**
- ✅ Verificar se digitou email correto
- ✅ Senha é case-sensitive (maiúsculas/minúsculas)
- ✅ Confirmar que foi importado no banco

**"Não vejo pedidos"**
- ✅ Cliente: só vê seus próprios pedidos
- ✅ Motoboy: só vê pedidos disponíveis/seus
- ✅ Central: vê todos

**"WebSocket não conecta"**
- ✅ Verificar se Railway/Render permite WebSocket
- ✅ Testar em outra rede/navegador
- ✅ Limpar cache do navegador

## 💡 Dicas para o Primeiro Dia

1. **Teste Completo**: Faça um pedido teste com todos os fluxos
2. **Grupo de WhatsApp**: Crie grupo de suporte para dúvidas
3. **Horário de Pico**: Evite lançar na hora de maior movimento
4. **Rollback Plan**: Tenha o sistema antigo de backup por 1 semana
5. **Feedback**: Peça retorno dos usuários no fim do dia

## 🚀 Cronograma Sugerido

### Semana -1: Preparação
- [ ] Deploy na Railway/Render
- [ ] Importar usuários
- [ ] Testar todos os fluxos
- [ ] Gravar vídeo tutorial curto (5min)

### Dia 1: Lançamento Suave
- [ ] Enviar credenciais para 2-3 clientes piloto
- [ ] Enviar credenciais para 2 motoboys
- [ ] Monitorar de perto
- [ ] Coletar feedback

### Semana 1: Expansão Gradual
- [ ] Adicionar mais 5-10 clientes
- [ ] Adicionar mais motoboys
- [ ] Ajustar baseado em feedback
- [ ] Continuar com sistema antigo em paralelo

### Semana 2: Migração Completa
- [ ] Todos os 28 clientes ativos
- [ ] Todos os 10 motoboys ativos
- [ ] Desativar sistema antigo
- [ ] Celebrar! 🎉

## 📞 Checklist Final

Antes de lançar, confirme:

- [ ] App está no ar e acessível pela URL
- [ ] Banco de dados funcionando
- [ ] Todos os 39 usuários importados (1 admin + 28 clientes + 10 motoboys)
- [ ] Credenciais preparadas para distribuição
- [ ] Vídeo/documento de tutorial criado
- [ ] Grupo de suporte criado
- [ ] Backup do banco de dados configurado
- [ ] Monitoring ativo (logs, uptime)

## 🎓 Recursos de Treinamento

### Vídeos Curtos Sugeridos (grave você mesmo):

1. **Cliente**: "Como criar um pedido" (3min)
2. **Motoboy**: "Como aceitar e entregar pedido" (3min)
3. **Central**: "Visão geral do dashboard" (5min)

### Documento de Ajuda Rápida:

Crie um PDF com:
- Link de acesso
- Como fazer login
- Principais funções
- Contato de suporte (seu WhatsApp)

---

## ✅ Resumo: É Simples? É Possível?

**SIM!** 🎯

- ✅ **Seguro por padrão** - sem cadastros públicos
- ✅ **Deploy em 15 minutos** - Railway/Render
- ✅ **Importação em lote** - script pronto
- ✅ **Acesso mobile** - responsivo
- ✅ **Custo baixo** - $5-20/mês dependendo da plataforma

**Próximo passo:** Execute os comandos do Passo 2 e já terá seu sistema no ar! 🚀
