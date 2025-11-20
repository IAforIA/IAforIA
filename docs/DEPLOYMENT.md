# Deployment Guide - Guriri Express

This guide covers deploying Guriri Express outside of Replit's environment to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:
- A PostgreSQL database (Neon, Supabase, Railway, or self-hosted)
- Node.js 20+ installed (for local development)
- Environment variables configured (see `.env.example`)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key-change-this-in-production-min-32-chars
SESSION_SECRET=your-session-secret-change-this-in-production
PORT=5000
NODE_ENV=production
```

**Security Note**: Generate strong secrets using:
```bash
# Generate random 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Setup

After configuring `DATABASE_URL`, push the schema:

```bash
npm install
npm run db:push
```

To seed initial users (optional):
```bash
npx tsx server/scripts/seed-users.ts
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

**Local Docker Development:**
```bash
# Build and start all services (app + PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

**Production Docker:**
```bash
# Build image
docker build -t guriri-express .

# Run container (requires external PostgreSQL)
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  --name guriri-app \
  guriri-express
```

### Option 2: Railway

Railway provides simple Git-based deployment with PostgreSQL provisioning.

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize project: `railway init`
4. Add PostgreSQL: `railway add -d postgres`
5. Set environment variables:
   ```bash
   railway variables set JWT_SECRET="your-secret"
   railway variables set SESSION_SECRET="your-secret"
   ```
6. Deploy: `railway up`

**Railway Configuration:**
- Build Command: `npm run build`
- Start Command: `npm start`
- Port: Railway auto-detects from `PORT` env var

### Option 3: Render

Render offers free tier with PostgreSQL support.

1. Create account at render.com
2. Create new **PostgreSQL** database
3. Create new **Web Service** from Git repository
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `DATABASE_URL`: (auto-populated from Render PostgreSQL)
     - `JWT_SECRET`: your-secret-key
     - `SESSION_SECRET`: your-session-secret
     - `NODE_ENV`: production

### Option 4: DigitalOcean App Platform

1. Create new app from GitHub repository
2. Add PostgreSQL database component
3. Configure build settings:
   - **Build Command**: `npm run build`
   - **Run Command**: `npm start`
4. Set environment variables in app settings
5. Deploy

### Option 5: VPS (Ubuntu/Debian)

For self-hosted deployment on a VPS:

**1. Setup Server:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2
```

**2. Setup Database:**
```bash
sudo -u postgres psql
CREATE DATABASE guriri_express;
CREATE USER guriri WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE guriri_express TO guriri;
\q
```

**3. Deploy Application:**
```bash
# Clone repository
git clone <your-repo-url> /var/www/guriri-express
cd /var/www/guriri-express

# Install dependencies
npm ci --omit=dev

# Create .env file
nano .env
# (paste your environment variables)

# Build application
npm run build

# Push database schema
npm run db:push

# Start with PM2
pm2 start npm --name "guriri-express" -- start
pm2 save
pm2 startup
```

**4. Setup Nginx Reverse Proxy:**
```nginx
# /etc/nginx/sites-available/guriri-express
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/guriri-express /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL with Certbot (recommended)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 6: Vercel (Frontend Only)

**Note**: Vercel is optimized for frontend/serverless. For full-stack deployment, use Railway or Render instead.

If you want to deploy only the frontend to Vercel:
1. Separate the backend to a different service (Railway/Render)
2. Update API URLs in the frontend to point to the backend service
3. Deploy frontend: `vercel --prod`

## Post-Deployment Checklist

- [ ] Verify database connection and schema
- [ ] Test user authentication (login/logout)
- [ ] Verify WebSocket connections work
- [ ] Check real-time order updates
- [ ] Test all three dashboards (Central, Client, Driver)
- [ ] Monitor application logs for errors
- [ ] Setup monitoring (optional: UptimeRobot, Sentry)
- [ ] Configure backups for PostgreSQL database
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up CORS if frontend is on different domain

## Troubleshooting

**Database Connection Errors:**
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check firewall rules allow database connections
- Ensure PostgreSQL is running and accessible

**WebSocket Connection Failures:**
- Verify proxy configuration supports WebSocket upgrade
- Check `ws://` (dev) vs `wss://` (production with SSL)
- Ensure firewall allows WebSocket connections

**Build Failures:**
- Run `npm ci` to ensure clean dependency installation
- Check Node.js version is 20+
- Verify TypeScript compilation: `npm run check`

**Port Binding Errors:**
- Ensure `PORT` environment variable is set
- Check no other process is using the port
- For Render/Railway, use their auto-assigned `PORT`

## Monitoring & Logs

**Docker:**
```bash
docker-compose logs -f app
```

**PM2:**
```bash
pm2 logs guriri-express
pm2 monit
```

**Railway/Render:**
Check logs in respective dashboards.

## Scaling Considerations

- **Database**: Use connection pooling (already configured with Neon serverless)
- **Application**: Run multiple instances behind load balancer
- **WebSocket**: Use Redis for multi-instance WebSocket coordination
- **Static Assets**: Serve from CDN (Cloudflare, AWS CloudFront)

## Support

For deployment issues, check:
- Application logs for specific error messages
- Database connection status
- Environment variables are properly set
- Port accessibility and firewall rules
