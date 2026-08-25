import "server-only";
import {
  createCipheriv, createDecipheriv, randomBytes, timingSafeEqual,
} from "node:crypto";

/**
 * Encryption for Meta access tokens.
 *
 * Application-level AES-256-GCM rather than Supabase Vault or pgcrypto: the key
 * lives only in a Vercel environment variable, never in the database, so a full
 * database dump still yields nothing usable. GCM is authenticated — tampering
 * with the ciphertext fails loudly instead of decrypting to garbage.
 *
 * Nothing here is hand-rolled crypto; it is node:crypto with a standard mode.
 *
 * ── Ciphertext format ──────────────────────────────────────────────────────
 *   v1.<iv_b64url>.<authTag_b64url>.<ciphertext_b64url>
 *
 * The `v1` prefix versions the FORMAT (algorithm, IV length, encoding). Which
 * KEY was used is stored separately in `token_key_version`, so a key rotation
 * does not require a format change and rows can be re-encrypted in batches by
 * querying that column.
 */

const FORMAT = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;   // GCM standard
const KEY_BYTES = 32;  // AES-256

/** Bump when a new key is introduced; rows record the key that encrypted them. */
export const CURRENT_KEY_VERSION = 1;

export class MetaCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaCryptoError";
  }
}

/**
 * Resolve the key for a given version.
 *
 * `META_TOKEN_ENCRYPTION_KEY` holds the current key as base64 (32 bytes).
 * ── Rotation procedure ─────────────────────────────────────────────────────
 *   1. Move the current key to `META_TOKEN_ENCRYPTION_KEY_V<CURRENT>`.
 *   2. Put the new key in `META_TOKEN_ENCRYPTION_KEY`.
 *   3. Bump CURRENT_KEY_VERSION in this file and deploy.
 * Existing rows keep decrypting through their recorded version; new rows use
 * the new key. Re-encrypt the stragglers by querying token_key_version, then
 * drop the retired variable. Bumping the constant is a deliberate code change
 * so a rotation is reviewable rather than an invisible env edit.
 */
function keyFor(version: number): Buffer {
  const raw =
    version === CURRENT_KEY_VERSION
      ? process.env.META_TOKEN_ENCRYPTION_KEY
      : process.env[`META_TOKEN_ENCRYPTION_KEY_V${version}`];

  if (!raw) {
    throw new MetaCryptoError(
      `Falta la clave de cifrado (versión ${version}). Configura META_TOKEN_ENCRYPTION_KEY.`
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new MetaCryptoError(
      `La clave de cifrado debe ser de ${KEY_BYTES} bytes en base64 (recibidos ${key.length}).`
    );
  }
  return key;
}

/** True when a usable current key is configured — for health checks, not for auth. */
export function isEncryptionConfigured(): boolean {
  try {
    keyFor(CURRENT_KEY_VERSION);
    return true;
  } catch {
    return false;
  }
}

const b64 = (b: Buffer) => b.toString("base64url");

export interface EncryptedToken {
  ciphertext: string;
  keyVersion: number;
}

/** Encrypt a token for storage. Never log the input or the return value. */
export function encryptToken(plaintext: string): EncryptedToken {
  if (!plaintext) throw new MetaCryptoError("No hay token que cifrar.");

  const key = keyFor(CURRENT_KEY_VERSION);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: [FORMAT, b64(iv), b64(tag), b64(body)].join("."),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

/**
 * Decrypt a stored token. Server-side only.
 *
 * Throws on a bad format, an unknown key or a failed authentication tag —
 * never returns a partial or silently wrong value.
 */
export function decryptToken(ciphertext: string, keyVersion: number): string {
  const parts = ciphertext.split(".");
  if (parts.length !== 4) {
    throw new MetaCryptoError("Formato de token cifrado no reconocido.");
  }

  const [format, ivB64, tagB64, bodyB64] = parts;
  if (format !== FORMAT) {
    throw new MetaCryptoError(`Formato de cifrado no soportado: ${format}`);
  }

  const key = keyFor(keyVersion);
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const body = Buffer.from(bodyB64, "base64url");

  if (iv.length !== IV_BYTES) throw new MetaCryptoError("IV con longitud inválida.");
  if (tag.length !== 16) throw new MetaCryptoError("Auth tag con longitud inválida.");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    // GCM authentication failed: the row was tampered with or the key is wrong.
    throw new MetaCryptoError("No se pudo descifrar el token (autenticación fallida).");
  }
}

/** Constant-time comparison, for future OAuth `state` validation. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
