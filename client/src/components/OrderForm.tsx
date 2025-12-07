import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// TASK 12: Schema atualizado com validação de valores baseado em mensalidade
const orderFormSchema = z.object({
  origin: z.string().min(5, "Origem deve ter no mínimo 5 caracteres"),
  destination: z.string().min(5, "Destino deve ter no mínimo 5 caracteres"),
  description: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
  valorProduto: z.number().min(0.01, "Valor do produto é obrigatório"),
  valorEntrega: z.number().refine((val) => [7, 8, 10, 15].includes(val), {
    message: "Valor de entrega inválido. Escolha 7/8/10/15",
  }),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  onSubmit: (data: OrderFormData) => void;
  isLoading?: boolean;
  hasMensalidade?: boolean; // TASK 12: Flag para determinar valores permitidos
}

export default function OrderForm({ onSubmit, isLoading, hasMensalidade = false }: OrderFormProps) {
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      origin: "",
      destination: "",
      description: "",
      valorProduto: 0,
      valorEntrega: 0,
    },
  });

  // TASK 12: Valores baseados em mensalidade
  const valorOptions = hasMensalidade 
    ? [
        { value: 7, label: "Padrão - R$ 7,00" },
        { value: 10, label: "Média Distância - R$ 10,00" },
        { value: 15, label: "Longa Distância - R$ 15,00" }
      ]
    : [
        { value: 8, label: "Padrão - R$ 8,00" },
        { value: 10, label: "Média Distância - R$ 10,00" },
        { value: 15, label: "Longa Distância - R$ 15,00" }
      ];

  // TASK 12: Calcula total = valorProduto + valorEntrega
  const valorProduto = form.watch('valorProduto') || 0;
  const valorEntrega = form.watch('valorEntrega') || 0;
  const totalPedido = valorProduto + valorEntrega;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="origin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Origem</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Rua das Flores, 123 - Centro" 
                  {...field} 
                  data-testid="input-origin"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destino</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Av. Principal, 456 - Bairro Norte" 
                  {...field}
                  data-testid="input-destination"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do Pedido</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva o que será entregue..."
                  className="resize-none"
                  rows={3}
                  {...field}
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valorProduto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor do Produto (R$)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  placeholder="0.00" 
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  data-testid="input-valor-produto"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valorEntrega"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor da Entrega (Frete)</FormLabel>
              <Select 
                onValueChange={(val) => field.onChange(parseFloat(val))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-valor-entrega">
                    <SelectValue placeholder="Selecione o valor do frete" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {valorOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {hasMensalidade 
                  ? "✅ Cliente mensalista - Valores: 7/10/15" 
                  : "❌ Cliente sem mensalidade - Valores: 8/10/15"
                }
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* TASK 12: Exibir total calculado */}
        {totalPedido > 0 && (
          <div className="p-4 bg-muted rounded-lg border-2 border-primary/20">
            <p className="text-sm text-muted-foreground">Total do Pedido</p>
            <p className="text-2xl font-bold text-primary">R$ {totalPedido.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Produto: R$ {valorProduto.toFixed(2)} + Frete: R$ {valorEntrega.toFixed(2)}
            </p>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading}
          data-testid="button-submit-order"
        >
          {isLoading ? "Criando..." : "Criar Pedido"}
        </Button>
      </form>
    </Form>
  );
}
