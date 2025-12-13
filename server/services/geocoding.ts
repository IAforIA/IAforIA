/**
 * Serviço de Geocodificação usando OpenStreetMap Nominatim API
 * 
 * GRATUITO e sem necessidade de API key.
 * 
 * Documentação: https://nominatim.org/release-docs/develop/api/Search/
 * 
 * Rate limit: 1 request per second (respeitamos isso)
 * 
 * @module services/geocoding
 */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}

interface GeocodingResult {
  success: boolean;
  lat: number | null;
  lng: number | null;
  displayName: string | null;
  error?: string;
}

// Cache simples para evitar requisições repetidas
const geocodeCache = new Map<string, GeocodingResult>();

// Delay para respeitar rate limit do Nominatim (1 req/s)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocodifica um endereço usando Nominatim (OpenStreetMap)
 * 
 * @param address - Endereço completo (rua, número, bairro, cidade, estado)
 * @returns Coordenadas lat/lng ou null se não encontrado
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  // Verifica cache
  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    // Formata endereço para busca
    const encodedAddress = encodeURIComponent(address);
    
    // Requisição para Nominatim
    // Adicionamos Brasil e ES para melhorar precisão
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=br`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GuririExpress/1.0 (delivery-logistics-platform)',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      const result: GeocodingResult = {
        success: false,
        lat: null,
        lng: null,
        displayName: null,
        error: 'Endereço não encontrado',
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }

    const best = results[0];
    const result: GeocodingResult = {
      success: true,
      lat: parseFloat(best.lat),
      lng: parseFloat(best.lon),
      displayName: best.display_name,
    };

    geocodeCache.set(cacheKey, result);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[Geocoding] Erro ao geocodificar "${address}":`, errorMessage);
    
    return {
      success: false,
      lat: null,
      lng: null,
      displayName: null,
      error: errorMessage,
    };
  }
}

/**
 * Monta endereço completo a partir dos campos do cliente
 */
export function buildFullAddress(client: {
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
}): string {
  const parts: string[] = [];

  if (client.rua) parts.push(client.rua);
  if (client.numero) parts.push(client.numero);
  if (client.bairro) parts.push(client.bairro);
  
  // Adiciona cidade ou default para Guriri/São Mateus
  const cidade = client.cidade || 'Guriri, São Mateus';
  parts.push(cidade);
  parts.push('ES'); // Espírito Santo
  parts.push('Brasil');

  return parts.join(', ');
}

/**
 * Geocodifica múltiplos clientes com rate limiting
 * 
 * @param clients - Array de clientes com endereço
 * @returns Map de clientId para resultado
 */
export async function geocodeBatch(
  clients: Array<{
    id: string;
    name: string;
    rua?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cep?: string | null;
    cidade?: string | null;
  }>
): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>();

  for (const client of clients) {
    // Só geocodifica se tiver pelo menos rua ou bairro
    if (!client.rua && !client.bairro) {
      results.set(client.id, {
        success: false,
        lat: null,
        lng: null,
        displayName: null,
        error: 'Endereço incompleto',
      });
      continue;
    }

    const address = buildFullAddress(client);
    console.log(`[Geocoding] Processando cliente "${client.name}": ${address}`);
    
    const result = await geocodeAddress(address);
    results.set(client.id, result);

    // Respeita rate limit do Nominatim (1 req/seg)
    await delay(1100);
  }

  return results;
}
