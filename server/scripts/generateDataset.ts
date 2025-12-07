import { writeFileSync } from 'fs';
import { join } from 'path';
import { faker } from '@faker-js/faker/locale/pt_BR';

interface TrainingExample {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
}

const MOTOBOY_INTENTS = [
  'status_pedido',
  'problema_localizacao',
  'atraso_entrega',
  'duvida_taxa',
  'problema_cliente',
  'suporte_tecnico',
  'alteracao_rota',
  'cancelamento',
  'duvida_pagamento',
  'reclamacao'
];

const ESTABELECIMENTO_INTENTS = [
  'novo_pedido',
  'status_motoboy',
  'problema_entrega',
  'taxa_cobranca',
  'cancelar_pedido',
  'historico_entregas',
  'duvida_sistema',
  'reclamacao_motoboy',
  'suporte_urgente',
  'alteracao_pedido'
];

const humanize = (text: string): string => {
  const variations = [
    text.toLowerCase(),
    text.toLowerCase().replace(/[.,!?]/g, ''),
    text.replace('não', 'nao').replace('está', 'ta').replace('você', 'vc'),
    text.toLowerCase().replace(/\s+/g, ' ')
  ];
  return faker.helpers.arrayElement(variations);
};

function generateMotoboyDialog(intent: string): TrainingExample {
  const clientName = faker.person.firstName();
  const address = faker.location.streetAddress();
  const orderNumber = faker.number.int({ min: 1000, max: 9999 });

  const templates: Record<string, { user: string; assistant: string }> = {
    status_pedido: {
      user: humanize(`Qual o status do pedido #${orderNumber}?`),
      assistant: `O pedido #${orderNumber} está em rota de entrega. Previsão: 15 minutos. Cliente: ${clientName}, ${address}.`
    },
    problema_localizacao: {
      user: humanize(`Não estou conseguindo achar o endereço ${address}`),
      assistant: `Entendi. Vou ligar para o cliente ${clientName} agora. Aguarde na região próxima. Tel: ${faker.phone.number()}.`
    },
    atraso_entrega: {
      user: humanize('Vou atrasar uns 10 minutos, trânsito pesado'),
      assistant: `Ok, já avisei o cliente ${clientName}. Continue com segurança. Novo prazo registrado: +10min.`
    },
    duvida_taxa: {
      user: humanize(`Quanto vou receber por essa entrega em ${faker.location.city()}?`),
      assistant: `Taxa: R$ ${faker.number.float({ min: 8, max: 25, fractionDigits: 2 })}. Distância: ${faker.number.int({ min: 2, max: 15 })}km. Confirmado no sistema.`
    },
    problema_cliente: {
      user: humanize('Cliente não atende telefone e não está no local'),
      assistant: `Aguarde 5 minutos e tente novamente. Se não atender, marque "Cliente Ausente" no app e retorne ao estabelecimento.`
    },
    suporte_tecnico: {
      user: humanize('App travou, não consigo confirmar entrega'),
      assistant: `Reinicie o app agora. Se persistir, anote o código #${orderNumber} e ligue para suporte: (27) 3333-4444.`
    },
    alteracao_rota: {
      user: humanize('Cliente pediu para entregar em outro endereço'),
      assistant: `Negativo. Alterações de endereço devem ser feitas pelo estabelecimento. Prossiga para ${address} original.`
    },
    cancelamento: {
      user: humanize('Cliente quer cancelar o pedido'),
      assistant: `Cancele no app em "Ações > Cancelar Pedido". O estabelecimento será notificado. Retorne com o produto.`
    },
    duvida_pagamento: {
      user: humanize('Quando recebo o pagamento das entregas?'),
      assistant: `Pagamentos são processados toda segunda-feira via PIX. Você receberá R$ ${faker.number.float({ min: 150, max: 800, fractionDigits: 2 })} referente à semana anterior.`
    },
    reclamacao: {
      user: humanize('Esse estabelecimento sempre atrasa o pedido'),
      assistant: `Reclamação registrada sobre atraso. Nossa equipe vai analisar e tomar providências. Obrigado pelo feedback.`
    }
  };

  return {
    messages: [
      {
        role: 'system',
        content: 'Você é a IA da Guriri Express, assistente de motoboys. Seja direto, útil e use linguagem profissional mas acessível.'
      },
      {
        role: 'user',
        content: templates[intent].user
      },
      {
        role: 'assistant',
        content: templates[intent].assistant
      }
    ]
  };
}

function generateEstabDialog(intent: string): TrainingExample {
  const motoboyName = faker.person.firstName();
  const orderNumber = faker.number.int({ min: 1000, max: 9999 });
  const clientName = faker.person.firstName();

  const templates: Record<string, { user: string; assistant: string }> = {
    novo_pedido: {
      user: humanize('Preciso criar uma entrega urgente'),
      assistant: `Entrega criada! Pedido #${orderNumber}. Motoboy ${motoboyName} foi designado. Previsão de coleta: 8 minutos.`
    },
    status_motoboy: {
      user: humanize(`Cadê o motoboy do pedido #${orderNumber}?`),
      assistant: `Motoboy ${motoboyName} está a 2km de distância. Tempo estimado de chegada: 5 minutos. Status: A caminho.`
    },
    problema_entrega: {
      user: humanize('Cliente reclamou que pedido chegou frio'),
      assistant: `Lamento o ocorrido. Pedido #${orderNumber} levou ${faker.number.int({ min: 25, max: 45 })} min. Vou acionar o motoboy ${motoboyName} para feedback.`
    },
    taxa_cobranca: {
      user: humanize('Qual a taxa para bairro Jacaraípe?'),
      assistant: `Taxa para Jacaraípe: R$ ${faker.number.float({ min: 8, max: 15, fractionDigits: 2 })}. Distância média: ${faker.number.int({ min: 3, max: 8 })}km.`
    },
    cancelar_pedido: {
      user: humanize(`Quero cancelar o pedido #${orderNumber}`),
      assistant: `Pedido #${orderNumber} cancelado. Motoboy ${motoboyName} notificado. Cliente ${clientName} receberá notificação em 2 minutos.`
    },
    historico_entregas: {
      user: humanize('Quantas entregas fiz esse mês?'),
      assistant: `Você realizou ${faker.number.int({ min: 45, max: 350 })} entregas este mês. Receita total: R$ ${faker.number.float({ min: 500, max: 4000, fractionDigits: 2 })}.`
    },
    duvida_sistema: {
      user: humanize('Como faço para alterar horário de funcionamento?'),
      assistant: `Vá em Configurações > Horário de Funcionamento. Ajuste abertura/fechamento e dias da semana.`
    },
    reclamacao_motoboy: {
      user: humanize(`Motoboy ${motoboyName} foi grosseiro com cliente`),
      assistant: `Reclamação registrada contra ${motoboyName}. Nossa equipe vai investigar.`
    },
    suporte_urgente: {
      user: humanize('Sistema não está mostrando novos pedidos'),
      assistant: `Verificando... Última atualização: ${new Date().toLocaleTimeString('pt-BR')}. Tente atualizar a página.`
    },
    alteracao_pedido: {
      user: humanize(`Cliente ${clientName} quer mudar endereço do pedido #${orderNumber}`),
      assistant: `Alteração registrada. Novo endereço enviado ao motoboy ${motoboyName}.`
    }
  };

  return {
    messages: [
      {
        role: 'system',
        content: 'Você é a IA da Guriri Express, assistente de estabelecimentos. Seja rápido, preciso e profissional.'
      },
      {
        role: 'user',
        content: templates[intent].user
      },
      {
        role: 'assistant',
        content: templates[intent].assistant
      }
    ]
  };
}

async function generateDataset() {
  console.log('🚀 Gerando dataset...\n');

  const allExamples: TrainingExample[] = [];

  console.log('📦 Motoboy...');
  for (const intent of MOTOBOY_INTENTS) {
    for (let i = 0; i < 120; i++) {
      allExamples.push(generateMotoboyDialog(intent));
    }
  }

  console.log('🏪 Estabelecimento...');
  for (const intent of ESTABELECIMENTO_INTENTS) {
    for (let i = 0; i < 120; i++) {
      allExamples.push(generateEstabDialog(intent));
    }
  }

  const shuffled = allExamples.sort(() => Math.random() - 0.5);

  const jsonl = shuffled.map(ex => JSON.stringify(ex)).join('\n');

  const output = join(process.cwd(), 'guriri_training_dataset.jsonl');
  writeFileSync(output, jsonl);

  console.log(`💾 Dataset salvo em: ${output}`);
  console.log(`📊 Total: ${shuffled.length}`);
}

generateDataset().catch(console.error);
