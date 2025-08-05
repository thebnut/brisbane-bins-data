import { logger } from './logger.js';
export async function withRetry(fn, options) {
    const { maxRetries, delay, backoff = 2, onRetry } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
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
    throw lastError;
}
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=retry.js.map