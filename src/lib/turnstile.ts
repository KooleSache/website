const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIP?: string,
): Promise<boolean> {
  if (!token || !secret) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIP) body.append('remoteip', remoteIP);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
