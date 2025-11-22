import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Coordenadas de Guriri (ES)
const GURIRI_CENTER: [number, number] = [-18.715, -39.75];

// Definir ícones customizados
const clientIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Client {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface Motoboy {
  id: number;
  name: string;
  vehicle_plate?: string;
  online: boolean;
  latitude?: number;
  longitude?: number;
}

interface Order {
  id: number;
  client_id: number;
  motoboy_id?: number;
  delivery_address?: string;
  latitude?: number;
  longitude?: number;
  status: string;
}

interface MapOverlayProps {
  clients: Client[];
  motoboys: Motoboy[];
  orders: Order[];
}

export function MapOverlay({ clients, motoboys, orders }: MapOverlayProps) {
  const [showClients, setShowClients] = useState(true);
  const [showDrivers, setShowDrivers] = useState(true);
  const [showOrders, setShowOrdersState] = useState(true);

  // Filtrar apenas pedidos ativos
  const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={GURIRI_CENTER}
        zoom={14}
        className="h-full w-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Clientes (Azul) */}
        {showClients && clients.map(client => (
          client.latitude && client.longitude ? (
            <Marker
              key={`client-${client.id}`}
              position={[client.latitude, client.longitude]}
              icon={clientIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{client.name}</strong>
                  {client.address && <p>{client.address}</p>}
                  {client.phone && <p>📞 {client.phone}</p>}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* Motoboys (Verde) */}
        {showDrivers && motoboys.filter(m => m.online).map(motoboy => (
          motoboy.latitude && motoboy.longitude ? (
            <Marker
              key={`motoboy-${motoboy.id}`}
              position={[motoboy.latitude, motoboy.longitude]}
              icon={driverIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>🏍️ {motoboy.name}</strong>
                  {motoboy.vehicle_plate && <p>Placa: {motoboy.vehicle_plate}</p>}
                  <p className="text-green-600">● Online</p>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* Pedidos - Destino Final (Vermelho) */}
        {showOrders && activeOrders.map(order => (
          order.latitude && order.longitude ? (
            <Marker
              key={`order-${order.id}`}
              position={[order.latitude, order.longitude]}
              icon={deliveryIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>📦 Pedido #{order.id}</strong>
                  {order.delivery_address && <p>{order.delivery_address}</p>}
                  <p className="text-orange-600 font-semibold">{order.status}</p>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>

      {/* Filtros */}
      <div className="absolute top-4 right-4 glass-panel p-3 z-[1000]">
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showClients}
              onChange={(e) => setShowClients(e.target.checked)}
              className="rounded"
            />
            <span className="text-white">🔵 Clientes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDrivers}
              onChange={(e) => setShowDrivers(e.target.checked)}
              className="rounded"
            />
            <span className="text-white">🟢 Motoboys</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOrders}
              onChange={(e) => setShowOrdersState(e.target.checked)}
              className="rounded"
            />
            <span className="text-white">🔴 Pedidos</span>
          </label>
        </div>
      </div>

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 glass-panel p-3 z-[1000] text-xs text-white">
        <div className="font-semibold mb-2">Legenda:</div>
        <div className="space-y-1">
          <div>🔵 Cliente (Coleta)</div>
          <div>🟢 Motoboy (Online)</div>
          <div>🔴 Pedido (Destino)</div>
        </div>
      </div>
    </div>
  );
}
