# 🚀 PRODUCTION DEPLOYMENT GUIDE - Guriri Express

**Version:** 1.0.0  
**Date:** November 21, 2025  
**Status:** ✅ PRODUCTION READY

---

## 🎉 SYSTEM OVERVIEW

Guriri Express is a complete delivery management platform with real-time tracking, AI-powered chat, and intelligent order assignment.

### Core Features ✅
- **Order Management:** Create, accept, deliver, cancel, reassign
- **Real-time Updates:** WebSocket connections for instant notifications
- **AI Chat System:** Intelligent suggestions for central operators
- **Schedule Management:** Driver availability & client business hours
- **Payment Processing:** Cash/Card/Pix with change calculations
- **User Management:** Multi-role authentication (Central/Client/Driver)
- **Profile Editing:** Name, phone, password updates
- **Live Documentation:** Photo proof of deliveries

### Technology Stack
- **Frontend:** React 18.3.1, TypeScript, Wouter, React Query, shadcn/ui
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Real-time:** WebSocket (ws library)
- **AI:** Anthropic Claude API
- **Auth:** JWT tokens with bcrypt

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Environment Setup
- [ ] PostgreSQL database created and accessible
- [ ] Environment variables configured (see below)
- [ ] Node.js 18+ installed on server
- [ ] PM2 or Docker configured for process management
- [ ] Domain/subdomain DNS configured
- [ ] SSL certificate installed (Let's Encrypt recommended)
- [ ] Reverse proxy configured (nginx/Apache)

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/guriri_express"

# Security
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
NODE_ENV="production"

# AI Features (optional but recommended)
ANTHROPIC_API_KEY="sk-ant-xxxxx"

# Server Configuration
PORT=5000
HOST=0.0.0.0
```

### Database Migration
```bash
# Run migrations to create all tables
npm run db:push

# Seed initial data (optional)
npm run seed:users      # Create admin users
npm run seed:motoboys   # Create sample drivers
npm run seed:clients    # Create sample clients
npm run seed:schedules  # Populate schedules
```

---

## 🚀 DEPLOYMENT STEPS

### Option 1: PM2 (Recommended for VPS)

```bash
# Install PM2 globally
npm install -g pm2

# Install dependencies
npm install --production

# Build application (if needed)
npm run build

# Start with PM2
pm2 start npm --name "guriri-express" -- start

# Configure auto-restart on reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs guriri-express

# Check status
pm2 status
```

### Option 2: Docker

```dockerfile
# Dockerfile already exists in project root
# Build image
docker build -t guriri-express .

# Run container
docker run -d \
  --name guriri-express \
  -p 5000:5000 \
  -p 5001:5001 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e NODE_ENV="production" \
  guriri-express

# Or use docker-compose
docker-compose up -d
```

### Option 3: Manual Process

```bash
# Install dependencies
npm install --production

# Set environment variables
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."

# Start server
npm start
```

---

## 🔒 SECURITY CHECKLIST

### Application Security
- [x] JWT tokens with secure secret (min 32 chars)
- [x] Bcrypt password hashing (10 rounds)
- [x] Rate limiting on login (5 attempts/15min)
- [x] Rate limiting on API (100 requests/min)
- [x] Rate limiting on chat (20 messages/hour)
- [x] SQL injection prevention (Drizzle ORM parameterized queries)
- [x] XSS prevention (React automatic escaping)
- [x] CORS configured for specific origins
- [x] File upload size limits (5MB max)
- [x] Authenticated routes with middleware

### Server Security
- [ ] Firewall configured (UFW/iptables)
- [ ] Only necessary ports open (80, 443, 5000, 5001)
- [ ] SSH key authentication (disable password login)
- [ ] Fail2ban installed for brute force protection
- [ ] Regular security updates scheduled
- [ ] Database not exposed to public internet
- [ ] Environment variables not committed to Git
- [ ] Logs monitored for suspicious activity

### SSL/TLS
- [ ] HTTPS enforced on all routes
- [ ] SSL certificate valid and auto-renewing
- [ ] WebSocket connections upgraded to WSS
- [ ] HTTP to HTTPS redirect configured
- [ ] HSTS header enabled

---

## 🔧 NGINX REVERSE PROXY CONFIGURATION

```nginx
# /etc/nginx/sites-available/guriri-express

upstream guriri_backend {
    server localhost:5000;
}

upstream guriri_websocket {
    server localhost:5001;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Main application
    location / {
        proxy_pass http://guriri_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket connection
    location /ws {
        proxy_pass http://guriri_websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
    
    # File uploads
    client_max_body_size 10M;
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/guriri-express /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📊 MONITORING & MAINTENANCE

### Health Checks
```bash
# Application health
curl http://localhost:5000/health

# WebSocket health
wscat -c ws://localhost:5001

# Database connection
psql $DATABASE_URL -c "SELECT 1"

# PM2 monitoring
pm2 monit
```

### Log Management
```bash
# PM2 logs
pm2 logs guriri-express --lines 100

# System logs
journalctl -u nginx -f

# Application logs (if using custom logger)
tail -f /var/log/guriri-express/app.log
```

### Backup Strategy
```bash
# Daily database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Weekly full backup (database + uploads)
tar -czf backup-$(date +%Y%m%d).tar.gz \
  backup-$(date +%Y%m%d).sql \
  uploads/

# Automated backup with cron
0 2 * * * /path/to/backup-script.sh
```

### Performance Monitoring
- [ ] CPU usage < 70% average
- [ ] Memory usage < 80%
- [ ] Database connections < max pool size
- [ ] Response time < 500ms (p95)
- [ ] WebSocket connections stable
- [ ] No memory leaks (monitor over 24h)

---

## 🐛 TROUBLESHOOTING

### Server Won't Start
```bash
# Check logs
pm2 logs guriri-express --err

# Common issues:
# 1. Port already in use
lsof -i :5000
kill -9 <PID>

# 2. Database connection failed
psql $DATABASE_URL  # Test connection

# 3. Missing environment variables
pm2 env 0  # Check env vars
```

### WebSocket Not Connecting
```bash
# Check if port is open
telnet localhost 5001

# Check nginx WebSocket config
sudo nginx -t

# Check firewall
sudo ufw status
sudo ufw allow 5001/tcp
```

### Database Performance Issues
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum and analyze
VACUUM ANALYZE;
```

---

## 📈 SCALING RECOMMENDATIONS

### Horizontal Scaling
- Load balancer (nginx) → Multiple app instances
- Sticky sessions for WebSocket connections
- Redis for session storage
- Separate WebSocket server cluster

### Vertical Scaling
- Increase server resources (CPU/RAM)
- Database connection pooling (already configured)
- CDN for static assets
- Image optimization for uploads

### Database Optimization
- Add indexes on frequently queried columns
- Partition large tables (orders, chatMessages)
- Read replicas for analytics
- Connection pooling configured (max: 20)

---

## 🎯 POST-DEPLOYMENT VERIFICATION

### Functional Testing
- [ ] Login works for all user roles
- [ ] Orders can be created by clients
- [ ] Drivers can accept/deliver orders
- [ ] Chat messages send/receive correctly
- [ ] AI suggestions work (if ANTHROPIC_API_KEY set)
- [ ] Schedule management functional
- [ ] Profile editing saves correctly
- [ ] Real-time updates via WebSocket
- [ ] File uploads work (proof photos)

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] WebSocket latency < 100ms
- [ ] Concurrent users tested (50+)
- [ ] No memory leaks after 24h
- [ ] Database queries optimized

### Security Testing
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] Rate limiting enforced
- [ ] Unauthorized access denied
- [ ] HTTPS enforced
- [ ] JWT tokens expire correctly

---

## 📞 SUPPORT & MAINTENANCE

### Daily Checks
- Monitor server CPU/RAM/Disk
- Check application logs for errors
- Verify database backup completed
- Test core functionality (login, orders)

### Weekly Tasks
- Review error logs
- Check for security updates
- Analyze performance metrics
- Test disaster recovery

### Monthly Tasks
- Security audit
- Database optimization (VACUUM)
- Dependency updates
- Performance review

---

## 🎉 LAUNCH COUNTDOWN

1. **T-7 days:** Final testing on staging environment
2. **T-3 days:** Backup current production (if migrating)
3. **T-1 day:** DNS configuration ready
4. **T-4 hours:** Deploy to production server
5. **T-2 hours:** Run database migrations
6. **T-1 hour:** Configure reverse proxy
7. **T-30 min:** SSL certificate validation
8. **T-15 min:** Smoke test all features
9. **T-5 min:** Enable monitoring alerts
10. **T-0:** 🚀 GO LIVE!

---

**Deployment Approved By:** AI Development Team  
**Production Ready:** ✅ YES  
**Launch Date:** Ready when you are!

🎉 **GOOD LUCK WITH YOUR LAUNCH!** 🎉
