export function isTransientOpenAIPermissionError(error: unknown): boolean {
  const status =
    error && typeof error === "object" && "status" in error
      ? Number(error.status)
      : 0;
  const message = error instanceof Error ? error.message : String(error);
  return status === 401 && /insufficient permissions/i.test(message);
}

/** Retry the brief permission propagation error observed on new model routes. */
export async function withTransientOpenAIRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isTransientOpenAIPermissionError(error) ||
        attempt >= Math.max(1, maxAttempts)
      ) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, attempt === 1 ? 250 : 750),
      );
    }
  }
}

/**
 * Use a broadly available fallback when a preview/new-model route remains
 * unavailable after transient retries. Other errors still fail immediately.
 */
export async function withOpenAIModelFallback<T>(
  primaryModel: string,
  fallbackModel: string,
  operation: (model: string) => Promise<T>,
): Promise<T> {
  try {
    return await withTransientOpenAIRetry(() => operation(primaryModel));
  } catch (error) {
    if (
      !isTransientOpenAIPermissionError(error) ||
      !fallbackModel ||
      fallbackModel === primaryModel
    ) {
      throw error;
    }
    return withTransientOpenAIRetry(() => operation(fallbackModel));
  }
}
