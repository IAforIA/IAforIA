import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, CheckCircle } from "lucide-react";
import type { Order } from "@shared/schema";

interface DeliverDialogProps {
  order: Order;
  token: string | null;
  onDeliver: (data: { orderId: string; proofUrl?: string }) => void;
  isDelivering: boolean;
}

export function DeliverDialog({ order, token, onDeliver, isDelivering }: DeliverDialogProps) {
  const [proofUrl, setProofUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orderId", order.id);
    formData.append("tipo", "Comprovante");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          formData.append("gpsLat", position.coords.latitude.toString());
          formData.append("gpsLng", position.coords.longitude.toString());
          uploadFile(formData);
        },
        () => uploadFile(formData)
      );
    } else {
      uploadFile(formData);
    }
  };

  const uploadFile = async (formData: FormData) => {
    try {
      const res = await fetch("/api/upload/live-doc", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      if (data.fileUrl) {
        setProofUrl(data.fileUrl);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeliver = () => {
    onDeliver({ orderId: order.id, proofUrl });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full mt-4"
          data-testid={`button-complete-${order.id}`}
        >
          Marcar como Entregue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar Entrega</DialogTitle>
          <DialogDescription>Tire uma foto do comprovante da maquininha.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={`proof-upload-${order.id}`} className="cursor-pointer block">
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors">
                {proofUrl ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Foto anexada!</span>
                    <span className="text-xs text-muted-foreground break-all">{proofUrl.split("/").pop()}</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Tirar Foto do Comprovante</span>
                    <span className="text-xs text-muted-foreground">Clique para abrir a câmera</span>
                  </>
                )}
              </div>
              <Input
                id={`proof-upload-${order.id}`}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </Label>
            {isUploading && (
              <p className="text-xs text-center text-muted-foreground animate-pulse">Enviando foto...</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`proof-text-${order.id}`}>Observação (Opcional)</Label>
            <Input
              id={`proof-text-${order.id}`}
              placeholder="Ex: Entregue na portaria"
              value={proofUrl.startsWith("/uploads") ? "" : proofUrl}
              onChange={(e) => {
                if (!proofUrl.startsWith("/uploads")) {
                  setProofUrl(e.target.value);
                }
              }}
              disabled={proofUrl.startsWith("/uploads")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeliver} disabled={isUploading || isDelivering}>
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
