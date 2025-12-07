import { describe, it, expect } from "vitest";
import { validateAcao } from "../validators/validateAcao";

describe("validateAcao - Testes Válidos", () => {
  it("deve validar cliente_absente corretamente", () => {
    const payload = {
      acao: "cliente_absente",
      dados: {
        pedidoID: "12345",
        minutos: 10,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar cliente_adicional_pedido corretamente", () => {
    const payload = {
      acao: "cliente_adicional_pedido",
      dados: {
        pedidoID: "12345",
        item: "Coca-cola 2L",
        valor: 7.5,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar cliente_agressivo corretamente", () => {
    const payload = {
      acao: "cliente_agressivo",
      dados: {
        pedidoID: "12345",
        urgente: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar chuva_atraso corretamente", () => {
    const payload = {
      acao: "chuva_atraso",
      dados: {
        pedidoID: "12345",
        minutos: 15,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar endereco_errado corretamente", () => {
    const payload = {
      acao: "endereco_errado",
      dados: {
        pedidoID: "12345",
        observacao: "Cliente informou novo endereço",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar moto_quebrou corretamente", () => {
    const payload = {
      acao: "moto_quebrou",
      dados: {
        pedidoID: "12345",
        urgente: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar primeiro_login corretamente", () => {
    const payload = {
      acao: "primeiro_login",
      dados: {
        motoboyID: "MOT123",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar prioridade_estab corretamente", () => {
    const payload = {
      acao: "prioridade_estab",
      dados: {
        estabelecimentoID: "EST123",
        nivel: "VIP",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar produto_estragado corretamente", () => {
    const payload = {
      acao: "produto_estragado",
      dados: {
        pedidoID: "12345",
        motivo: "Embalagem danificada",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar calcular_frete corretamente", () => {
    const payload = {
      acao: "calcular_frete",
      dados: {
        origem: "Pizzaria Napolitana",
        destino: "Rua das Flores, 123",
        distancia_km: 3.2,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar cancelar_pedido corretamente", () => {
    const payload = {
      acao: "cancelar_pedido",
      dados: {
        pedidoID: "12345",
        motivo: "Cliente solicitou cancelamento",
        reembolso: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar criar_pedido corretamente", () => {
    const payload = {
      acao: "criar_pedido",
      dados: {
        clienteID: "CLI123",
        endereco: "Rua A, 100",
        valor: 45.0,
        status: "pendente",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar reatribuir_pedido corretamente", () => {
    const payload = {
      acao: "reatribuir_pedido",
      dados: {
        pedidoID: "12345",
        motoboyNovo: "MOT456",
        urgente: true,
        motoboyAnterior: "MOT123",
        criterio: "distancia",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar bloquear_motoboy corretamente", () => {
    const payload = {
      acao: "bloquear_motoboy",
      dados: {
        motoboyID: "MOT123",
        motivo: "Reclamações recorrentes",
        temporario: true,
        dias: 7,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar distribuir_carga corretamente", () => {
    const payload = {
      acao: "distribuir_carga",
      dados: {
        tipo: "balanceamento",
        motoboyID: "MOT123",
        pedidosAtuais: 3,
        limite: 5,
        prioridade: "alta",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar escolher_motoboy corretamente", () => {
    const payload = {
      acao: "escolher_motoboy",
      dados: {
        criterio: "distancia",
        considerarHorario: true,
        pedidoID: "12345",
        localidade: "Centro",
        timeout: 60,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar verificar_disponibilidade corretamente", () => {
    const payload = {
      acao: "verificar_disponibilidade",
      dados: {
        verificarHorario: true,
        motoboyID: "MOT123",
        localidade: "Praia",
        status: "disponivel",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar ajustar_mensalidade corretamente", () => {
    const payload = {
      acao: "ajustar_mensalidade",
      dados: {
        clienteID: "CLI123",
        tipoAjuste: "desconto",
        percentual: 20,
        temporario: true,
        justificativa: "Alto volume de pedidos",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar comunicar_atraso corretamente", () => {
    const payload = {
      acao: "comunicar_atraso",
      dados: {
        atrasoMinutos: 20,
        motivo: "Trânsito intenso",
        clienteID: "CLI123",
        estabelecimento: "Pizzaria",
        pedidoID: "12345",
        oferecerDesconto: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar priorizar_vip corretamente", () => {
    const payload = {
      acao: "priorizar_vip",
      dados: {
        nivel: "premium",
        clienteID: "CLI123",
        estabelecimento: "Restaurante Central",
        tempoMaximo: 30,
        garantiaEntrega: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar verificar_aberto corretamente", () => {
    const payload = {
      acao: "verificar_aberto",
      dados: {
        consultarHorario: true,
        clienteID: "CLI123",
        estabelecimento: "Lanchonete",
        horario: "14:30",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar calcular_lucro corretamente", () => {
    const payload = {
      acao: "calcular_lucro",
      dados: {
        periodo: "mensal",
        descontarCustos: true,
        tipo: "bruto",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar calcular_repasse corretamente", () => {
    const payload = {
      acao: "calcular_repasse",
      dados: {
        motoboyID: "MOT123",
        periodo: "semanal",
        incluirBonificacao: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar detectar_divergencia corretamente", () => {
    const payload = {
      acao: "detectar_divergencia",
      dados: {
        tipo: "pagamento",
        investigar: true,
        valor: 150.5,
        data: "2025-11-24",
        clienteID: "CLI123",
        verificarHistorico: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar gerar_relatorio corretamente", () => {
    const payload = {
      acao: "gerar_relatorio",
      dados: {
        tipo: "financeiro",
        data: "2025-11-24",
        incluirDetalhes: true,
        clienteID: "CLI123",
        periodo: "mensal",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar acionar_suporte corretamente", () => {
    const payload = {
      acao: "acionar_suporte",
      dados: {
        tipo: "acidente",
        urgente: true,
        descricao: "Motoboy sofreu acidente leve",
        acionarSeguro: true,
        notificarAutoridades: false,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar bloquear_automatico corretamente", () => {
    const payload = {
      acao: "bloquear_automatico",
      dados: {
        motivo: "Fraude detectada",
        temporario: false,
        clienteID: "CLI123",
        motoboyID: "MOT123",
        dias: 30,
        investigar: true,
        suspenso: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar cancelar_automatico corretamente", () => {
    const payload = {
      acao: "cancelar_automatico",
      dados: {
        pedidoID: "12345",
        motivo: "Cliente ausente por mais de 15 minutos",
        reembolsar: true,
        notificarCliente: true,
        cobrarTaxa: false,
        pagarMotoboy: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve validar oferecer_compensacao corretamente", () => {
    const payload = {
      acao: "oferecer_compensacao",
      dados: {
        tipo: "desconto",
        percentual: 20,
        validadeProximoPedido: true,
        incluirFrete: true,
        cupomExtra: 10,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("validateAcao - Testes Inválidos (Campo Obrigatório Faltando)", () => {
  it("deve rejeitar cliente_absente sem pedidoID", () => {
    const payload = {
      acao: "cliente_absente",
      dados: {
        minutos: 10,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar cliente_adicional_pedido sem item", () => {
    const payload = {
      acao: "cliente_adicional_pedido",
      dados: {
        pedidoID: "12345",
        valor: 7.5,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar cliente_agressivo sem urgente", () => {
    const payload = {
      acao: "cliente_agressivo",
      dados: {
        pedidoID: "12345",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar chuva_atraso sem minutos", () => {
    const payload = {
      acao: "chuva_atraso",
      dados: {
        pedidoID: "12345",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar endereco_errado sem observacao", () => {
    const payload = {
      acao: "endereco_errado",
      dados: {
        pedidoID: "12345",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar moto_quebrou sem urgente", () => {
    const payload = {
      acao: "moto_quebrou",
      dados: {
        pedidoID: "12345",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar primeiro_login sem motoboyID", () => {
    const payload = {
      acao: "primeiro_login",
      dados: {},
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar prioridade_estab sem nivel", () => {
    const payload = {
      acao: "prioridade_estab",
      dados: {
        estabelecimentoID: "EST123",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar produto_estragado sem motivo", () => {
    const payload = {
      acao: "produto_estragado",
      dados: {
        pedidoID: "12345",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar calcular_frete sem destino", () => {
    const payload = {
      acao: "calcular_frete",
      dados: {
        origem: "Pizzaria",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar cancelar_pedido sem motivo", () => {
    const payload = {
      acao: "cancelar_pedido",
      dados: {
        pedidoID: "12345",
        reembolso: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar criar_pedido sem endereco", () => {
    const payload = {
      acao: "criar_pedido",
      dados: {
        clienteID: "CLI123",
        valor: 45.0,
        status: "pendente",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar reatribuir_pedido sem motoboyNovo", () => {
    const payload = {
      acao: "reatribuir_pedido",
      dados: {
        pedidoID: "12345",
        urgente: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar bloquear_motoboy sem temporario", () => {
    const payload = {
      acao: "bloquear_motoboy",
      dados: {
        motoboyID: "MOT123",
        motivo: "Reclamações",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar distribuir_carga sem tipo", () => {
    const payload = {
      acao: "distribuir_carga",
      dados: {
        motoboyID: "MOT123",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar escolher_motoboy sem criterio", () => {
    const payload = {
      acao: "escolher_motoboy",
      dados: {
        considerarHorario: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar verificar_disponibilidade sem verificarHorario", () => {
    const payload = {
      acao: "verificar_disponibilidade",
      dados: {
        motoboyID: "MOT123",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar ajustar_mensalidade sem tipoAjuste", () => {
    const payload = {
      acao: "ajustar_mensalidade",
      dados: {
        clienteID: "CLI123",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar comunicar_atraso sem motivo", () => {
    const payload = {
      acao: "comunicar_atraso",
      dados: {
        atrasoMinutos: 20,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar priorizar_vip sem nivel", () => {
    const payload = {
      acao: "priorizar_vip",
      dados: {
        clienteID: "CLI123",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar verificar_aberto sem consultarHorario", () => {
    const payload = {
      acao: "verificar_aberto",
      dados: {
        clienteID: "CLI123",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar calcular_lucro sem descontarCustos", () => {
    const payload = {
      acao: "calcular_lucro",
      dados: {
        periodo: "mensal",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar calcular_repasse sem periodo", () => {
    const payload = {
      acao: "calcular_repasse",
      dados: {
        motoboyID: "MOT123",
        incluirBonificacao: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar detectar_divergencia sem investigar", () => {
    const payload = {
      acao: "detectar_divergencia",
      dados: {
        tipo: "pagamento",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar gerar_relatorio sem tipo", () => {
    const payload = {
      acao: "gerar_relatorio",
      dados: {
        data: "2025-11-24",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar acionar_suporte sem urgente", () => {
    const payload = {
      acao: "acionar_suporte",
      dados: {
        tipo: "acidente",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar bloquear_automatico sem temporario", () => {
    const payload = {
      acao: "bloquear_automatico",
      dados: {
        motivo: "Fraude",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar cancelar_automatico sem reembolsar", () => {
    const payload = {
      acao: "cancelar_automatico",
      dados: {
        pedidoID: "12345",
        motivo: "Cliente ausente",
        notificarCliente: true,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deve rejeitar oferecer_compensacao sem tipo", () => {
    const payload = {
      acao: "oferecer_compensacao",
      dados: {
        percentual: 20,
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateAcao - Testes de Tipos Errados", () => {
  it("deve rejeitar cliente_absente com minutos como string", () => {
    const payload = {
      acao: "cliente_absente",
      dados: {
        pedidoID: "12345",
        minutos: "10",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("minutos"))).toBe(true);
  });

  it("deve rejeitar cliente_agressivo com urgente como string", () => {
    const payload = {
      acao: "cliente_agressivo",
      dados: {
        pedidoID: "12345",
        urgente: "true",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("urgente"))).toBe(true);
  });

  it("deve rejeitar calcular_frete com distancia_km como string", () => {
    const payload = {
      acao: "calcular_frete",
      dados: {
        origem: "A",
        destino: "B",
        distancia_km: "3.2",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("distancia_km"))).toBe(true);
  });

  it("deve rejeitar criar_pedido com valor como string", () => {
    const payload = {
      acao: "criar_pedido",
      dados: {
        clienteID: "CLI123",
        endereco: "Rua A",
        valor: "45.00",
        status: "pendente",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("valor"))).toBe(true);
  });
});

describe("validateAcao - Testes de Campos Desconhecidos", () => {
  it("deve rejeitar cliente_absente com campo desconhecido", () => {
    const payload = {
      acao: "cliente_absente",
      dados: {
        pedidoID: "12345",
        minutos: 10,
        campoInvalido: "teste",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("desconhecidos"))).toBe(true);
  });

  it("deve rejeitar criar_pedido com campo extra", () => {
    const payload = {
      acao: "criar_pedido",
      dados: {
        clienteID: "CLI123",
        endereco: "Rua A",
        valor: 45.0,
        status: "pendente",
        extraField: "nao permitido",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("desconhecidos"))).toBe(true);
  });
});

describe("validateAcao - Testes de Ação Inválida", () => {
  it("deve rejeitar ação inexistente", () => {
    const payload = {
      acao: "acao_inexistente",
      dados: {},
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("inválida"))).toBe(true);
  });

  it("deve rejeitar payload sem campo acao", () => {
    const payload = {
      dados: {
        pedidoID: "12345",
      },
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("acao"))).toBe(true);
  });

  it("deve rejeitar payload sem campo dados", () => {
    const payload = {
      acao: "cliente_absente",
    };
    const result = validateAcao(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("dados"))).toBe(true);
  });
});
