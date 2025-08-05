export interface RetryOptions {
    maxRetries: number;
    delay: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
}
export declare function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T>;
export declare function delay(ms: number): Promise<void>;
//# sourceMappingURL=retry.d.ts.map