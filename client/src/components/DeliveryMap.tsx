import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import type { Client, Order, Motoboy } from '@shared/schema';

interface DeliveryMapProps {
  clients: Client[];
  orders: Order[];
  motoboys: Motoboy[];
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

export function DeliveryMap({ clients, orders, motoboys }: DeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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
        const location = CLIENT_LOCATIONS[client.name];
        if (location && mapRef.current) {
          const marker = L.marker([location.lat, location.lng], { icon: clientIcon })
            .addTo(mapRef.current)
            .bindPopup(`
              <div style="font-family: system-ui; padding: 4px;">
                <strong style="color: #10b981;">${client.name}</strong><br/>
                <small style="color: #6b7280;">📍 ${client.bairro || 'Guriri'}</small>
              </div>
            `);
          markersRef.current.push(marker);
        }
      });

      // Adiciona marcadores de motoboys em entrega
      const activeOrders = orders.filter(o => o.status === 'in_progress');
      activeOrders.forEach(order => {
        // Posiciona motoboy próximo ao destino (simulado)
        if (order.clientName && CLIENT_LOCATIONS[order.clientName] && mapRef.current) {
          const clientLoc = CLIENT_LOCATIONS[order.clientName];
          // Offset para simular movimento
          const lat = clientLoc.lat + (Math.random() - 0.5) * 0.005;
          const lng = clientLoc.lng + (Math.random() - 0.5) * 0.005;
          
          const marker = L.marker([lat, lng], { icon: motoboyIcon })
            .addTo(mapRef.current)
            .bindPopup(`
              <div style="font-family: system-ui; padding: 4px;">
                <strong style="color: #3b82f6;">🏍️ ${order.motoboyName}</strong><br/>
                <small>Em rota para <strong>${order.clientName}</strong></small><br/>
                <small style="color: #6b7280;">📦 ${order.entregaBairro}</small>
              </div>
            `);
          markersRef.current.push(marker);
        }
      });
    };

    loadMap();

    // Atualiza posições a cada 10 segundos
    const interval = setInterval(loadMap, 10000);

    return () => {
      clearInterval(interval);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [clients, orders, motoboys]);

  return (
    <Card className="p-0 h-full overflow-hidden relative z-0">
      <div 
        ref={mapContainer} 
        className="w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]"
        style={{ background: '#e5e7eb' }}
      />
    </Card>
  );
}
