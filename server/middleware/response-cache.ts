/**
 * RESPONSE CACHE - Cacheia respostas da IA para perguntas similares
 * 
 * REDUÇÃO DE CUSTO: Evita chamadas duplicadas à OpenAI API
 * ESTRATÉGIA: 
 * - Normaliza mensagens (remove espaços, lowercase, acentos)
 * - Armazena respostas em memória (TTL: 1 hora)
 * - Cache pequeno (max 200 entradas) para economizar RAM
 */

interface CacheEntry {
  response: string;
  timestamp: Date;
  hits: number; // Quantas vezes foi reutilizado
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  
  // Configuration
  private readonly MAX_ENTRIES = 200; // Limite para economizar memória
  private readonly TTL_HOURS = 1; // Cache válido por 1 hora

  /**
   * Normalize message for caching (remove variations)
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .normalize('NFD') // Remove acentos
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' '); // Normaliza espaços
  }

  /**
   * Generate cache key from message and category
   */
  private getCacheKey(message: string, category: string): string {
    const normalized = this.normalizeMessage(message);
    return `${category}:${normalized}`;
  }

  /**
   * Get cached response if available
   */
  get(message: string, category: string): string | null {
    const key = this.getCacheKey(message, category);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    const now = new Date();
    const ageHours = (now.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60);
    
    if (ageHours > this.TTL_HOURS) {
      this.cache.delete(key);
      return null;
    }

    // Update hit counter
    entry.hits++;
    
    console.log(`✅ Cache HIT: "${message.substring(0, 30)}..." (${entry.hits} reuses, saved ~$0.0001)`);
    
    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(message: string, category: string, response: string): void {
    const key = this.getCacheKey(message, category);

    // Enforce max size (LRU-style: remove oldest)
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      response,
      timestamp: new Date(),
      hits: 0,
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    estimatedSavings: number;
  } {
    let totalHits = 0;
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      totalHits,
      estimatedSavings: totalHits * 0.0001, // ~$0.0001 per AI call saved
    };
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const ageHours = (now.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (ageHours > this.TTL_HOURS) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
}

// Singleton instance
export const responseCache = new ResponseCache();

// Auto-cleanup every 30 minutes
setInterval(() => {
  responseCache.cleanup();
}, 30 * 60 * 1000);
