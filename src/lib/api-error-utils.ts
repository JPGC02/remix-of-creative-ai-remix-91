import { toast } from 'sonner';

/**
 * Checks if an error message indicates a quota/credit limit issue
 * and shows a specific user-friendly notification.
 * Returns true if it was a quota error (handled), false otherwise.
 */
export function handleQuotaError(errorMessage: string): boolean {
  const quotaPatterns = [
    'RESOURCE_EXHAUSTED',
    'exceeded your current quota',
    'rate limit',
    '429',
    'quota',
    'billing',
  ];

  const isQuotaError = quotaPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );

  if (isQuotaError) {
    toast.warning('Sem créditos disponíveis', {
      description: 'Você atingiu o limite de créditos da API. Verifique seu plano e detalhes de cobrança nas configurações.',
      duration: 8000,
    });
    return true;
  }

  return false;
}

/**
 * Processes an error from a generation API call.
 * Shows a quota-specific toast if applicable, otherwise throws the original error.
 */
export function processGenerationError(error: any): never {
  const message = error?.message || error?.toString() || 'Erro desconhecido';
  
  if (handleQuotaError(message)) {
    throw new Error('Limite de créditos atingido. Verifique seu plano.');
  }
  
  throw error;
}
