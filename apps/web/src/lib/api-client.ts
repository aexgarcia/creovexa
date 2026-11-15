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
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return base.replace(/\/$/, '') + path;
}
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  )
    headers.set('Content-Type', 'application/json');
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
      413: 'La solicitud supera el tamaño máximo permitido.',
      415: 'Usa una imagen PNG, JPEG o WebP.',
      503: 'El servicio no está disponible en este momento.',
    };
    const imageMessages: Record<string, string> = {
      IMAGE_COPY_REQUIRED: 'Primero genera el texto de la campaña.',
      IMAGE_PRODUCT_IMAGE_REQUIRED:
        'Esta campaña necesita una imagen guardada del producto. Crea una campaña nueva después de subirla.',
      IMAGE_FINAL_ASSET_REQUIRED:
        'El flyer final no está disponible. Actualiza la campaña antes de aprobar.',
      IMAGE_UNAVAILABLE:
        'La generación del flyer no está disponible. Revisa la configuración del proveedor de imagen y del almacenamiento.',
      IMAGE_LOGO_UNAVAILABLE: 'No se pudo leer el logo guardado en esta campaña.',
      IMAGE_INVALID_OUTPUT:
        'No se pudo preparar un flyer válido. Actualiza la campaña antes de reintentar.',
      IMAGE_REFUSED:
        'El proveedor no pudo generar esta imagen. Revisa las instrucciones de la campaña.',
      IMAGE_RATE_LIMITED: 'El proveedor de imagen alcanzó su límite. Inténtalo más tarde.',
      IMAGE_BUSY: 'El flyer ya se está generando. Espera y actualiza la campaña.',
      IMAGE_STALE_RESULT: 'La revisión de la campaña cambió. Actualiza antes de continuar.',
      IMAGE_TIMEOUT:
        'La generación tardó demasiado. Actualiza la campaña para comprobar si terminó antes de reintentar.',
      PRODUCT_IMAGE_INVALID_IMAGE: 'El archivo debe ser una imagen PNG, JPEG o WebP válida.',
      PRODUCT_IMAGE_TOO_LARGE: 'La imagen supera el máximo de 10 MB.',
      ORGANIZATION_LOGO_INVALID_IMAGE: 'El logo debe ser una imagen PNG, JPEG o WebP válida.',
      ORGANIZATION_LOGO_TOO_LARGE: 'El logo supera el máximo de 10 MB.',
    };
    const code =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      payload.error &&
      typeof payload.error === 'object' &&
      'code' in payload.error &&
      typeof payload.error.code === 'string'
        ? payload.error.code
        : '';
    throw new ApiError(
      imageMessages[code] ?? messages[response.status] ?? 'No se pudo completar la operación.',
      response.status,
      response.headers.get('x-request-id') ?? undefined,
    );
  }
  if (payload === null)
    throw new ApiError('El servicio devolvió una respuesta inválida.', response.status);
  return payload as T;
}
