import "dotenv/config";
import OpenAI from "openai";

console.log("🔍 USANDO API KEY:", process.env.OPENAI_API_KEY);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  console.log("🔍 Testando modelo CEO...");
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_FINETUNED_MODEL_CEO!,
      messages: [
        { role: "user", content: "gere uma ação simples teste" }
      ]
    });

    console.log("Resposta:", response.choices[0].message);
  } catch (err) {
    console.error("❌ Erro CEO:", err);
  }

  console.log("\n🔍 Testando modelo Comunicação...");
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_FINETUNED_MODEL_COMUNICACAO!,
      messages: [
        { role: "user", content: "me envie uma mensagem educada" }
      ]
    });

    console.log("Resposta:", response.choices[0].message);
  } catch (err) {
    console.error("❌ Erro Comunicação:", err);
  }
}

main();
