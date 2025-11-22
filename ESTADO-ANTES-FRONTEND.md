# ESTADO DO SISTEMA ANTES DAS MUDANÇAS NO FRONTEND

**Data:** 21 de Novembro de 2025 23:05
**Objetivo:** Documentar estado exato do sistema ANTES de modificar o formulário de pedidos

---

## ✅ BACKEND - O QUE JÁ ESTÁ FUNCIONANDO

### 1. Tabela de Repasse (`server/analytics.ts`)
**Linhas 23-34:** Constante `TABELA_REPASSE` hardcoded
```typescript
const TABELA_REPASSE = {
  comMensalidade: {
    7: { motoboy: 6, guriri: 1 },
    10: { motoboy: 7, guriri: 3 },
    15: { motoboy: 10, guriri: 5 },
  },
  semMensalidade: {
    8: { motoboy: 6, guriri: 2 },
    10: { motoboy: 7, guriri: 3 },
    15: { motoboy: 10, guriri: 5 },
  },
}
```

### 2. Funções de Validação (`server/analytics.ts`)
**Linhas 36-81:**
- ✅ `calculateGuririComission(valor, hasMensalidade)` - Retorna { motoboy, guriri }
- ✅ `isValidDeliveryValue(valor, hasMensalidade)` - Boolean
- ✅ `getAllowedValues(hasMensalidade)` - Array [7,10,15] ou [8,10,15]

### 3. Validação no Endpoint (`server/routes.ts`)
**Linhas 528-558:** POST /api/orders
```typescript
// 1. Busca cliente no banco para verificar mensalidade
const clienteData = await db.query.clients.findFirst({
  where: (clients, { eq }) => eq(clients.id, validated.clientId),
  columns: { mensalidade: true }
});

// 2. Determina se tem mensalidade
const hasMensalidade = Number(clienteData.mensalidade) > 0;
const valorPedido = Number(validated.valor);

// 3. Valida valor usando tabela
if (!isValidDeliveryValue(valorPedido, hasMensalidade)) {
  return res.status(400).json({ error: "Valor não permitido..." });
}

// 4. IGNORA taxaMotoboy do cliente e calcula automaticamente
const comissao = calculateGuririComission(valorPedido, hasMensalidade);
validated.taxaMotoboy = comissao.motoboy.toString();
```

### 4. Servidor Rodando
- ✅ Porta 5000 HTTP
- ✅ Porta 5001 WebSocket
- ✅ Sem erros de compilação TypeScript (exceto storage.ts - não afeta)
- ✅ Log: `💰 Pedido validado: Valor R$ X | Motoboy R$ Y | Guriri R$ Z`

---

## 📋 FRONTEND - ESTADO ATUAL (ANTES DAS MUDANÇAS)

### 1. Formulário de Pedidos (`client/src/pages/client-dashboard.tsx`)

**Schema Zod (Linhas 90-127):**
```typescript
const orderSchema = z.object({
  // Campos de entrega (rua, numero, bairro, cep, complemento)
  entregaRua: z.string().min(3),
  entregaNumero: z.string().min(1),
  entregaBairro: z.string().min(2),
  entregaCep: z.string().min(8),
  entregaComplemento: z.string().optional(),
  
  // Observações
  observacoes: z.string().optional(),
  
  // FINANCEIRO - CAMPOS PROBLEMÁTICOS
  valor: z.number().min(0.01, "Valor é obrigatório"),  // ❌ CLIENTE DIGITA QUALQUER VALOR
  taxaMotoboy: z.number().default(7.00),                // ❌ CLIENTE DIGITA TAXA MOTOBOY
  
  // Pagamento
  formaPagamento: z.enum(["dinheiro", "cartao", "pix"]),
  hasTroco: z.boolean().default(false),
  trocoValor: z.number().optional(),
});
```

**Campos HTML (Linhas 678-701):**
```tsx
{/* VALOR DO PEDIDO - CAMPO LIVRE (PROBLEMA) */}
<FormField control={form.control} name="valor" render={({ field }) => (
  <FormItem>
    <FormLabel>Valor do Pedido (R$)</FormLabel>
    <FormControl>
      <Input {...field} type="number" step="0.01" placeholder="7.00"
        onChange={e => field.onChange(parseFloat(e.target.value))}
      />
    </FormControl>
    <FormMessage />
  </FormItem>
)} />

{/* TAXA MOTOBOY - CLIENTE ESCOLHE (PROBLEMA) */}
<FormField control={form.control} name="taxaMotoboy" render={({ field }) => (
  <FormItem>
    <FormLabel>Sua Taxa (R$)</FormLabel>  {/* ❌ LABEL ENGANOSA */}
    <FormControl>
      <Input {...field} type="number" step="0.01" placeholder="7.00"
        onChange={e => field.onChange(parseFloat(e.target.value))}
      />
    </FormControl>
    <FormMessage />
  </FormItem>
)} />
```

### 2. Dados do Usuário Disponíveis
**Query React Query (Linha 138):**
```tsx
const { data: profile } = useQuery({
  queryKey: ['/api/clients/profile'],
  enabled: true,
});
```

**Estrutura de `profile`:**
```typescript
{
  id: string,
  name: string,
  phone: string,
  mensalidade: string,  // "0" ou "49.90" (exemplo)
  address: {
    rua: string,
    numero: string,
    bairro: string,
    cep: string,
    complemento: string | null,
    referencia: string | null
  }
}
```

---

## 🎯 O QUE PRECISA SER MUDADO

### PROBLEMA ATUAL:
1. ❌ Cliente digita `valor: 12.50` (não existe na tabela)
2. ❌ Cliente digita `taxaMotoboy: 10.00` (tenta escolher quanto motoboy ganha)
3. ❌ Backend REJEITA com erro 400
4. ❌ Cliente fica confuso sem entender opções válidas

### SOLUÇÃO PLANEJADA:
1. ✅ REMOVER campo `<Input name="taxaMotoboy">` completamente
2. ✅ SUBSTITUIR `<Input name="valor">` por `<Select name="valor">`
3. ✅ Select mostra 3 opções baseadas em `profile.mensalidade`:
   - **COM mensalidade:** "Padrão (R$ 7)", "Média (R$ 10)", "Longa (R$ 15)"
   - **SEM mensalidade:** "Padrão (R$ 8)", "Média (R$ 10)", "Longa (R$ 15)"
4. ✅ Adicionar texto informativo: "Taxa do motoboy calculada automaticamente"

---

## 🔧 COMPONENTES SHADCN/UI DISPONÍVEIS

**Já Importados no Arquivo:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

**Uso Atual (Linha 709):**
```tsx
<Select onValueChange={field.onChange} defaultValue={field.value}>
  <FormControl>
    <SelectTrigger data-testid="select-forma-pagamento">
      <SelectValue placeholder="Selecione a forma de pagamento" />
    </SelectTrigger>
  </FormControl>
  <SelectContent>
    <SelectItem value="dinheiro">Dinheiro</SelectItem>
    <SelectItem value="cartao">Cartão</SelectItem>
    <SelectItem value="pix">Pix</SelectItem>
  </SelectContent>
</Select>
```

**Adaptação para `valor`:**
```tsx
<Select onValueChange={(val) => field.onChange(parseFloat(val))} value={field.value?.toString()}>
  <SelectContent>
    <SelectItem value="7">Padrão (R$ 7,00)</SelectItem>
    <SelectItem value="10">Média Distância (R$ 10,00)</SelectItem>
    <SelectItem value="15">Longa Distância (R$ 15,00)</SelectItem>
  </SelectContent>
</Select>
```

---

## 📊 CÁLCULO DA LÓGICA

**Código a Adicionar (Antes do Formulário):**
```tsx
// Determina se cliente tem mensalidade ativa
const hasMensalidade = profile && Number(profile.mensalidade) > 0;

// Define opções de valores baseado em mensalidade
const valorOptions = hasMensalidade 
  ? [
      { value: 7, label: "Padrão (R$ 7,00)" },
      { value: 10, label: "Média Distância (R$ 10,00)" },
      { value: 15, label: "Longa Distância (R$ 15,00)" }
    ]
  : [
      { value: 8, label: "Padrão (R$ 8,00)" },
      { value: 10, label: "Média Distância (R$ 10,00)" },
      { value: 15, label: "Longa Distância (R$ 15,00)" }
    ];
```

---

## 🚨 PONTOS DE ATENÇÃO

### 1. Schema Zod Precisa Mudar
**ANTES:**
```typescript
valor: z.number().min(0.01, "Valor é obrigatório"),
taxaMotoboy: z.number().default(7.00),
```

**DEPOIS:**
```typescript
valor: z.number().refine(
  (val) => hasMensalidade ? [7, 10, 15].includes(val) : [8, 10, 15].includes(val),
  { message: "Selecione um valor válido" }
),
// taxaMotoboy REMOVIDO - calculado pelo backend
```

### 2. Payload Enviado ao Backend
**ANTES:**
```typescript
{
  entregaRua: "...",
  valor: 12.50,           // ❌ Cliente digitava
  taxaMotoboy: 8.00,      // ❌ Cliente escolhia
  formaPagamento: "..."
}
```

**DEPOIS:**
```typescript
{
  entregaRua: "...",
  valor: 10,              // ✅ Select com 3 opções
  // taxaMotoboy NÃO enviado - backend calcula
  formaPagamento: "..."
}
```

### 3. Backend Já Espera Essa Mudança
O código em `server/routes.ts` linha 558:
```typescript
validated.taxaMotoboy = comissao.motoboy.toString();
```
**JÁ SOBRESCREVE** qualquer `taxaMotoboy` enviado pelo cliente!

---

## ✅ CHECKLIST PRÉ-IMPLEMENTAÇÃO

- [x] Backend implementado e testado
- [x] Servidor rodando sem erros
- [x] Tabela de repasse hardcoded
- [x] Validação automática funcionando
- [x] Profile query disponível no frontend
- [x] Select component já usado no código
- [x] Estado atual documentado
- [ ] **PRÓXIMO:** Implementar mudanças no frontend

---

**Status:** 🟢 PRONTO PARA MODIFICAR FRONTEND
**Tempo Estimado:** 30-45 minutos
**Risco:** BAIXO (backend protege contra erros)
