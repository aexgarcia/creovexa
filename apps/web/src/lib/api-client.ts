export interface ApiPage<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;
  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(timeoutMs);
    response = await fetch(base.replace(/\/$/, '') + path, {
      ...options,
      headers,
      cache: 'no-store',
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.', 0);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Revisa los datos ingresados.',
      404: 'No se encontró el recurso solicitado.',
      409: 'Los datos cambiaron. Actualiza la página antes de continuar.',
      503: 'El servicio no está disponible en este momento.',
    };
    throw new ApiError(
      messages[response.status] ?? 'No se pudo completar la operación.',
      response.status,
      response.headers.get('x-request-id') ?? undefined,
    );
  }
  if (payload === null)
    throw new ApiError('El servicio devolvió una respuesta inválida.', response.status);
  return payload as T;
}
