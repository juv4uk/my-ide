import { createLocalId } from '../qso.js';

export type TransportKind = 'relay' | 'webrtc' | 'lora';

export interface QsoInvite {
  version: 1;
  /** Public, non-secret room identifier safe to expose to a relay. */
  roomId: string;
  /** Human-readable secret exchanged over the air or by QR code. */
  code: string;
}

export interface EncryptedMessage {
  version: 1;
  id: string;
  roomId: string;
  createdAt: string;
  iv: string;
  ciphertext: string;
}

export interface PlainMessage {
  sender: string;
  text: string;
  qsoId?: string;
}

export type MessageHandler = (message: EncryptedMessage) => void;

/**
 * EN: Every carrier implements this boundary, so UI and encryption never depend on a network vendor.
 * UK: Кожен канал реалізує цю межу, тому UI та шифрування не залежать від постачальника мережі.
 * DE: Jeder Übertragungskanal implementiert diese Grenze; UI und Verschlüsselung bleiben anbieterneutral.
 */
export interface QsoConnectTransport {
  readonly kind: TransportKind;
  connect(roomId: string): Promise<void>;
  send(message: EncryptedMessage): Promise<void>;
  subscribe(handler: MessageHandler): () => void;
  disconnect(): Promise<void>;
}

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function bytesToCode(bytes: Uint8Array): string {
  const characters = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  return characters.match(/.{1,4}/g)?.join('-') ?? characters;
}

export function normalizeInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, '');
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function inviteFromCode(value: string): Promise<QsoInvite> {
  const normalized = normalizeInviteCode(value);
  if (normalized.length !== 12) throw new Error('Invite code must contain 12 characters');
  const digest = await sha256(`signal-radio-qso-room:${normalized}`);
  return { version: 1, roomId: toBase64Url(digest.slice(0, 12)), code: normalized.match(/.{1,4}/g)?.join('-') ?? normalized };
}

export async function createInvite(): Promise<QsoInvite> {
  const random = crypto.getRandomValues(new Uint8Array(12));
  return inviteFromCode(bytesToCode(random));
}

async function deriveRoomKey(invite: QsoInvite): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalizeInviteCode(invite.code)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(invite.roomId), iterations: 210_000 },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(invite: QsoInvite, sender: string, message: Omit<PlainMessage, 'sender'>): Promise<EncryptedMessage> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveRoomKey(invite);
  const plaintext = new TextEncoder().encode(JSON.stringify({ ...message, sender: sender.trim().toUpperCase() }));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  return {
    version: 1,
    id: createLocalId(),
    roomId: invite.roomId,
    createdAt: new Date().toISOString(),
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(ciphertext)
  };
}

export async function decryptMessage(invite: QsoInvite, envelope: EncryptedMessage): Promise<PlainMessage> {
  if (envelope.roomId !== invite.roomId) throw new Error('Message belongs to a different room');
  const key = await deriveRoomKey(invite);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(envelope.iv) }, key, fromBase64Url(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext)) as PlainMessage;
}
