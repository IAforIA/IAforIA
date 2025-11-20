# Contratos de Dados Compartilhados

> Etapa 03 do `MANUAL-IMPLEMENTACAO.md`. Este documento descreve **o que** precisa existir antes de tocar o código. Ao implementar, replique os comentários educativos nos arquivos `.ts/.tsx` para manter o contexto.

Implementação ativa dos DTOs descritos aqui: `shared/contracts.ts`.

## 1. Tabelas e Campos Obrigatórios

### 1.1 `clients`

- `documentType` (`'PF' | 'PJ'`, `text`, not null)
- `documentNumber` (`varchar`, not null)
- `ie` (`varchar`, opcional, apenas PJ)
- `cep`, `rua`, `numero`, `bairro` (todos `text`, not null)
- `complemento`, `referencia` (`text`, opcionais)
- `geoLat`, `geoLng` (`decimal(10,7)`, opcionais para futuras automações)

> Comentário educativo (para o código): "Endereço de coleta fica fixo neste cadastro para que cada novo pedido reutilize os mesmos dados, reduzindo erros operacionais."

### 1.2 `orders`

- Referenciar endereço da coleta copiando os campos acima no momento da criação (não permitir valores divergentes via API).
- Acrescentar `clienteRefId` (nullable) para manter ligação com múltiplas unidades futuras.
- Campos de entrega permanecem editáveis pelo cliente.

### 1.3 `live_docs`

- Garantir colunas `gpsLat`/`gpsLng` ativas (já existem) e documentar que o upload do motoboy deve preencher estas coordenadas sempre que disponíveis.

### 1.4 `motoboy_schedules` / `client_schedules`

- Nenhuma coluna nova, mas os dados devem ser servidos via DTOs padronizados (ver seção 2).

## 2. DTOs e Tipos (TypeScript)

Todos os consumidores (central, cliente, motoboy) usarão estes formatos. Quando implementar, declare-os em `shared/contracts.ts` (novo arquivo) e reutilize nos dois lados da aplicação.

```ts
export type DocumentType = 'PF' | 'PJ';

export interface ClientProfileDto {
  id: string;
  name: string;
  phone: string;
  email: string;
  documentType: DocumentType;
  documentNumber: string;
  ie?: string;
  address: {
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
    complemento?: string;
    referencia?: string;
    geoLat?: number;
    geoLng?: number;
  };
  horario?: ClientScheduleDto;
}

export interface ClientScheduleDto {
  horaAbertura?: string; // "08:00"
  horaFechamento?: string; // "18:00"
  fechado?: boolean;
}

export interface OrderSummaryDto {
  id: string;
  status: OrderStatus;
  createdAt: string;
  valor: number;
  taxaMotoboy: number;
  pagamento: string;
  coleta: ColetaDto;
  coletaOverride: boolean;
  entrega: EntregaDto;
  cliente: Pick<ClientProfileDto, 'id' | 'name' | 'phone'>;
  motoboy?: Pick<MotoboyDto, 'id' | 'name' | 'phone'>;
}
```

> Comentário educativo: "DTO compartilhado evita divergência entre dashboards; qualquer campo novo deve nascer aqui e ser importado pelos apps."

## 3. Eventos WebSocket Normalizados

| Tipo (`msg.type`) | Payload | Consumidores | Observações |
|-------------------|---------|--------------|-------------|
| `chat` | `ChatMessagePayload` | Todos | Mensagens 1:1 ou broadcast. |
| `new_pedido` | `OrderSummaryDto` | Central, Motoboy | Dispara timeline do cliente também. |
| `pedido_assigned` | `{ orderId, motoboy: MotoboyDto }` | Central, Motoboy, Cliente | Atualiza mission card e KPIs. |
| `pedido_delivered` | `{ orderId, proofId? }` | Todos | Libera botão "novo pedido" no cliente. |
| `stats_update` | `StatsPayload` | Central | Permite recalcular KPIs sem pooling. |
| `motoboy_status` | `{ motoboyId, online, battery?, lastPing }` | Central | Atualiza lista lateral. |
| `live_doc_uploaded` | `{ orderId, motoboyId, docId, gpsLat?, gpsLng? }` | Central, Cliente | Abre modal de comprovante automaticamente. |
| `order_update` | `{ orderId, timelineEvent }` | Cliente, Motoboy | Usado para timeline holográfica. |

Estrutura sugerida para o payload:

```ts
export interface WsEnvelope<TType extends string, TPayload> {
  type: TType;
  payload: TPayload;
  emittedAt: string; // ISO string
}
```

> Comentário educativo: "Envelope único facilita logs e auditoria (THOR) porque adicionamos timestamp e conseguimos persistir eventos brutos no banco quando necessário."

## 4. Checklists por Responsável

### Backend

- [ ] Criar migração Drizzle adicionando campos em `clients` e `orders`.
- [ ] Gerar `shared/contracts.ts` e exportar DTOs + envelopes.
- [ ] Atualizar rotas `/api/orders`, `/api/clients/me`, `/api/docs/*` para responder com os novos DTOs.
- [ ] Atualizar broadcaster WS para usar `WsEnvelope`.

### Frontend

- [ ] Substituir tipos locais pelos DTOs compartilhados.
- [ ] Ajustar React Query para invalidar caches baseando-se nos novos envelopes.
- [ ] Implementar comentários explicativos próximos a cada componente complexo (timeline, chat, hot-swap, etc.).

### QA / Observabilidade

- [ ] Atualizar testes que criam fixtures de pedidos/clientes.
- [ ] Registrar alertas para casos de envelope desconhecido ou payload incompleto.

## 5. Próximos Passos

1. Validar este documento com o time (central + cliente + motoboy).
2. Após aprovação, executar Etapa 04 (migração de endereço fixo) seguindo os campos aqui listados.
3. Somente depois de concluída a migração aplicar os DTOs nos dashboards.
