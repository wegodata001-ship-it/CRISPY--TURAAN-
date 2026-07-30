export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export function success<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

export function failure<T>(error: unknown, fallback = "An unexpected error occurred"): ServiceResult<T> {
  if (error instanceof ServiceError) {
    return { success: false, error: error.message, code: error.code };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: fallback };
}

export async function wrapService<T>(
  operation: () => Promise<T>,
  fallbackMessage: string
): Promise<ServiceResult<T>> {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    return failure<T>(error, fallbackMessage);
  }
}
