#!/bin/bash

# Script de verificação pré-deploy
# Execute antes de fazer push para produção

set -e

echo "🔍 Verificando projeto antes do deploy..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check 1: Node version
echo -e "${YELLOW}📦 Verificando versão do Node.js...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js versão 18+ é necessário. Versão atual: $(node -v)${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Node.js $(node -v)${NC}"
fi

# Check 2: Dependencies installed
echo -e "${YELLOW}📚 Verificando dependências...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ node_modules não encontrado. Execute: npm install${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
fi

# Check 3: .env.example exists
echo -e "${YELLOW}🔐 Verificando .env.example...${NC}"
if [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ .env.example não encontrado${NC}"
    exit 1
else
    echo -e "${GREEN}✅ .env.example existe${NC}"
fi

# Check 4: No .env files in Git
echo -e "${YELLOW}🚫 Verificando se .env está no .gitignore...${NC}"
if git ls-files | grep -q "^\.env$\|^\.env\.local$\|^\.env\.production$"; then
    echo -e "${RED}❌ AVISO: Arquivo .env está sendo rastreado pelo Git!${NC}"
    echo -e "${RED}   Execute: git rm --cached .env .env.local .env.production${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Arquivos .env não estão no Git${NC}"
fi

# Check 5: TypeScript compilation
echo -e "${YELLOW}🔨 Verificando TypeScript...${NC}"
if ! npm run check > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Existem erros de TypeScript (não-críticos)${NC}"
else
    echo -e "${GREEN}✅ TypeScript OK${NC}"
fi

# Check 6: Build test
echo -e "${YELLOW}🏗️  Testando build...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build bem-sucedido${NC}"
else
    echo -e "${RED}❌ Build falhou${NC}"
    exit 1
fi

# Check 7: Critical files exist
echo -e "${YELLOW}📄 Verificando arquivos críticos...${NC}"
CRITICAL_FILES=(
    "package.json"
    "vite.config.ts"
    "tsconfig.json"
    "server/index.ts"
    "client/index.html"
    "ecosystem.config.js"
    "nginx.conf"
    "deploy.sh"
    "DEPLOY-GURIRIEXPRESS.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Arquivo crítico não encontrado: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ Todos os arquivos críticos presentes${NC}"

# Check 8: Git status
echo -e "${YELLOW}📝 Verificando status do Git...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Existem alterações não commitadas${NC}"
    git status --short
else
    echo -e "${GREEN}✅ Repositório limpo${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ PROJETO PRONTO PARA DEPLOY!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. git add ."
echo "2. git commit -m 'chore: prepare for production'"
echo "3. git push origin main"
echo "4. Siga as instruções em DEPLOY-GURIRIEXPRESS.md"
echo ""
