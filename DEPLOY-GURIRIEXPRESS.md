# 🚀 Deploy Guriri Express na VPS Delta Servers

## Domínio: www.guririexpress.com.br

---

## 📋 PASSO 1: Configurar DNS

No painel da **Registro.br** (ou onde seu domínio está registrado):

### Adicione os seguintes registros DNS:

```
Tipo: A
Nome: @
Valor: SEU_IP_DA_VPS
TTL: 3600

Tipo: A
Nome: www
Valor: SEU_IP_DA_VPS
TTL: 3600
```

**Aguarde 5-30 minutos** para propagação DNS.

**Teste a propagação:**
```bash
# No seu computador local
nslookup guririexpress.com.br
nslookup www.guririexpress.com.br
```

---

## 📋 PASSO 2: Conectar na VPS

```bash
ssh root@SEU_IP_DA_VPS
```

Se for primeira vez, aceite a fingerprint digitando `yes`.

---

## 📋 PASSO 3: Instalação Inicial (Execute UMA VEZ)

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v18.x.x
npm --version

# Instalar ferramentas globais
npm install -g pm2 tsx

# Instalar Git
apt install -y git

# Instalar Nginx
apt install -y nginx

# Instalar Certbot para SSL
apt install -y certbot python3-certbot-nginx

# Criar diretório da aplicação
mkdir -p /var/www
cd /var/www
```

---

## 📋 PASSO 4: Clonar Projeto

```bash
cd /var/www

# Clonar do GitHub
git clone https://github.com/IAforIA/IAforIA.git guriri-express

# Entrar na pasta do projeto
cd guriri-express/GuririExpress

# Instalar dependências
npm install
```

---

## 📋 PASSO 5: Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
nano /var/www/guriri-express/GuririExpress/.env
```

**Cole este conteúdo (AJUSTE OS VALORES!):**

```env
# Database (Neon PostgreSQL - pegue no painel do Neon)
DATABASE_URL=postgresql://neondb_owner:SEU_PASSWORD@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Security Secrets (GERE NOVOS!)
JWT_SECRET=gere-uma-string-aleatoria-de-32-caracteres-aqui
SESSION_SECRET=gere-outra-string-aleatoria-de-32-caracteres

# Server Configuration
PORT=5000
WS_PORT=5001
NODE_ENV=production

# Domain
FRONTEND_URL=https://www.guririexpress.com.br
BACKEND_URL=https://www.guririexpress.com.br

# AI Chat (opcional - deixe vazio se não tiver)
ANTHROPIC_API_KEY=
```

**Para gerar secrets seguros:**
```bash
# Execute estes comandos e copie o resultado
openssl rand -base64 32  # Para JWT_SECRET
openssl rand -base64 32  # Para SESSION_SECRET
```

Salve o arquivo: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 📋 PASSO 6: Build do Projeto

```bash
cd /var/www/guriri-express/GuririExpress

# Build do frontend
npm run build

# Verificar se foi criada a pasta dist
ls -la dist/
```

---

## 📋 PASSO 7: Configurar PM2

```bash
# Criar diretório de logs
mkdir -p /var/log/pm2

# Copiar ecosystem config
cat > /var/www/guriri-express/GuririExpress/ecosystem.config.json << 'EOF'
{
  "apps": [
    {
      "name": "guriri-express",
      "script": "server/index.ts",
      "interpreter": "node",
      "interpreter_args": "--loader tsx",
      "cwd": "/var/www/guriri-express/GuririExpress",
      "instances": 2,
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": 5000,
        "WS_PORT": 5001
      },
      "error_file": "/var/log/pm2/guriri-express-error.log",
      "out_file": "/var/log/pm2/guriri-express-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "autorestart": true,
      "max_memory_restart": "500M",
      "watch": false
    }
  ]
}
EOF

# Iniciar aplicação com PM2
pm2 start ecosystem.config.json

# Salvar configuração
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup systemd
# IMPORTANTE: Execute o comando que o PM2 mostrar na tela

# Verificar status
pm2 status
pm2 logs guriri-express --lines 20
```

---

## 📋 PASSO 8: Configurar Nginx

```bash
# Criar arquivo de configuração do Nginx
nano /etc/nginx/sites-available/guririexpress
```

**Cole este conteúdo:**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name guririexpress.com.br www.guririexpress.com.br;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://www.guririexpress.com.br$request_uri;
    }
}

# Redirect non-www to www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name guririexpress.com.br;

    ssl_certificate /etc/letsencrypt/live/guririexpress.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/guririexpress.com.br/privkey.pem;
    
    return 301 https://www.guririexpress.com.br$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.guririexpress.com.br;

    ssl_certificate /etc/letsencrypt/live/guririexpress.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/guririexpress.com.br/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;

    root /var/www/guriri-express/GuririExpress/dist/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /ws {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /uploads/ {
        alias /var/www/guriri-express/GuririExpress/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    access_log /var/log/nginx/guririexpress-access.log;
    error_log /var/log/nginx/guririexpress-error.log;
}
```

Salve: `Ctrl+O`, `Enter`, `Ctrl+X`

**Ativar configuração:**

```bash
# Criar link simbólico
ln -s /etc/nginx/sites-available/guririexpress /etc/nginx/sites-enabled/

# Remover configuração default (se houver)
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Se aparecer "syntax is ok" e "test is successful", prossiga:
systemctl reload nginx
```

---

## 📋 PASSO 9: Configurar SSL (HTTPS)

```bash
# Criar diretório para validação Certbot
mkdir -p /var/www/certbot

# Obter certificado SSL GRATUITO
certbot --nginx -d guririexpress.com.br -d www.guririexpress.com.br

# Durante a instalação:
# 1. Digite seu email
# 2. Aceite os termos (Y)
# 3. Escolha se quer receber emails (Y ou N)
# 4. Certbot vai configurar automaticamente o SSL

# Testar renovação automática
certbot renew --dry-run
```

O Certbot já configura renovação automática. Não precisa fazer nada mais!

---

## 📋 PASSO 10: Configurar Firewall

```bash
# Permitir SSH, HTTP e HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Ativar firewall
ufw enable

# Verificar status
ufw status
```

---

## 🎉 FINALIZADO! Acesse: https://www.guririexpress.com.br

---

## 🔄 ATUALIZAÇÕES FUTURAS

Quando fizer alterações no código:

```bash
# Conectar na VPS
ssh root@SEU_IP_DA_VPS

# Ir para o diretório
cd /var/www/guriri-express/GuririExpress

# Executar deploy
./deploy.sh
```

Ou manualmente:

```bash
cd /var/www/guriri-express/GuririExpress
git pull origin main
npm install
npm run build
pm2 restart guriri-express
```

---

## 📊 COMANDOS ÚTEIS

```bash
# Ver logs em tempo real
pm2 logs guriri-express

# Ver logs do Nginx
tail -f /var/log/nginx/guririexpress-error.log

# Status da aplicação
pm2 status

# Monitoramento de recursos
pm2 monit

# Reiniciar aplicação
pm2 restart guriri-express

# Parar aplicação
pm2 stop guriri-express

# Iniciar aplicação
pm2 start guriri-express

# Ver processos do sistema
htop  # (instale com: apt install htop)
```

---

## 🆘 TROUBLESHOOTING

### Problema: Site não carrega (502 Bad Gateway)

```bash
# Verificar se aplicação está rodando
pm2 status

# Ver logs de erro
pm2 logs guriri-express --lines 50

# Reiniciar aplicação
pm2 restart guriri-express
```

### Problema: SSL não funciona

```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew

# Ver logs do Certbot
journalctl -u certbot -n 50
```

### Problema: Banco de dados não conecta

```bash
# Verificar .env
cat /var/www/guriri-express/GuririExpress/.env | grep DATABASE_URL

# Testar conexão com Neon
# (instale psql: apt install postgresql-client)
psql "sua-database-url-aqui"
```

### Problema: WebSocket não funciona

```bash
# Verificar se porta está aberta
netstat -tulpn | grep 5001

# Ver logs específicos do WebSocket
pm2 logs guriri-express | grep ws
```

---

## 📞 SUPORTE

Se precisar de ajuda, verifique:

1. Logs da aplicação: `pm2 logs guriri-express`
2. Logs do Nginx: `tail -f /var/log/nginx/guririexpress-error.log`
3. Status dos serviços: `systemctl status nginx`, `pm2 status`

---

**Criado em:** 22/11/2025
**Domínio:** www.guririexpress.com.br
**VPS:** Delta Servers
