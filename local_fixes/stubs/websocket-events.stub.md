# Stub: Eventos WebSocket (exemplos)

Objetivo: mapear eventos WS esperados e exemplos de payload.

## Endpoint WS

- URL base: `ws://<host>/ws?token=<JWT>`
- Auth: token JWT na querystring.

## Eventos de entrada (cliente/motoboy/central recebem)

```json
{ "type": "new_order", "orderId": "ord_1", "pickup": "Rua A", "dropoff": "Rua B" }
{ "type": "order_accepted", "orderId": "ord_1", "motoboyId": "m_1" }
{ "type": "order_delivered", "orderId": "ord_1", "proofUrl": "https://stub.local/doc.jpg" }
{ "type": "location_update", "motoboyId": "m_1", "lat": -23.5, "lng": -46.6 }
{ "type": "chat_message", "chatId": "ch_9", "from": "central", "text": "Mensagem exemplo" }

```

## Eventos de saida (o cliente envia para servidor)

```json
{ "action": "send_chat", "chatId": "ch_9", "text": "Oi" }
{ "action": "ack_order", "orderId": "ord_1" }

```

## Validacao simples

- `type` ou `action` obrigatorio.
- Campos principais por evento: `orderId` para eventos de pedido; `motoboyId` para localizacao; `chatId` e `text` para chat.

## Resposta de confirmacao (exemplo texto)

```json
{ "ok": true, "received": "chat_message" }

```
