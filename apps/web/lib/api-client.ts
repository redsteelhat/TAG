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
  body: Record<string, unknown>,
  options?: {
    accessToken?: string;
  }
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {})
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }

  return payload as TResponse;
}

export async function patchJson<TResponse>(
  path: string,
  body: Record<string, unknown>,
  options?: {
    accessToken?: string;
  }
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {})
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }

  return payload as TResponse;
}

export async function getJson<TResponse>(
  path: string,
  options?: {
    accessToken?: string;
    query?: Record<string, string | number | undefined>;
  }
) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    headers: {
      ...(options?.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {})
    }
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }

  return payload as TResponse;
}

export async function deleteJson<TResponse>(
  path: string,
  options?: {
    accessToken?: string;
  }
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      ...(options?.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {})
    }
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

  return error?.message ?? 'İşlem tamamlanamadı.';
}
