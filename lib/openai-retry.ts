/** Retry the brief permission propagation error observed on new model routes. */
export async function withTransientOpenAIRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number(error.status)
        : 0;
    const message = error instanceof Error ? error.message : String(error);
    if (status !== 401 || !/insufficient permissions/i.test(message)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return operation();
  }
}
