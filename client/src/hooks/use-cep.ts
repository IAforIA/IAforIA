import { useState, useCallback } from 'react';

/**
 * Resposta da API ViaCEP
 */
export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

/**
 * Endereço normalizado retornado pelo hook
 */
export interface AddressFromCep {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
}

/**
 * Estado do hook useCep
 */
export interface UseCepState {
  isLoading: boolean;
  error: string | null;
  address: AddressFromCep | null;
}

/**
 * Hook para buscar endereço pelo CEP via ViaCEP
 * 
 * @example
 * ```tsx
 * const { fetchAddress, isLoading, error, address } = useCep();
 * 
 * // No onBlur do campo CEP:
 * const handleCepBlur = async (cep: string) => {
 *   const result = await fetchAddress(cep);
 *   if (result) {
 *     form.setValue('rua', result.rua);
 *     form.setValue('bairro', result.bairro);
 *   }
 * };
 * ```
 */
export function useCep() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressFromCep | null>(null);

  /**
   * Normaliza CEP removendo caracteres não numéricos
   */
  const normalizeCep = useCallback((value: string): string => {
    return value.replace(/\D/g, '').slice(0, 8);
  }, []);

  /**
   * Formata CEP para exibição (00000-000)
   */
  const formatCep = useCallback((value: string): string => {
    const clean = value.replace(/\D/g, '').slice(0, 8);
    if (clean.length <= 5) return clean;
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }, []);

  /**
   * Valida se CEP tem 8 dígitos
   */
  const isValidCep = useCallback((cep: string): boolean => {
    const clean = cep.replace(/\D/g, '');
    return clean.length === 8;
  }, []);

  /**
   * Busca endereço pelo CEP via API ViaCEP
   * @param cepRaw - CEP com ou sem formatação
   * @returns Endereço ou null se erro
   */
  const fetchAddress = useCallback(async (cepRaw: string): Promise<AddressFromCep | null> => {
    const cep = normalizeCep(cepRaw);
    
    if (cep.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro ao consultar CEP');
      }

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      const addressData: AddressFromCep = {
        cep: data.cep || formatCep(cep),
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
        complemento: data.complemento || '',
      };

      setAddress(addressData);
      return addressData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar CEP';
      setError(message);
      setAddress(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [normalizeCep, formatCep]);

  /**
   * Limpa estado do hook
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setAddress(null);
  }, []);

  return {
    fetchAddress,
    isLoading,
    error,
    address,
    reset,
    normalizeCep,
    formatCep,
    isValidCep,
  };
}

export default useCep;
