import { authStore } from "./auth-store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

interface ApiSuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

interface ApiErrorEnvelope {
  success: false;
  // The global ValidationPipe reports each failed field as its own string.
  message: string | string[];
  error: string;
  statusCode: number;
  /** Present on 429s (login/signup/refresh rate limiting) — seconds to wait. */
  retryAfter?: number;
}

export class ApiError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  /** Attach the stored access token as a Bearer header. Default true. */
  auth?: boolean;
  headers?: Record<string, string>;
}

/**
 * Talks to the real Carmessie API and unwraps its `{ success, data }`
 * envelope (`ResponseInterceptor`) / `{ success: false, message }` error
 * shape (`HttpExceptionFilter`) into a plain value or a thrown `ApiError`.
 */
export async function apiFetch<T>(
  path: string,
  { auth = true, headers, ...init }: ApiFetchOptions = {}
): Promise<T> {
  // A FormData body (image upload) needs the browser to set its own
  // multipart Content-Type with boundary — setting it manually breaks parsing.
  const requestHeaders: Record<string, string> = {
    ...(init.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...headers,
  };

  if (auth) {
    const token = authStore.getAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: requestHeaders,
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con la API en ${API_BASE_URL}. ¿Está corriendo?`,
      0
    );
  }

  const body = (await response.json().catch(() => null)) as
    | ApiSuccessEnvelope<T>
    | ApiErrorEnvelope
    | null;

  if (!response.ok || !body || body.success === false) {
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : (rawMessage ?? `Error ${response.status}`);
    const retryAfter = body && !body.success ? body.retryAfter : undefined;
    throw new ApiError(message, response.status, retryAfter);
  }

  return body.data;
}
