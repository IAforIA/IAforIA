# 📋 INSTRUÇÕES - Dataset Generator Agent Zero v3.0

## 🎯 Objetivo

Gerar **10.000 exemplos** de fine-tuning distribuídos em:
- **2.500** Security Module
- **2.500** SRE Module  
- **2.500** Anti-Fraude Module
- **2.500** Compliance Module

---

## 🚀 Como Executar

### 1️⃣ Via Terminal (PowerShell)

```powershell
cd dataset-generator
npx tsx generator.ts
```

### 2️⃣ Via npm script (opcional)

Adicione ao `package.json` principal:
```json
{
  "scripts": {
    "generate-datasets": "npx tsx dataset-generator/generator.ts"
  }
}
```

Depois execute:
```powershell
npm run generate-datasets
```

---

## 📂 Arquivos Gerados

Todos os arquivos JSONL serão salvos em `dataset-generator/outputs/`:

```
outputs/
├── security_2500.jsonl       ✅ 2.500 exemplos Security
├── sre_2500.jsonl            ✅ 2.500 exemplos SRE
├── antifraude_2500.jsonl     ✅ 2.500 exemplos Anti-Fraude
├── compliance_2500.jsonl     ✅ 2.500 exemplos Compliance
└── full_10000.jsonl          ✅ 10.000 exemplos mesclados
```

---

## 📊 Formato dos Dados

Cada linha do JSONL contém:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "<prompt do sistema específico do módulo>"
    },
    {
      "role": "user",
      "content": "{\"tipo\":\"brute_force\",\"dados\":{...}}"
    },
    {
      "role": "assistant",
      "content": "{\"severidade\":\"critica\",\"acoes\":[...]}"
    }
  ]
}
```

---

## ✅ Validação

Após gerar, valide os arquivos:

```powershell
# Contar linhas (deve ser exatamente 2.500 ou 10.000)
Get-Content outputs/security_2500.jsonl | Measure-Object -Line
Get-Content outputs/full_10000.jsonl | Measure-Object -Line

# Validar JSON (primeira linha como exemplo)
Get-Content outputs/security_2500.jsonl -First 1 | ConvertFrom-Json
```

---

## 📤 Upload para OpenAI

### Via CLI (recomendado)

```bash
# 1. Instalar CLI da OpenAI
pip install openai

# 2. Upload do arquivo
openai api fine_tunes.prepare_data -f outputs/full_10000.jsonl

# 3. Criar job de fine-tuning
openai api fine_tunes.create \
  -t outputs/full_10000.jsonl \
  -m gpt-4o-mini-2024-07-18 \
  --suffix "agent-zero-v3-full"
```

### Via Dashboard OpenAI

1. Acesse: https://platform.openai.com/finetune
2. Clique em "Create"
3. Upload do arquivo `full_10000.jsonl` (ou individuais)
4. Selecione modelo base: `gpt-4o-mini-2024-07-18`
5. Configure hiperparâmetros (opcional)
6. Inicie o treinamento

---

## 🎨 Distribuição Detalhada

### Security (2.500)
- 600 brute-force
- 400 credential-stuffing
- 300 DDoS
- 300 behavioral anomalies
- 300 pattern deviation
- 200 dependency failures
- 200 negativos (sem ação)
- 200 híbridos complexos

### SRE (2.500)
- 400 memory leaks
- 350 high CPU
- 300 worker crashes
- 250 deadlocks
- 300 latency issues
- 250 connection pool exhausted
- 200 external failures
- 150 cache corruption
- 100 disk full
- 100 timeouts
- 100 negativos

### Anti-Fraude (2.500)
- 400 chargeback abuse
- 400 card fraud
- 350 fake accounts
- 300 multi-attempts
- 250 coupon abuse
- 200 duplicate orders
- 200 location manipulation
- 150 merchant fraud
- 150 money laundering
- 100 negativos

### Compliance (2.500)
- 500 unauthorized access
- 450 privacy violations
- 400 unethical decisions
- 350 excess authority
- 300 unsafe patches
- 250 sensitive log exposure
- 150 unanonymized data
- 100 negativos

---

## ⚠️ Importante

- ✅ **NÃO modifica** nenhum arquivo do projeto principal
- ✅ **NÃO toca** em `.agent/` ou módulos operacionais
- ✅ Todos os dados são **sintéticos** e gerados localmente
- ✅ **NÃO usa** API da OpenAI para gerar (apenas para treinar depois)
- ✅ 100% válido segundo schemas do projeto

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```powershell
# Reinstalar dependências
npm install
```

### Erro: "Permission denied"
```powershell
# Executar como administrador ou mudar permissões
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Erro: "Out of memory"
```powershell
# Aumentar limite de memória do Node
$env:NODE_OPTIONS="--max-old-space-size=4096"
npx tsx generator.ts
```

---

## 📞 Suporte

Problemas? Verifique:
1. Schemas em `/schemas/` estão corretos
2. Helpers em `/helpers/` funcionando
3. Diretório `/outputs/` tem permissão de escrita
4. Node.js >= 18.x instalado

---

**✨ Boa sorte com o fine-tuning!**
