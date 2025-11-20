# 🔗 Links dos Dashboards - Guriri Express

## 📍 Rotas Principais da Aplicação

Quando o servidor estiver rodando em `http://localhost:5000`, use estes links:

### 🏠 Página Inicial (Landing)
```
http://localhost:5000/
```
- Tela de login
- Ponto de entrada para todos os usuários

---

### 🏢 Dashboard Central (Gestão/Admin)
```
http://localhost:5000/central
```
**Requer login como:** `role: "central"`

**Funcionalidades:**
- Visão geral de todos os pedidos
- Gestão de motoboys
- KPIs e estatísticas
- Feed em tempo real de pedidos
- Atribuição manual de motoboys

---

### 👤 Dashboard Cliente
```
http://localhost:5000/client
```
**Requer login como:** `role: "client"`

**Funcionalidades:**
- Criar novos pedidos
- Ver histórico de pedidos
- Acompanhar status em tempo real
- Detalhes de entrega

---

### 🏍️ Dashboard Motoboy (Driver)
```
http://localhost:5000/driver
```
**Requer login como:** `role: "motoboy"`

**Funcionalidades:**
- Ver pedidos disponíveis
- Aceitar pedidos
- Marcar como entregue
- Histórico de entregas
- Ganhos

---

## 🧪 Páginas de Teste/Debug

### Página de Teste Simples
```
http://localhost:5000/test
```
- Tela de teste básica
- Não requer autenticação

### Diagnóstico do Sistema
```
http://localhost:5000/diagnostico.html
```
- Ferramentas de diagnóstico
- Debug de problemas

### Captura de Erros
```
http://localhost:5000/error-capture.html
```
- Visualizador de erros
- Logs do sistema

### Fallback Index
```
http://localhost:5000/index-fallback.html
```
- Página de fallback

---

## 🎨 HTMLs de Referência (Design Mockups)

Estes são arquivos estáticos em `attached_assets/` (não conectados ao backend):

### Dashboard Central - Gestão
```
file:///c:/Users/JEAN/GuririExpressReplit/GuririExpress/attached_assets/dashboard_central_gestao_1763053158329.html
```

### Dashboard Central
```
file:///c:/Users/JEAN/GuririExpressReplit/GuririExpress/attached_assets/dashboard_central_1763053158329.html
```

### Dashboard Cliente
```
file:///c:/Users/JEAN/GuririExpressReplit/GuririExpress/attached_assets/dashboard_cliente_1763053158330.html
```

### Dashboard Motoboy
```
file:///c:/Users/JEAN/GuririExpressReplit/GuririExpress/attached_assets/dashboard_motoboy_1763053158330.html
```

### Index de Referência
```
file:///c:/Users/JEAN/GuririExpressReplit/GuririExpress/attached_assets/index_1763053158331.html
```

---

## ⚙️ Como Testar

### 1. Iniciar o Servidor

```bash
cd GuririExpress
npm run dev
```

Aguarde ver:
```
[vite] server started at http://localhost:5000
```

### 2. Acessar os Dashboards

**Opção A: Testar Fluxo Completo**
1. Abrir `http://localhost:5000/`
2. Fazer login com usuário de teste
3. Será redirecionado para dashboard correto baseado na role

**Opção B: Acesso Direto (se já logado)**
- Central: `http://localhost:5000/central`
- Cliente: `http://localhost:5000/client`
- Motoboy: `http://localhost:5000/driver`

### 3. Criar Usuários de Teste (se ainda não fez)

```bash
# Execute o script de importação
npx tsx server/scripts/import-users.ts

# Ou use o seed existente
npx tsx server/scripts/seed-users.ts
```

---

## 🔐 Credenciais Padrão (do script de exemplo)

Se usar o `import-users.ts` de exemplo:

**Central:**
- Email: `admin@guriri.com`
- Senha: `AdminGuriri2024!`
- Acessa: `/central`

**Cliente:**
- Email: `padaria@email.com`
- Senha: `Temp123`
- Acessa: `/client`

**Motoboy:**
- Email: `joao.moto@email.com`
- Senha: `Moto123`
- Acessa: `/driver`

---

## 📱 Testar no Celular (mesma rede WiFi)

1. Descubra seu IP local:
   ```bash
   # Windows
   ipconfig
   # Procure por "IPv4 Address"
   
   # Mac/Linux
   ifconfig
   # Procure por "inet"
   ```

2. No celular, acesse:
   ```
   http://SEU_IP:5000/
   ```
   
   Exemplo: `http://192.168.1.100:5000/`

---

## 🔍 Verificar se Está Funcionando

### Checklist:

- [ ] `http://localhost:5000/` carrega a tela de login
- [ ] Login funciona e redireciona para dashboard correto
- [ ] `/central` mostra estatísticas e pedidos
- [ ] `/client` permite criar pedido
- [ ] `/driver` mostra pedidos disponíveis
- [ ] WebSocket conecta (veja no console do navegador)
- [ ] Mudanças aparecem em tempo real entre dashboards

### Debug:

**Se nada carregar:**
```bash
# Verificar se o servidor está rodando
netstat -ano | findstr :5000

# Reiniciar o servidor
npm run dev
```

**Se login não funcionar:**
```bash
# Verificar se banco tem usuários
# (precisa ter DATABASE_URL configurada)
npm run db:push
npx tsx server/scripts/import-users.ts
```

**Se der erro 404:**
- Certifique-se que está usando as rotas corretas
- Verifique se Vite compilou o frontend
- Limpe o cache: `Ctrl+Shift+R`

---

## 🎯 Ordem Recomendada para Testar

1. **Landing Page** (`/`) - Login
2. **Dashboard Central** (`/central`) - Visão geral
3. **Dashboard Cliente** (`/client`) - Criar pedido teste
4. **Dashboard Motoboy** (`/driver`) - Aceitar pedido
5. **Voltar para Central** - Verificar atualização em tempo real

---

## 💡 Dica Pro

Abra 3 janelas/abas lado a lado:
- **Janela 1:** Central (modo admin)
- **Janela 2:** Cliente (aba anônima)
- **Janela 3:** Motoboy (outro navegador)

Assim você vê as atualizações em tempo real acontecendo! 🚀
