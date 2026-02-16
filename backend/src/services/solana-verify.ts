import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { supabase } from '../db/client';
import { logger } from './logger';
import { SIWSMessage } from '../types';

/**
 * Parse SIWS (Sign In With Solana) message
 */
export function parseSIWSMessage(message: string): SIWSMessage {
  const lines = message.split('\n');
  const parsed: Partial<SIWSMessage> = {};

  for (const line of lines) {
    if (line.includes('URI:')) {
      parsed.uri = line.split('URI:')[1].trim();
    } else if (line.includes('Issued At:')) {
      parsed.issuedAt = line.split('Issued At:')[1].trim();
    } else if (line.includes('Nonce:')) {
      parsed.nonce = line.split('Nonce:')[1].trim();
    } else if (line.includes('Version:')) {
      parsed.version = line.split('Version:')[1].trim();
    } else if (line.includes('Chain ID:')) {
      parsed.chainId = line.split('Chain ID:')[1].trim();
    }
  }

  // Extract domain from first line or URI
  if (parsed.uri) {
    try {
      const url = new URL(parsed.uri);
      parsed.domain = url.hostname;
    } catch {
      parsed.domain = 'unknown';
    }
  }

  return parsed as SIWSMessage;
}

/**
 * Verify SIWS signature and validate constraints
 */
export async function verifySIWS(
  publicKeyStr: string,
  message: string,
  signatureArray: number[],
  telegramId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // 1. Parse SIWS message
    const parsed = parseSIWSMessage(message);

    if (!parsed.nonce || !parsed.issuedAt) {
      logger.warn('SIWS message missing required fields');
      return { valid: false, error: 'Invalid message format' };
    }

    // 2. Verify timestamp (±10 minutes)
    const issuedAt = new Date(parsed.issuedAt).getTime();
    const now = Date.now();
    const timeDiff = Math.abs(now - issuedAt);

    if (timeDiff > 10 * 60 * 1000) {
      logger.warn('SIWS message expired', { timeDiff });
      return { valid: false, error: 'Message expired' };
    }

    // 3. Check nonce not used (prevent replay attacks)
    const { data: nonceExists } = await supabase
      .from('used_nonces')
      .select('nonce')
      .eq('nonce', parsed.nonce)
      .single();

    if (nonceExists) {
      logger.warn('Nonce reuse detected - replay attack', { nonce: parsed.nonce });
      return { valid: false, error: 'Nonce already used' };
    }

    // 4. Verify signature cryptographically
    const publicKey = new PublicKey(publicKeyStr);
    const publicKeyBytes = publicKey.toBytes();
    const messageBytes = new TextEncoder().encode(message);
    const signature = new Uint8Array(signatureArray);

    const validSignature = nacl.sign.detached.verify(
      messageBytes,
      signature,
      publicKeyBytes
    );

    if (!validSignature) {
      logger.warn('Invalid signature', {
        publicKey: publicKeyStr.substring(0, 8) + '...'
      });
      return { valid: false, error: 'Invalid signature' };
    }

    // 5. Store nonce to prevent replay
    await supabase.from('used_nonces').insert({
      nonce: parsed.nonce,
      telegram_id: telegramId
    });

    logger.info('SIWS verification successful', {
      publicKey: publicKeyStr.substring(0, 8) + '...',
      telegramId
    });

    return { valid: true };
  } catch (error) {
    logger.error('SIWS verification error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

/**
 * Simple signature verification (fallback if SIWS not available)
 */
export function verifySolanaSignature(
  publicKeyStr: string,
  message: string,
  signatureArray: number[]
): boolean {
  try {
    const publicKey = new PublicKey(publicKeyStr);
    const publicKeyBytes = publicKey.toBytes();
    const messageBytes = new TextEncoder().encode(message);
    const signature = new Uint8Array(signatureArray);

    return nacl.sign.detached.verify(messageBytes, signature, publicKeyBytes);
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
}
