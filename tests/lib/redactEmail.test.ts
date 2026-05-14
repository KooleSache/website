import { describe, it, expect } from 'vitest';
import { redactEmail } from '../../src/lib/redactEmail';

describe('redactEmail', () => {
  it('redacts a normal email', () => {
    expect(redactEmail('andrey@okonet.dev')).toBe('a****y@o****t.dev');
  });

  it('redacts short local parts', () => {
    expect(redactEmail('ab@example.com')).toBe('a*@e*****e.com');
  });

  it('redacts very short local parts', () => {
    expect(redactEmail('a@b.com')).toBe('a@b.com');
  });

  it('returns the original input for malformed addresses', () => {
    expect(redactEmail('not-an-email')).toBe('not-an-email');
  });
});
