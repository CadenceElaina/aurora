import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = "enc:";

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set — cannot encrypt webhook secret");
  return crypto.scryptSync(secret, "aurora-webhook-v1", 32) as Buffer;
}

export function encryptWebhookSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + iv.toString("hex") + "." + encrypted.toString("hex") + "." + tag.toString("hex");
}

export function decryptWebhookSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // plaintext legacy value
  const parts = stored.slice(PREFIX.length).split(".");
  if (parts.length !== 3) throw new Error("Malformed encrypted webhook secret");
  const [ivHex, ciphertextHex, tagHex] = parts;
  const key = deriveKey();
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
