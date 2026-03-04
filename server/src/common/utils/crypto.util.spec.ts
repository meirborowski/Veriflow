import { encrypt, decrypt, generateKey } from './crypto.util';

describe('crypto.util', () => {
  let key: string;

  beforeEach(() => {
    key = generateKey();
  });

  describe('encrypt / decrypt roundtrip', () => {
    it('should decrypt to the original plaintext', () => {
      const plaintext = 'my-secret-token-abc123';
      const ciphertext = encrypt(plaintext, key);
      expect(decrypt(ciphertext, key)).toBe(plaintext);
    });

    it('should produce different ciphertext for the same plaintext (random IV)', () => {
      const plaintext = 'same-input';
      const c1 = encrypt(plaintext, key);
      const c2 = encrypt(plaintext, key);
      expect(c1).not.toBe(c2);
      expect(decrypt(c1, key)).toBe(plaintext);
      expect(decrypt(c2, key)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const ciphertext = encrypt(plaintext, key);
      expect(decrypt(ciphertext, key)).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(1024);
      const ciphertext = encrypt(plaintext, key);
      expect(decrypt(ciphertext, key)).toBe(plaintext);
    });

    it('should handle special characters and unicode', () => {
      const plaintext = 'https://user:p@ssw0rd!@github.com/org/repo 中文 🔑';
      const ciphertext = encrypt(plaintext, key);
      expect(decrypt(ciphertext, key)).toBe(plaintext);
    });
  });

  describe('decrypt error handling', () => {
    it('should throw on invalid ciphertext format', () => {
      expect(() => decrypt('notvalidformat', key)).toThrow(
        'Invalid ciphertext format',
      );
    });

    it('should throw when tampered (auth tag mismatch)', () => {
      const ciphertext = encrypt('hello', key);
      const parts = ciphertext.split(':');
      // Corrupt the encrypted part
      parts[2] = Buffer.from('corrupted').toString('base64');
      expect(() => decrypt(parts.join(':'), key)).toThrow();
    });

    it('should throw when decrypting with a different key', () => {
      const ciphertext = encrypt('secret', key);
      const wrongKey = generateKey();
      expect(() => decrypt(ciphertext, wrongKey)).toThrow();
    });
  });

  describe('generateKey', () => {
    it('should return a 64-character hex string (32 bytes)', () => {
      const k = generateKey();
      expect(k).toHaveLength(64);
      expect(k).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique keys', () => {
      const k1 = generateKey();
      const k2 = generateKey();
      expect(k1).not.toBe(k2);
    });
  });
});
