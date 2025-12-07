# Orders

| Method | Path | Description |
|--------|------|-------------|
| 🟡 `POST` | [/api/v1/orders](./POST-create-order.md) | Create new delivery order. |
| 🟢 `GET` | [/api/v1/orders](./GET-list-orders.md) | List orders filtered by role: |
| 🟡 `POST` | [/api/v1/orders/{{ORDER_ID}}/accept](./POST-accept-order-motoboy.md) | Motoboy accepts pending order. |
| 🟡 `POST` | [/api/v1/orders/{{ORDER_ID}}/deliver](./POST-deliver-order.md) | Mark order as delivered. |
