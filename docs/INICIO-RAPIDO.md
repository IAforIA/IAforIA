# 🚀 GUIA RÁPIDO: Lançamento Interno em 4 Passos

## ✅ Resposta Rápida
**É simples?** SIM! ✨  
**É possível?** SIM! 🎯  
**É seguro?** SIM! 🔒 (Sem cadastros públicos por padrão)

---

## Passo 1: Deploy (15 minutos)

### Opção A: Railway (Mais Fácil - Recomendado)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Navegar para o projeto
cd GuririExpress

# Login e criar projeto
railway login
railway init

# Adicionar PostgreSQL
railway add -d postgres

# Configurar secrets
railway variables set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex')")"

# Deploy!
railway up

# Ver a URL do seu app
railway open
```

Anote a URL (ex: `https://guriri-production.railway.app`)

---

## Passo 2: Preparar Banco de Dados (5 minutos)

```bash
# Aplicar schema
railway run npm run db:push
```

---

## Passo 3: Importar seus 39 usuários (10 minutos)

### 3.1 Editar o arquivo de importação

Abra `server/scripts/import-users.ts` e substitua os dados de exemplo pelos seus:

```typescript
const USUARIOS_EMPRESA = [
  // SUA CENTRAL
  {
    tipo: 'central',
    id: 'admin-001',
    nome: 'Sua Empresa',
    email: 'seu-email@empresa.com',
    telefone: '27999999999',
    senha: 'SuaSenhaForte123!',
  },

  // SEUS 28 CLIENTES
  {
    tipo: 'client',
    id: 'client-001',
    nome: 'Cliente 1',
    email: 'cliente1@email.com',
    telefone: '27988881111',
    senha: 'Temp123',
    empresa: 'Empresa do Cliente 1',
  },
  {
    tipo: 'client',
    id: 'client-002',
    nome: 'Cliente 2',
    email: 'cliente2@email.com',
    telefone: '27988882222',
    senha: 'Temp123',
    empresa: 'Empresa do Cliente 2',
  },
  // ... copie e cole 26 vezes mais, mudando os dados

  // SEUS 10 MOTOBOYS
  {
    tipo: 'motoboy',
    id: 'moto-001',
    nome: 'Motoboy 1',
    email: 'moto1@email.com',
    telefone: '27977771111',
    senha: 'Moto123',
    placa: 'ABC-1234',
    cpf: '000.000.000-00',
    taxaPadrao: '7.00',
  },
  // ... copie e cole 9 vezes mais
];
```

### 3.2 Executar importação

```bash
# Via Railway (recomendado)
railway run npx tsx server/scripts/import-users.ts

# Ou local (se tiver .env configurado)
npx tsx server/scripts/import-users.ts
```

Você verá:
```
🚀 Iniciando importação de usuários...
✅ Central Guriri Express criado com sucesso!
✅ Cliente 1 criado com sucesso!
✅ Motoboy 1 criado com sucesso!
...
🎉 Importação concluída!
```

---

## Passo 4: Distribuir Credenciais (5 minutos)

### Template de Mensagem

**Para a Central (você):**
```
🚀 Sistema Guriri Express - Acesso Central

Link: https://seu-app.railway.app
Email: seu-email@empresa.com
Senha: SuaSenhaForte123!

Seu dashboard: Gestão completa de pedidos e motoboys
```

**Para Clientes:**
```
🚀 Sistema Guriri Express - Acesso Cliente

Olá [Nome],

Nosso novo sistema de entregas está no ar!

Link: https://seu-app.railway.app
Email: [email]
Senha: Temp123

Por favor, troque a senha no primeiro acesso.

Pelo sistema você pode:
✅ Criar pedidos
✅ Acompanhar entregas em tempo real
✅ Ver histórico

Dúvidas? Me chame no WhatsApp!
```

**Para Motoboys:**
```
🚀 Sistema Guriri Express - Acesso Motoboy

Fala [Nome]!

Link do sistema: https://seu-app.railway.app
Email: [email]
Senha: Moto123

Troque a senha no primeiro acesso.

Pelo app você:
✅ Vê pedidos disponíveis
✅ Aceita entregas
✅ Marca como entregue
✅ Vê seu histórico

É só adicionar o link na tela inicial do celular e usar como app!
```

---

## 🎯 Teste Completo (faça antes de distribuir)

1. **Login como Central**
   - Acesse a URL
   - Faça login com suas credenciais de admin
   - Veja o dashboard

2. **Criar Pedido Teste**
   - Crie um pedido de teste
   - Preencha endereços, valor, forma de pagamento

3. **Login como Motoboy**
   - Abra em aba anônima/navegador diferente
   - Login com credencial de um motoboy
   - Aceite o pedido teste

4. **Verificar Tempo Real**
   - Volte para a central
   - Veja se o pedido mudou de status em tempo real
   - Confirme que WebSocket está funcionando

5. **Marcar como Entregue**
   - Como motoboy, marque o pedido como entregue
   - Verifique se aparece na central

---

## 📱 Dica: Transformar em App no Celular

**Android:**
1. Abrir Chrome
2. Acessar a URL
3. Menu (3 pontos) → "Adicionar à tela inicial"

**iPhone:**
1. Abrir Safari
2. Acessar a URL
3. Compartilhar → "Adicionar à Tela de Início"

---

## 🔐 Segurança - Você Está Protegido

✅ **Sem rota de cadastro público** - impossível criar conta sem você  
✅ **JWT com expiração** - tokens expiram em 24h  
✅ **Senhas com hash bcrypt** - impossível ver senhas no banco  
✅ **Roles separadas** - cliente não vê dados de outros clientes  

**Ninguém pode se cadastrar sozinho!** 🎉

---

## 💰 Custo Mensal Estimado

- **Railway Free Tier**: Grátis até 500h/mês (~16h/dia)
- **Railway Pago**: $5-10/mês (uso normal de 28 clientes)
- **Render**: Grátis com limitações, $7/mês sem limites
- **VPS próprio**: $5-20/mês dependendo do servidor

---

## 🆘 Problemas Comuns

### "Erro ao importar usuários"
```bash
# Verificar se DATABASE_URL está configurada
railway variables

# Se estiver vazia:
railway variables set DATABASE_URL="postgresql://..."
```

### "Não consigo fazer login"
- Verifique se o email está correto (é case-sensitive)
- Confirme que o usuário foi importado (veja os logs)
- Tente resetar senha criando novo registro

### "WebSocket não conecta"
- Normal! Railway/Render suportam WebSocket automaticamente
- Se persistir, limpe o cache do navegador

---

## 📞 Checklist Final

Antes de enviar para os usuários:

- [ ] App no ar e acessível
- [ ] 39 usuários importados (1 central + 28 clientes + 10 motoboys)
- [ ] Teste completo realizado
- [ ] Credenciais preparadas
- [ ] Mensagens personalizadas prontas
- [ ] Grupo de suporte criado (WhatsApp)

---

## 🎓 Vídeo Tutorial Sugerido (grave você mesmo)

**Script de 3 minutos:**

1. **Intro (30s):** "Oi pessoal, nosso novo sistema está no ar!"
2. **Acesso (30s):** Mostrar como acessar pelo celular
3. **Login (30s):** Como fazer login
4. **Cliente (30s):** Como criar um pedido
5. **Motoboy (30s):** Como aceitar e entregar
6. **Encerramento (30s):** "Qualquer dúvida, me chama!"

---

## ✅ PRONTO!

**Tempo total:** ~35 minutos  
**Complexidade:** Baixa  
**Custo inicial:** $0-5  

**Próximo passo:** Execute o Passo 1 agora! 🚀

---

## 📚 Documentação Completa

Para detalhes aprofundados, veja:
- `LANCAMENTO-INTERNO.md` - Guia completo e detalhado
- `DEPLOYMENT.md` - Outras opções de deploy
- `MIGRATION.md` - O que mudou do Replit
