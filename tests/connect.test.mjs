import assert from 'node:assert/strict';
import test from 'node:test';
import { createInvite, decryptMessage, encryptMessage, inviteFromCode, normalizeInviteCode } from '../.test-build/src/lib/connect/protocol.js';

test('creates a human-readable invite that resolves to a stable public room id', async () => {
  const invite = await createInvite();
  assert.match(invite.code, /^[2-9A-HJ-NP-Z]{4}(?:-[2-9A-HJ-NP-Z]{4}){2}$/);
  assert.equal((await inviteFromCode(invite.code.toLowerCase())).roomId, invite.roomId);
});

test('normalizes separators without accepting ambiguous characters', () => {
  assert.equal(normalizeInviteCode('abcd-2345-npqr'), 'ABCD2345NPQR');
  assert.equal(normalizeInviteCode('O0-I1'), '');
});

test('encrypts message content before it reaches a transport', async () => {
  const invite = await createInvite();
  const envelope = await encryptMessage(invite, 'ur5abc', { text: 'Danke · Дякую · Thank you', qsoId: 'qso-1' });
  assert.equal('sender' in envelope, false);
  assert.doesNotMatch(envelope.ciphertext, /Danke|Дякую|Thank/);
  assert.deepEqual(await decryptMessage(invite, envelope), { sender: 'UR5ABC', text: 'Danke · Дякую · Thank you', qsoId: 'qso-1' });
});

test('rejects decrypting a message with another invite', async () => {
  const senderInvite = await createInvite();
  const receiverInvite = await createInvite();
  const envelope = await encryptMessage(senderInvite, 'UR5ABC', { text: 'CQ' });
  await assert.rejects(() => decryptMessage(receiverInvite, envelope));
});
