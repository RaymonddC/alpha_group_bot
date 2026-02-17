import { describe, it, expect } from 'vitest';
import { parseSIWSMessage } from '../solana-verify';

const validSIWSMessage = `localhost wants you to sign in with your Solana account:
DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy

Sign in to Alpha Groups

URI: http://localhost:3000
Version: 1
Chain ID: mainnet
Nonce: abc123nonce456
Issued At: 2026-02-17T12:00:00.000Z`;

describe('parseSIWSMessage', () => {
  it('extracts URI from SIWS message', () => {
    const parsed = parseSIWSMessage(validSIWSMessage);
    expect(parsed.uri).toBe('http://localhost:3000');
  });

  it('extracts nonce from SIWS message', () => {
    const parsed = parseSIWSMessage(validSIWSMessage);
    expect(parsed.nonce).toBe('abc123nonce456');
  });

  it('extracts issuedAt from SIWS message', () => {
    const parsed = parseSIWSMessage(validSIWSMessage);
    expect(parsed.issuedAt).toBe('2026-02-17T12:00:00.000Z');
  });

  it('extracts version from SIWS message', () => {
    const parsed = parseSIWSMessage(validSIWSMessage);
    expect(parsed.version).toBe('1');
  });

  it('extracts chainId from SIWS message', () => {
    const parsed = parseSIWSMessage(validSIWSMessage);
    expect(parsed.chainId).toBe('mainnet');
  });

  it('extracts domain from URI', () => {
    const parsed = parseSIWSMessage(validSIWSMessage);
    expect(parsed.domain).toBe('localhost');
  });

  it('extracts domain from https URI', () => {
    const msg = validSIWSMessage.replace('http://localhost:3000', 'https://alpha-groups.vercel.app');
    const parsed = parseSIWSMessage(msg);
    expect(parsed.domain).toBe('alpha-groups.vercel.app');
  });

  it('handles message without optional fields', () => {
    const minimalMsg = `
URI: http://localhost:3000
Nonce: abc123
Issued At: 2026-02-17T12:00:00.000Z`;

    const parsed = parseSIWSMessage(minimalMsg);
    expect(parsed.uri).toBe('http://localhost:3000');
    expect(parsed.nonce).toBe('abc123');
    expect(parsed.issuedAt).toBe('2026-02-17T12:00:00.000Z');
  });

  it('handles empty message gracefully', () => {
    const parsed = parseSIWSMessage('');
    expect(parsed.nonce).toBeUndefined();
    expect(parsed.issuedAt).toBeUndefined();
  });

  it('sets domain to unknown for invalid URI', () => {
    const msg = `URI: not-a-valid-url
Nonce: abc123
Issued At: 2026-02-17T12:00:00.000Z`;

    const parsed = parseSIWSMessage(msg);
    expect(parsed.domain).toBe('unknown');
  });
});
