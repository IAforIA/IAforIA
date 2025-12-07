import "dotenv/config";
import OpenAI from "openai";

console.log("🔍 Verificando acesso aos modelos...\n");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function checkModels() {
  try {
    console.log("📋 Listando modelos disponíveis...\n");
    
    const models = await client.models.list();
    
    const finetuned = models.data.filter(m => m.id.startsWith('ft:'));
    
    console.log(`✅ Encontrados ${finetuned.length} modelos fine-tuned ACESSÍVEIS:\n`);
    
    finetuned.forEach(m => {
      console.log(`  • ${m.id}`);
      console.log(`    Criado: ${new Date(m.created * 1000).toLocaleString()}`);
      console.log(`    Dono: ${m.owned_by}\n`);
    });
    
    if (finetuned.length === 0) {
      console.log("❌ Nenhum modelo fine-tuned acessível neste projeto!");
      console.log("\n💡 Soluções:");
      console.log("  1. Usar API key do projeto que criou os modelos");
      console.log("  2. Ou usar API key de organização (sem projeto específico)");
      console.log("  3. Ou usar fallback para gpt-4o-mini padrão\n");
    }
    
  } catch (error: any) {
    console.log(`❌ Erro: ${error.message}`);
  }
}

checkModels();
