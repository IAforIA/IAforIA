import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Client, Motoboy } from '@shared/schema';

type MotoboyLocation = {
  motoboyId: string;
  latitude: number;
  longitude: number;
  timestamp: string | Date;
};

interface DeliveryMapProps {
  clients: Client[];
  motoboys: Motoboy[];
  motoboyLocations: MotoboyLocation[];
  editable?: boolean; // Permite modo de edição (arrastar marcadores)
  onLocationUpdate?: () => void; // Callback após salvar
}

// Coordenadas de Guriri, São Mateus - ES
const GURIRI_CENTER = { lat: -18.7167, lng: -39.8500 };

// Mapeamento de endereços conhecidos para coordenadas (aproximadas)
const CLIENT_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  "PARACAI": { lat: -18.7145, lng: -39.8520 },
  "GURIFARMA": { lat: -18.7180, lng: -39.8490 },
  "DROGARIA GURIRI": { lat: -18.7200, lng: -39.8485 },
  "DROGARIA LUA E SOL": { lat: -18.7155, lng: -39.8505 },
  "POP FARMA": { lat: -18.7140, lng: -39.8515 },
  "BAU DO TESOURO": { lat: -18.7195, lng: -39.8488 },
  "AVELAR SALGADOS": { lat: -18.7205, lng: -39.8480 },
  "PLANET ROCK": { lat: -18.7150, lng: -39.8510 },
  "CASA JAMILA": { lat: -18.7148, lng: -39.8512 },
  "PETISCOS": { lat: -18.7160, lng: -39.8500 },
  "TAKEDA SUSHI": { lat: -18.7152, lng: -39.8508 },
  "OISHI SUSHI": { lat: -18.7151, lng: -39.8509 },
  "POINT MILK SHAKE": { lat: -18.7149, lng: -39.8511 },
  "MIZA CHURRASCARIA": { lat: -18.7210, lng: -39.8475 },
  "SAMPAIO": { lat: -18.7153, lng: -39.8507 },
  "OLIVA MASSAS": { lat: -18.7192, lng: -39.8482 },
  "SAARA": { lat: -18.7188, lng: -39.8483 },
  "FARMÁCIA INDIANA": { lat: -18.7185, lng: -39.8487 },
  "SÓ SALADA": { lat: -18.7175, lng: -39.8492 },
  "BASE 10 PLUS": { lat: -18.7165, lng: -39.8495 },
};

export function DeliveryMap({ clients, motoboys, motoboyLocations, editable = false, onLocationUpdate }: DeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, { lat: number; lng: number; name: string }>>(new Map());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Salva todas as mudanças pendentes
  const saveAllChanges = async () => {
    if (pendingChanges.size === 0) return;
    
    setSaving(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const [clientId, coords] of pendingChanges) {
      try {
        await apiRequest('PATCH', `/api/clients/${clientId}/location`, {
          lat: coords.lat,
          lng: coords.lng,
        });
        successCount++;
      } catch (error) {
        console.error(`Erro ao salvar ${clientId}:`, error);
        failCount++;
      }
    }
    
    setSaving(false);
    setPendingChanges(new Map());
    setEditMode(false);
    
    if (successCount > 0) {
      toast({
        title: "Localizações salvas",
        description: `${successCount} cliente(s) atualizado(s)${failCount > 0 ? `, ${failCount} falharam` : ''}`,
      });
      onLocationUpdate?.();
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    }
  };

  // Cancela todas as mudanças
  const cancelChanges = () => {
    setPendingChanges(new Map());
    setEditMode(false);
  };

  useEffect(() => {
    // Carrega Leaflet dinamicamente
    if (typeof window === 'undefined' || !mapContainer.current) return;

    const loadMap = async () => {
      // Importa Leaflet
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Fix para ícones do Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Cria o mapa se não existir
      if (!mapRef.current && mapContainer.current) {
        mapRef.current = L.map(mapContainer.current).setView(
          [GURIRI_CENTER.lat, GURIRI_CENTER.lng],
          14
        );

        // Adiciona camada de tiles (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      // Limpa marcadores antigos
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Ícone customizado para clientes (verde) - usando encodeURIComponent para UTF-8
      const clientSvg = encodeURIComponent(`
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#10b981"/>
          <circle cx="12.5" cy="12.5" r="6" fill="white"/>
        </svg>
      `);
      const clientIcon = L.icon({
        iconUrl: 'data:image/svg+xml,' + clientSvg,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      // Ícone para clientes em modo de edição (laranja)
      const clientEditSvg = encodeURIComponent(`
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#f59e0b"/>
          <circle cx="12.5" cy="12.5" r="6" fill="white"/>
        </svg>
      `);
      const clientEditIcon = L.icon({
        iconUrl: 'data:image/svg+xml,' + clientEditSvg,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      // Ícone para motoboys em entrega (azul) - usando encodeURIComponent para UTF-8
      const motoboySvg = encodeURIComponent(`
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#3b82f6"/>
          <circle cx="12.5" cy="12.5" r="6" fill="white"/>
        </svg>
      `);
      const motoboyIcon = L.icon({
        iconUrl: 'data:image/svg+xml,' + motoboySvg,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      // Adiciona marcadores de clientes
      clients.forEach(client => {
        // Prioridade: 1) geoLat/geoLng do banco, 2) fallback hardcoded por nome
        let location: { lat: number; lng: number } | null = null;
        
        // Tenta usar coordenadas do banco de dados (geoLat, geoLng)
        if (client.geoLat && client.geoLng) {
          const lat = typeof client.geoLat === 'string' ? parseFloat(client.geoLat) : client.geoLat;
          const lng = typeof client.geoLng === 'string' ? parseFloat(client.geoLng) : client.geoLng;
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            location = { lat, lng };
          }
        }
        
        // Fallback: busca no mapeamento hardcoded por nome
        if (!location) {
          const upperName = client.name.toUpperCase();
          // Busca exata ou parcial no dicionário
          location = CLIENT_LOCATIONS[upperName] || 
                     CLIENT_LOCATIONS[client.name] ||
                     Object.entries(CLIENT_LOCATIONS).find(([key]) => 
                       upperName.includes(key) || key.includes(upperName)
                     )?.[1] || null;
        }
        
        if (location && mapRef.current) {
          // Marcador arrastável em modo de edição
          const isDraggable = editable && editMode;
          const marker = L.marker([location.lat, location.lng], { 
            icon: isDraggable ? clientEditIcon : clientIcon,
            draggable: isDraggable,
          })
            .addTo(mapRef.current)
            .bindPopup(`
              <div style="font-family: system-ui; padding: 4px;">
                <strong style="color: ${isDraggable ? '#f59e0b' : '#10b981'};">${client.name}</strong><br/>
                <small style="color: #6b7280;">📍 ${client.bairro || 'Guriri'}</small><br/>
                ${client.rua ? `<small>${client.rua}, ${client.numero || 's/n'}</small>` : ''}
                ${isDraggable ? '<br/><small style="color: #f59e0b;">🔓 Arraste para reposicionar</small>' : ''}
              </div>
            `);
          
          // Listener para quando o marcador for arrastado
          if (isDraggable) {
            marker.on('dragend', (e: any) => {
              const newLatLng = e.target.getLatLng();
              setPendingChanges(prev => {
                const updated = new Map(prev);
                updated.set(client.id, { 
                  lat: newLatLng.lat, 
                  lng: newLatLng.lng,
                  name: client.name 
                });
                return updated;
              });
            });
          }
          
          markersRef.current.push(marker);
        }
      });

      // Adiciona marcadores de motoboys com base em GPS real
      const motoboyById = new Map(motoboys.map(m => [m.id, m]));

      motoboyLocations.forEach(location => {
        if (!mapRef.current) return;
        const driver = motoboyById.get(location.motoboyId);
        const marker = L.marker([location.latitude, location.longitude], { icon: motoboyIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="font-family: system-ui; padding: 4px;">
              <strong style="color: #3b82f6;">🏍️ ${driver?.name || 'Motoboy'}</strong><br/>
              <small>${driver?.phone || 'Sem telefone'}</small><br/>
              <small style="color: #6b7280;">Atualizado em ${new Date(location.timestamp).toLocaleTimeString('pt-BR')}</small>
            </div>
          `);
        markersRef.current.push(marker);
      });
    };

    loadMap();

    // Atualiza posições a cada 10 segundos para fallback quando WebSocket não chegar
    // Mas não atualiza se estiver em modo de edição (para não perder os marcadores arrastados)
    const interval = editMode ? null : setInterval(loadMap, 10000);

    return () => {
      if (interval) clearInterval(interval);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [clients, motoboys, motoboyLocations, editMode, editable]);

  return (
    <Card className="p-0 h-full overflow-hidden relative z-0">
      {/* Controles de edição */}
      {editable && (
        <div className="absolute top-2 right-2 z-[1000] flex gap-2">
          {!editMode ? (
            <Button
              size="sm"
              variant="outline"
              className="bg-white shadow-md"
              onClick={() => setEditMode(true)}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Editar Locais
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700 shadow-md"
                onClick={saveAllChanges}
                disabled={saving || pendingChanges.size === 0}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Salvando...' : `Salvar (${pendingChanges.size})`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white shadow-md"
                onClick={cancelChanges}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </>
          )}
        </div>
      )}
      
      {/* Indicador de modo de edição */}
      {editMode && (
        <div className="absolute top-2 left-2 z-[1000] bg-amber-100 border border-amber-300 text-amber-800 px-3 py-1 rounded-md text-sm shadow-md">
          🔓 Modo Edição: Arraste os marcadores laranjas para corrigir
        </div>
      )}
      
      <div 
        ref={mapContainer} 
        className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] bg-gray-200"
      />
    </Card>
  );
}
