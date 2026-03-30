'use client';

type ChromeRuntime = {
  sendMessage?: (
    extensionId: string,
    message: unknown,
    callback?: (response?: { success?: boolean; message?: string }) => void
  ) => void;
  lastError?: unknown;
};

function getRuntime() {
  return (
    globalThis as typeof globalThis & { chrome?: { runtime?: ChromeRuntime } }
  ).chrome?.runtime;
}

function getExtensionId() {
  return (
    process.env.NEXT_PUBLIC_EXTENSION_ID ??
    'abcdefghijklmnopabcdefghijklmnop'
  );
}

export async function syncExtensionTokenFromSession() {
  if (typeof window === 'undefined') return;

  const runtime = getRuntime();
  if (!runtime?.sendMessage) return;

  const response = await fetch('/api/integration/token', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as { token?: string };
  if (!payload.token) {
    return;
  }

  runtime.sendMessage(
    getExtensionId(),
    {
      type: 'SET_TOKEN',
      token: payload.token,
    },
    () => undefined,
  );
}

export function clearExtensionToken() {
  const runtime = getRuntime();
  if (!runtime?.sendMessage) return;

  runtime.sendMessage(
    getExtensionId(),
    {
      type: 'CLEAR_TOKEN',
    },
    () => undefined,
  );
}

export async function revokeExtensionTokenFromSession() {
  await fetch('/api/integration/token', {
    method: 'DELETE',
    credentials: 'same-origin',
  }).catch(() => undefined);
}
