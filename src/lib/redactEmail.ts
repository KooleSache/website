export function redactEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0 || at === email.length - 1) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  if (dot <= 0) return email;

  const domainName = domain.slice(0, dot);
  const tld = domain.slice(dot + 1);

  return `${maskMiddle(local)}@${maskMiddle(domainName)}.${tld}`;
}

function maskMiddle(s: string): string {
  if (s.length <= 1) return s;
  if (s.length === 2) return `${s[0]}*`;
  return `${s[0]}${'*'.repeat(s.length - 2)}${s[s.length - 1]}`;
}
