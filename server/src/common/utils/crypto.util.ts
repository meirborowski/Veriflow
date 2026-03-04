import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a base64-encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypts a base64-encoded AES-256-GCM ciphertext produced by `encrypt`.
 */
export function decrypt(ciphertext: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  return (
    decipher.update(encrypted).toString('utf8') +
    decipher.final().toString('utf8')
  );
}

/**
 * Generates a random 256-bit (32-byte) key as a hex string.
 * Used for generating ENCRYPTION_KEY values.
 */
export function generateKey(): string {
  return randomBytes(32).toString('hex');
}

export { AUTH_TAG_LENGTH };
