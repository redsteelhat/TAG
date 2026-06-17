export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ApiErrorResponse {
  message?: string | string[];
  code?: string;
}

export interface AuthResponse {
  data: {
    user?: {
      id: string;
      email: string;
      fullName?: string | null;
    };
    accessToken: string;
    refreshToken: string;
  };
}

export async function postJson<TResponse>(
  path: string,
  body: Record<string, unknown>
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }

  return payload as TResponse;
}

function formatApiError(payload: unknown) {
  const error = payload as ApiErrorResponse | undefined;

  if (Array.isArray(error?.message)) {
    return error.message.join(' ');
  }

  return error?.message ?? 'Islem tamamlanamadi.';
}
