# 🗄️ Como Configurar o Banco de Dados - Guriri Express

## Opção 1: Neon (RECOMENDADO - Grátis e Fácil)

### Passo 1: Criar conta no Neon
1. Acesse: https://neon.tech
2. Clique em "Sign Up" (pode usar conta Google)
3. É grátis! Não precisa cartão de crédito

### Passo 2: Criar projeto
1. Após login, clique em "Create Project"
2. Nome: `guriri-express`
3. Region: Escolha a mais próxima (ex: AWS - São Paulo)
4. Clique em "Create Project"

### Passo 3: Copiar Connection String
1. Na página do projeto, vá em "Connection Details"
2. Copie a string que começa com `postgresql://...`
3. Exemplo: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

### Passo 4: Colar no .env
Abra o arquivo `.env` e cole a connection string:

```env
DATABASE_URL=postgresql://sua-string-aqui
```

### Passo 5: Aplicar Schema
```bash
npm run db:push
```

### Passo 6: Importar Motoboys
```bash
npx tsx server/scripts/import-motoboys-reais.ts
```

---

## Opção 2: SQLite Local (Mais Simples, Sem Internet)

Se preferir não criar conta online:

### Passo 1: Instalar dependência SQLite
```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

### Passo 2: Atualizar .env
```env
DATABASE_URL=file:./guriri_express.db
```

### Passo 3: Aplicar schema
```bash
npm run db:push
```

**Obs:** SQLite tem menos recursos que PostgreSQL (sem full-text search, etc)

---

## ✅ Verificar se Funcionou

Após configurar, teste:

```bash
# Aplicar schema
npm run db:push

# Importar motoboys
npx tsx server/scripts/import-motoboys-reais.ts

# Iniciar servidor
npm run dev
```

Deve ver:
```
✅ Motoboys importados com sucesso: 10
```

---

## 🚨 Problemas Comuns

**"DATABASE_URL not found"**
- Verifique se criou o arquivo `.env`
- Verifique se a string está correta (sem espaços)

**"Connection refused"**
- Para Neon: verifique se copiou a string completa (com senha)
- Para SQLite: ignore, é normal

**"Permission denied"**
- Neon: verifique se a senha está correta na connection string

---

## 📞 Precisa de Ajuda?

Escolha uma opção e me avise:
- [ ] Opção 1: Neon (vou te guiar passo a passo)
- [ ] Opção 2: SQLite (configuração automática)
