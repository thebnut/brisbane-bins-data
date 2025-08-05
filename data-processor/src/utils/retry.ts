import { logger } from './logger';

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoff?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, delay, backoff = 2, onRetry } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        logger.error(`Failed after ${maxRetries + 1} attempts`, { error: lastError.message });
        throw lastError;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt);
      
      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${waitTime}ms`, {
        error: lastError.message
      });
      
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}