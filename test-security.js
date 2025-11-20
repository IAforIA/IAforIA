// CRÍTICO: Carregar variáveis de ambiente PRIMEIRO
import 'dotenv/config';
// Teste das implementações de segurança da Fase 1
console.log('🔒 TESTE DE SEGURANÇA - FASE 1\n');
// Teste 1: Helmet instalado
console.log('1️⃣ Verificando Helmet...');
try {
    await import('helmet');
    console.log('   ✅ Helmet instalado e importável\n');
}
catch (error) {
    console.log('   ❌ Helmet não encontrado\n');
}
// Teste 2: CORS instalado
console.log('2️⃣ Verificando CORS...');
try {
    await import('cors');
    console.log('   ✅ CORS instalado e importável\n');
}
catch (error) {
    console.log('   ❌ CORS não encontrado\n');
}
// Teste 3: Rate Limiter instalado
console.log('3️⃣ Verificando Express Rate Limit...');
try {
    await import('express-rate-limit');
    console.log('   ✅ Express Rate Limit instalado e importável\n');
}
catch (error) {
    console.log('   ❌ Express Rate Limit não encontrado\n');
}
// Teste 4: Verificar configurações no código
console.log('4️⃣ Verificando configurações no código...');
const fs = await import('fs');
const indexContent = fs.readFileSync('./server/index.ts', 'utf-8');
const routesContent = fs.readFileSync('./server/routes.ts', 'utf-8');
const checks = {
    helmet: indexContent.includes('import helmet'),
    cors: indexContent.includes('import cors'),
    helmetUsed: indexContent.includes('app.use(helmet'),
    corsUsed: indexContent.includes('app.use(cors'),
    rateLimit: routesContent.includes('import rateLimit'),
    loginLimiter: routesContent.includes('loginLimiter'),
    apiLimiter: routesContent.includes('apiLimiter'),
    healthCheck: routesContent.includes('/health'),
    errorHandling: indexContent.includes('NODE_ENV === "production"'),
};
console.log('   Configurações encontradas:');
console.log(`   ${checks.helmet ? '✅' : '❌'} Helmet importado`);
console.log(`   ${checks.cors ? '✅' : '❌'} CORS importado`);
console.log(`   ${checks.helmetUsed ? '✅' : '❌'} Helmet configurado`);
console.log(`   ${checks.corsUsed ? '✅' : '❌'} CORS configurado`);
console.log(`   ${checks.rateLimit ? '✅' : '❌'} Rate Limit importado`);
console.log(`   ${checks.loginLimiter ? '✅' : '❌'} Login Rate Limiter aplicado`);
console.log(`   ${checks.apiLimiter ? '✅' : '❌'} API Rate Limiter aplicado`);
console.log(`   ${checks.healthCheck ? '✅' : '❌'} Health Check endpoint criado`);
console.log(`   ${checks.errorHandling ? '✅' : '❌'} Error handling melhorado`);
console.log('\n═══════════════════════════════════════════════');
const totalChecks = Object.values(checks).length;
const passedChecks = Object.values(checks).filter(Boolean).length;
if (passedChecks === totalChecks) {
    console.log('✅ TODOS OS ITENS DA FASE 1 IMPLEMENTADOS!');
    console.log(`   ${passedChecks}/${totalChecks} verificações passaram\n`);
    console.log('📋 IMPLEMENTAÇÕES CONCLUÍDAS:');
    console.log('   1. ✅ Helmet - Headers HTTP seguros');
    console.log('   2. ✅ CORS - Controle de origens');
    console.log('   3. ✅ Rate Limiting - Proteção contra brute force');
    console.log('   4. ✅ Error Handling - Sem vazamento de info em produção');
    console.log('   5. ✅ Health Check - Endpoint para load balancers\n');
    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('   - Testar servidor: npm run dev');
    console.log('   - Testar health: curl http://localhost:5000/health');
    console.log('   - Testar rate limit: fazer 6+ logins em 15 min');
    process.exit(0);
}
else {
    console.log(`⚠️ ATENÇÃO: ${passedChecks}/${totalChecks} verificações passaram`);
    console.log('   Algumas implementações podem estar faltando.\n');
    process.exit(1);
}
