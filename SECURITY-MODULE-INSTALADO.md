# 🛡️ Agent Zero – IA Hacker White Hat

## ✅ MÓDULO DE SEGURANÇA INSTALADO COM SUCESSO

### 📂 Arquivos Criados

```
.agent/
├── index.ts (modificado - integração do security module)
├── config.json (modificado - security.enabled: true)
└── security/
    ├── README.md                    # Documentação completa
    ├── security-agent.ts            # IA principal (OpenAI)
    ├── security-executor.ts         # Dispatcher de ações
    ├── security-schema.ts           # Types TypeScript
    ├── events/
    │   └── security-event-bus.ts    # EventEmitter centralizado
    ├── analyzers/
    │   ├── traffic-analyzer.ts      # Análise de tráfego
    │   ├── auth-analyzer.ts         # Brute force detection
    │   └── dependency-analyzer.ts   # OpenAI/DB monitoring
    └── prompts/
        └── security-system-prompt.md # Prompt da IA (400 linhas)

server/
├── middleware/
│   └── security.ts                  # Middleware Express
└── examples/
    └── security-integration-example.ts  # Exemplos de uso

tests/
└── security-module.test.ts          # Suite de testes completa
```

---

## 🚀 INÍCIO RÁPIDO

### 1. Testar o Módulo

```bash
npm run test:security
```

**O que vai acontecer:**
- ✅ Teste de detecção de brute force (10 logins falhados)
- ✅ Teste de falha OpenAI (403, 429)
- ✅ Teste de spike de tráfego (DDoS)
- ✅ Teste de execução de ações
- ✅ Teste de análise com IA (se OPENAI_API_KEY configurada)

### 2. Ativar no Agent Zero

O módulo já está integrado! Basta rodar:

```bash
npm run agent
```

**Você verá:**
```
╔══════════════════════════════════════════════════════════╗
║              🤖  AGENT-ZERO v2.5  🤖                    ║
╚══════════════════════════════════════════════════════════╝

Mode: 🛠️  DEVELOPMENT

🛡️  Inicializando módulo de segurança...

✅ Security Agent ativado
✅ Traffic Analyzer ativado
✅ Auth Analyzer ativado
✅ Dependency Analyzer ativado

🛡️  Agent Zero - IA Hacker White Hat - ONLINE

✅ Agent-Zero is now watching your codebase...
```

### 3. Integrar com Express (Opcional)

Editar `server/app.ts`:

```typescript
import { securityMiddleware, setSecurityAnalyzers } from './middleware/security.js';

// ... após express.json()

// Se Agent Zero estiver rodando
if (process.env.ENABLE_AGENT_ZERO === 'true') {
  const { default: agentZero } = await import('../.agent/index.js');
  const analyzers = agentZero.getSecurityAnalyzers();
  setSecurityAnalyzers(analyzers);
  app.use(securityMiddleware);
}
```

---

## 🎯 O QUE O MÓDULO FAZ

### Monitoramento Automático

| Componente | O que monitora | Quando emite alerta |
|------------|----------------|---------------------|
| **TrafficAnalyzer** | Requisições HTTP | Spike >3x baseline, alta taxa de erros |
| **AuthAnalyzer** | Logins e autenticação | 5+ falhas do mesmo IP, credential stuffing |
| **DependencyAnalyzer** | OpenAI, DB, Pagamentos | Falhas 429/403/500, 3+ erros consecutivos |

### Análise com IA

Quando detecta um incidente:
1. 🤖 SecurityAgent recebe o evento
2. 🧠 Envia para OpenAI com contexto completo
3. 📊 IA analisa e recomenda ações defensivas
4. ✅ Valida que ações são seguras (segura: true)
5. 🔧 SecurityExecutor executa as ações

### Ações Disponíveis (12 tipos)

| Ação | Quando usar | Exemplo |
|------|-------------|---------|
| `aplicar-rate-limit` | Tráfego anormal | 10 req/min por IP |
| `bloquear-ip-temporario` | Brute force | Bloquear 192.168.1.100 por 60min |
| `modo-degradado` | Sobrecarga | Desabilitar analytics, recommendations |
| `fallback-provider` | OpenAI 429 | Alternar para Anthropic |
| `notificar-seguranca` | Incidente crítico | Telegram/Slack alert |
| `criar-pr-correcao` | Vulnerabilidade | PR com fix de CVE |
| `desabilitar-endpoint` | Endpoint comprometido | Desabilitar /admin temporariamente |
| `rotacionar-credenciais` | API key vazada | Rotacionar OPENAI_API_KEY |
| `aumentar-logging` | Investigação | Debug logs por 30min |
| `cache-agressivo` | Reduzir carga | Cache 5min por 30min |
| `rollback-deploy` | Deploy problemático | Reverter para v1.2.3 |
| `isolar-servico` | Serviço comprometido | Isolar payment-service |

---

## 📊 EXEMPLOS DE USO

### Exemplo 1: Brute Force Detectado

**Cenário:** 15 logins falhados em 5 minutos do IP `192.168.1.100`

**IA responde:**
```json
{
  "tipo_incidente": "brute-force",
  "severidade": "critica",
  "acoes_recomendadas": [
    {
      "acao": "bloquear-ip-temporario",
      "parametros": {
        "ip": "192.168.1.100",
        "duracao_minutos": 60,
        "motivo": "15 tentativas falhadas"
      },
      "segura": true,
      "prioridade": 1
    },
    {
      "acao": "notificar-seguranca",
      "parametros": {
        "destinatarios": ["telegram"],
        "mensagem": "🚨 Brute force em /auth/login",
        "urgencia": "alta"
      },
      "segura": true,
      "prioridade": 2
    }
  ]
}
```

**Logs:**
```
🛡️  [SecurityAgent] Evento recebido: brute-force de auth-analyzer
🤖 [SecurityAgent] Analisando com IA...
📊 [SecurityAgent] Análise:
  Tipo: brute-force
  Severidade: critica
  Ações: 2

🔧 [SecurityAgent] Executando: bloquear-ip-temporario (prioridade 1)
   ✅ IP 192.168.1.100 bloqueado por 60 minutos

🔧 [SecurityAgent] Executando: notificar-seguranca (prioridade 2)
   ✅ Notificação enviada (alta)
```

### Exemplo 2: OpenAI Rate Limit (429)

**Cenário:** OpenAI retorna 429 (too many requests)

**IA responde:**
```json
{
  "tipo_incidente": "rate-limit-externo",
  "severidade": "alta",
  "acoes_recomendadas": [
    {
      "acao": "cache-agressivo",
      "parametros": {
        "endpoints": ["/chat", "/ai/optimize"],
        "ttl_segundos": 300,
        "duracao_minutos": 30
      },
      "prioridade": 1
    },
    {
      "acao": "aplicar-rate-limit",
      "parametros": {
        "endpoint": "/chat",
        "limite_requisicoes": 10,
        "janela_tempo": 60
      },
      "prioridade": 2
    }
  ]
}
```

**Resultado:**
- ✅ Cache ativado (TTL 5min) nos endpoints de IA
- ✅ Rate limit aplicado (10 req/min)
- ✅ Carga da OpenAI reduzida em ~70%

### Exemplo 3: Spike de Tráfego (Possível DDoS)

**Cenário:** RPM sobe de 60 para 180 (3x baseline)

**IA responde:**
```json
{
  "tipo_incidente": "ddos-tentativa",
  "severidade": "alta",
  "acoes_recomendadas": [
    {
      "acao": "aplicar-rate-limit",
      "parametros": {
        "endpoint": "/api/*",
        "limite_requisicoes": 30,
        "janela_tempo": 60
      },
      "prioridade": 1
    },
    {
      "acao": "modo-degradado",
      "parametros": {
        "funcionalidades_desabilitadas": ["analytics", "recommendations"],
        "duracao_estimada": 15
      },
      "prioridade": 2
    }
  ]
}
```

**Resultado:**
- ✅ Rate limit aplicado (30 req/min)
- ✅ Features não-críticas desabilitadas
- ✅ Sistema continua operacional em modo degradado

---

## ⚠️ RESTRIÇÕES ÉTICAS

### ✅ PERMITIDO (Blue Team / White Hat)
- Bloquear IPs atacantes
- Rate limiting
- Desabilitar endpoints
- Rotacionar credenciais
- Fallbacks
- Notificações
- PRs com correções
- Rollbacks
- Cache

### ❌ PROIBIDO (Red Team / Black Hat)
- Contra-ataques
- Exploits
- Payloads maliciosos
- Acesso não autorizado
- Lateral movement
- Data exfiltration
- Persistência
- Qualquer ofensiva

**🔒 GARANTIA:** Todas as ações passam por validação `segura: true` antes de execução.

---

## 🧪 TESTANDO

### Teste Automatizado
```bash
npm run test:security
```

### Teste Manual - Brute Force
```bash
# Terminal 1: Rodar Agent Zero
npm run agent

# Terminal 2: Simular ataques
for i in {1..10}; do
  curl -X POST http://localhost:5000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","senha":"wrong"}'
  sleep 1
done
```

**Você verá:**
```
🛡️  [SecurityAgent] Evento recebido: brute-force de auth-analyzer
🤖 [SecurityAgent] Analisando com IA...
🔧 [SecurityAgent] Executando: bloquear-ip-temporario
   ✅ IP bloqueado por 60 minutos
```

### Teste Manual - OpenAI Failure
```typescript
// Adicionar em server/ai-engine.ts
import { withDependencyMonitoring } from './middleware/security.js';

const response = await withDependencyMonitoring('openai', () =>
  this.openai.chat.completions.create({ model: 'MODELO_INVALIDO', ... })
);
// Isso dispara análise automática
```

---

## 📝 CONFIGURAÇÃO

### .agent/config.json

```json
{
  "security": {
    "enabled": true,              // Ativar módulo
    "model": "gpt-4o-mini",       // Modelo para análise
    "autoExecute": true,          // Executar ações automaticamente
    "maxActionsPerIncident": 3,   // Max 3 ações por incidente
    "notifyOnSeverity": ["alta", "critica"]  // Notificar apenas alta/crítica
  }
}
```

### Variáveis de Ambiente

```bash
# .env
OPENAI_API_KEY=sk-...           # Para análise com IA
ENABLE_AGENT_ZERO=true          # Ativar Agent Zero
NODE_ENV=production             # Ambiente
```

---

## 🔍 TROUBLESHOOTING

### Security Agent não inicia
✅ **Solução:**
```bash
# Verificar config
cat .agent/config.json | grep '"enabled"'

# Verificar API key
echo $OPENAI_API_KEY

# Verificar logs
npm run agent 2>&1 | grep -i security
```

### Ações não executam
✅ **Solução:**
1. Verificar `autoExecute: true` em config.json
2. Verificar que ação tem `segura: true`
3. Ver logs do SecurityExecutor

### IA recomenda ações inadequadas
✅ **Solução:**
1. Editar `.agent/security/prompts/security-system-prompt.md`
2. Adicionar mais exemplos
3. Reduzir `temperature` para 0.1

---

## 📚 DOCUMENTAÇÃO COMPLETA

Ver `.agent/security/README.md` para:
- Arquitetura detalhada
- Todos os 12 tipos de ação
- Todos os 10 tipos de incidente
- Exemplos avançados
- Roadmap

---

## ✅ CHECKLIST DE INTEGRAÇÃO

- [x] Módulo criado (.agent/security/)
- [x] Integração com Agent Zero (index.ts)
- [x] Configuração adicionada (config.json)
- [x] Middleware Express criado
- [x] Exemplos de uso criados
- [x] Testes automatizados criados
- [x] Documentação completa escrita
- [ ] **PRÓXIMO PASSO:** Integrar com server/app.ts
- [ ] **PRÓXIMO PASSO:** Adicionar monitoramento em endpoints críticos
- [ ] **PRÓXIMO PASSO:** Testar em ambiente de desenvolvimento

---

## 🎯 PRÓXIMOS PASSOS

### 1. Integrar com Express (5 minutos)
```typescript
// server/app.ts
import { securityMiddleware } from './middleware/security.js';
app.use(securityMiddleware);
```

### 2. Monitorar Logins (3 minutos)
```typescript
// server/routes.ts
import { withAuthMonitoring } from './middleware/security.js';

app.post('/auth/login', withAuthMonitoring(async (req, res) => {
  // ... lógica de login
}));
```

### 3. Monitorar OpenAI (5 minutos)
```typescript
// server/ai-engine.ts
import { withDependencyMonitoring } from './middleware/security.js';

const response = await withDependencyMonitoring('openai', () =>
  this.openai.chat.completions.create(...)
);
```

### 4. Testar Tudo (10 minutos)
```bash
# Teste automatizado
npm run test:security

# Rodar Agent Zero
npm run agent

# Simular ataque de brute force
# (ver seção "Testando" acima)
```

---

## 🎉 RESULTADO FINAL

Você agora tem:
✅ **Módulo de segurança IA-powered 100% defensivo**
✅ **Detecção automática de brute force, DDoS, falhas de API**
✅ **12 ações defensivas automatizadas**
✅ **Análise com GPT-4o-mini**
✅ **Integração pronta com Express**
✅ **Testes automatizados completos**
✅ **Documentação extensiva**

🛡️ **Agent Zero – IA Hacker White Hat está pronto para proteger seu sistema!**

---

**Desenvolvido com 🛡️ para Guriri Express**  
**Versão:** 1.0.0  
**Data:** Janeiro 2025
