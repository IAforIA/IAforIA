import OpenAI from 'openai';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface FineTuneStatus {
  id: string;
  status: string;
  trained_tokens?: number;
  created_at: number;
  finished_at?: number;
  fine_tuned_model?: string;
  error?: any;
}

async function uploadTrainingFile(filePath: string): Promise<string> {
  console.log('📤 Fazendo upload do dataset para OpenAI...\n');

  if (!existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const fileStats = readFileSync(filePath, 'utf-8');
  const lineCount = fileStats.split('\n').filter(line => line.trim()).length;
  console.log(`📊 Dataset contém ${lineCount} exemplos`);

  const fileContent = readFileSync(filePath);
  const file = await openai.files.create({
    file: new File([fileContent], 'guriri_training_dataset.jsonl', { type: 'application/jsonl' }),
    purpose: 'fine-tune'
  });

  console.log(`✅ Upload concluído! File ID: ${file.id}\n`);
  return file.id;
}

async function createFineTuningJob(fileId: string): Promise<string> {
  console.log('🎯 Criando job de fine-tuning...\n');

  const job = await openai.fineTuning.jobs.create({
    training_file: fileId,
    model: 'gpt-4o-mini-2024-07-18',
    hyperparameters: {
      n_epochs: 4  // Aumentado de 3 para 4 epochs = melhor aprendizado
    },
    suffix: 'guriri-express'
  });

  console.log(`✅ Job criado! Job ID: ${job.id}`);
  console.log(`📅 Criado em: ${new Date(job.created_at * 1000).toLocaleString('pt-BR')}\n`);

  return job.id;
}

async function monitorFineTuning(jobId: string): Promise<FineTuneStatus> {
  console.log('⏳ Monitorando progresso do fine-tuning...\n');

  let status: FineTuneStatus;
  let lastStatus = '';

  while (true) {
    const job = await openai.fineTuning.jobs.retrieve(jobId);
    
    status = {
      id: job.id,
      status: job.status,
      trained_tokens: job.trained_tokens || undefined,
      created_at: job.created_at,
      finished_at: job.finished_at || undefined,
      fine_tuned_model: job.fine_tuned_model || undefined,
      error: job.error || undefined
    };

    // Mostrar atualização apenas quando status mudar
    if (status.status !== lastStatus) {
      console.log(`📍 Status: ${status.status}`);
      if (status.trained_tokens) {
        console.log(`   Tokens treinados: ${status.trained_tokens.toLocaleString('pt-BR')}`);
      }
      lastStatus = status.status;
    }

    // Estados finais
    if (status.status === 'succeeded') {
      console.log('\n✅ Fine-tuning CONCLUÍDO com sucesso!');
      console.log(`🎉 Modelo criado: ${status.fine_tuned_model}`);
      
      if (status.finished_at) {
        const duration = status.finished_at - status.created_at;
        console.log(`⏱️  Tempo total: ${Math.floor(duration / 60)} minutos\n`);
      }
      
      break;
    }

    if (status.status === 'failed') {
      console.error('\n❌ Fine-tuning FALHOU!');
      console.error('Erro:', status.error);
      throw new Error('Fine-tuning failed');
    }

    if (status.status === 'cancelled') {
      console.warn('\n⚠️  Fine-tuning CANCELADO');
      throw new Error('Fine-tuning cancelled');
    }

    // Aguardar 30 segundos antes de checar novamente
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  return status;
}

async function testFineTunedModel(modelId: string) {
  console.log('🧪 Testando modelo fine-tuned...\n');

  const testCases = [
    {
      role: 'user' as const,
      content: 'Qual o status do pedido #1234?'
    },
    {
      role: 'user' as const,
      content: 'Preciso criar uma entrega urgente'
    },
    {
      role: 'user' as const,
      content: 'Cliente não atende telefone'
    }
  ];

  for (const testCase of testCases) {
    console.log(`👤 Usuário: ${testCase.content}`);

    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: 'Você é a IA da Guriri Express, assistente de entregas.'
        },
        testCase
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    const answer = response.choices[0].message.content;
    console.log(`🤖 IA: ${answer}\n`);
  }
}

async function saveModelConfig(modelId: string) {
  const envPath = join(process.cwd(), '.env.finetuned');
  const config = `# Fine-tuned Model Configuration
OPENAI_FINETUNED_MODEL=${modelId}
FINETUNED_DATE=${new Date().toISOString()}
FINETUNED_DESCRIPTION=Guriri Express - Modelo treinado com 1200 diálogos reais
`;

  writeFileSync(envPath, config, 'utf-8');
  console.log(`💾 Configuração salva em: ${envPath}\n`);
}

async function main() {
  console.log('🚀 Iniciando processo de Fine-Tuning da Guriri Express\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Validar API Key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não encontrada no .env');
    }

    // 1. Upload do dataset
    const datasetPath = join(process.cwd(), 'guriri_training_dataset.jsonl');
    const fileId = await uploadTrainingFile(datasetPath);

    // 2. Criar job de fine-tuning
    const jobId = await createFineTuningJob(fileId);

    // 3. Monitorar progresso
    const result = await monitorFineTuning(jobId);

    if (!result.fine_tuned_model) {
      throw new Error('Modelo fine-tuned não foi criado');
    }

    // 4. Testar modelo
    await testFineTunedModel(result.fine_tuned_model);

    // 5. Salvar configuração
    await saveModelConfig(result.fine_tuned_model);

    console.log('=' .repeat(60));
    console.log('✨ PROCESSO COMPLETO!\n');
    console.log('📋 Próximos passos:');
    console.log('   1. Copie o modelo ID para seu .env principal');
    console.log('   2. Execute: npm run ai:chat-server');
    console.log('   3. Teste os endpoints /resolve-motoboy e /resolve-estab\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error);
    process.exit(1);
  }
}

// Executar
main();
