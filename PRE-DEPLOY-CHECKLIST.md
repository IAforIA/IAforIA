# INSTRUÇÕES DE PRÉ-DEPLOY - CHECKLIST OBRIGATÓRIO

## ✅ ANTES DE FAZER DEPLOY

### 1. Verificar Variáveis de Ambiente

- [ ] `DATABASE_URL` configurada (Neon PostgreSQL)
- [ ] `JWT_SECRET` gerado (mínimo 32 caracteres)
- [ ] `SESSION_SECRET` gerado (mínimo 32 caracteres)
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000` e `WS_PORT=5001` configurados

**Gerar secrets seguros:**
```bash
openssl rand -base64 32  # Para JWT_SECRET
openssl rand -base64 32  # Para SESSION_SECRET
```

### 2. Atualizar Dependências

```bash
npm install
npm audit fix
```

### 3. Build de Teste Local

```bash
npm run build
```

Verificar se o build foi bem-sucedido sem erros.

### 4. Commit das Configurações

```bash
git add .
git commit -m "chore: prepare for production deploy"
git push origin main
```

### 5. Preparar Banco de Dados

Se ainda não executou:
```bash
npm run db:push
npm run import:empresa
```

---

## 🚀 DEPLOY NA VPS

Siga o arquivo **DEPLOY-GURIRIEXPRESS.md** passo a passo.

---

## ⚠️ AVISOS IMPORTANTES

1. **NUNCA** commite arquivos `.env`, `.env.local`, `.env.production` com credenciais reais
2. O `.gitignore` já está configurado para ignorar esses arquivos
3. A pasta `uploads/` não deve estar no Git (já está no .gitignore)
4. Logs não devem estar no Git (já está no .gitignore)

---

## 🔐 SEGURANÇA

- [ ] Firewall configurado na VPS (portas 22, 80, 443)
- [ ] SSL/HTTPS ativo via Certbot
- [ ] Rate limiters ativos (já configurados no código)
- [ ] Secrets fortes e únicos
- [ ] DATABASE_URL não exposta publicamente
- [ ] CORS configurado para domínio de produção

---

## 📊 APÓS O DEPLOY

1. Testar todas as funcionalidades:
   - [ ] Login/Registro
   - [ ] Criação de pedidos
   - [ ] Aceite de pedidos por motoboys
   - [ ] Upload de comprovantes
   - [ ] Chat em tempo real
   - [ ] WebSocket funcionando
   - [ ] Mapa carregando corretamente

2. Monitoramento:
   ```bash
   pm2 logs guriri-express
   pm2 monit
   ```

3. Verificar SSL:
   ```bash
   curl -I https://www.guririexpress.com.br
   ```

---

## 🆘 ROLLBACK

Se algo der errado:

```bash
# Na VPS
pm2 stop guriri-express
cd /var/www/guriri-express/GuririExpress
git checkout <commit-anterior-funcionando>
npm install
npm run build
pm2 restart guriri-express
```

---

**Última atualização:** 22/11/2025
