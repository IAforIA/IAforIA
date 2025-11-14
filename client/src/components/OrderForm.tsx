import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const orderFormSchema = z.object({
  origin: z.string().min(5, "Origem deve ter no mínimo 5 caracteres"),
  destination: z.string().min(5, "Destino deve ter no mínimo 5 caracteres"),
  description: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
  value: z.string().min(1, "Valor é obrigatório"),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  onSubmit: (data: OrderFormData) => void;
  isLoading?: boolean;
}

export default function OrderForm({ onSubmit, isLoading }: OrderFormProps) {
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      origin: "",
      destination: "",
      description: "",
      value: "",
    },
  });

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
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor (R$)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  {...field}
                  data-testid="input-value"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
