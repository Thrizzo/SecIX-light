import { db } from "@/integrations/database/client";

/**
 * Invoke a backend function.
 * - In SaaS mode: Uses backend functions
 * - In self-hosted mode: Uses REST API endpoints
 * Returns the data directly (not wrapped in {data, error}).
 * Throws an error if the request fails.
 */
export async function invokeBackendFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<T> {
  const result = await db.functions.invoke<T>(functionName, { body });
  const data = result.data as T | null;
  const error = result.error as Error | null;

  if (error) {
    const errorMessage = error.message || 'Backend function failed';

    // Handle specific error codes
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
      throw new Error('AI rate limit exceeded. Please wait a moment and try again.');
    }
    if (
      errorMessage.includes('402') ||
      errorMessage.toLowerCase().includes('payment') ||
      errorMessage.toLowerCase().includes('quota')
    ) {
      throw new Error('AI quota exceeded. Please check your API credits.');
    }

    throw new Error(errorMessage);
  }

  // Also check if the response contains an error object
  if (data && typeof data === 'object' && data !== null && 'error' in (data as object)) {
    const maybeError = (data as unknown as { error?: unknown }).error;
    const errorMessage = typeof maybeError === 'string' ? maybeError : '';

    if (errorMessage) {
      if (errorMessage.toLowerCase().includes('rate limit')) {
        throw new Error('AI rate limit exceeded. Please wait a moment and try again.');
      }
      if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('payment')) {
        throw new Error('AI quota exceeded. Please check your API credits.');
      }

      throw new Error(errorMessage);
    }
  }

  return data as T;
}

