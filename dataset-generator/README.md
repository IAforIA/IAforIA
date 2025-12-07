# Dataset Generator - Agent Zero v3.0

Sistema completo de geração de datasets para fine-tuning dos módulos IA.

## 📊 Geração Total: 10.000 exemplos

### Distribuição:
- **Security Module**: 2.500 exemplos
- **SRE Module**: 2.500 exemplos
- **Anti-Fraude Module**: 2.500 exemplos
- **Compliance Module**: 2.500 exemplos

## 🚀 Como Usar

```bash
# Executar gerador
npx tsx generator.ts

# Outputs gerados em /outputs/
```

## 📁 Estrutura

```
dataset-generator/
├── generator.ts              # Script principal
├── helpers/                  # Builders modulares
│   ├── random-utils.ts
│   ├── security-builder.ts
│   ├── sre-builder.ts
│   ├── antifraud-builder.ts
│   └── compliance-builder.ts
├── schemas/                  # Schemas para validação
│   ├── security-schema.json
│   ├── sre-schema.json
│   ├── antifraud-schema.json
│   └── compliance-schema.json
└── outputs/                  # Datasets gerados
    ├── security_2500.jsonl
    ├── sre_2500.jsonl
    ├── antifraude_2500.jsonl
    ├── compliance_2500.jsonl
    └── full_10000.jsonl
```

## ⚠️ Importante

- NÃO modifica arquivos do projeto
- Gera tudo localmente (sem API)
- 100% válido segundo schemas originais
- Pronto para upload na OpenAI
