import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeFt8, decodeFt8, FT8_SAMPLE_RATE, FT8_CYCLE_SECONDS } from '../.test-build/src/lib/ft8/codec.js';

// EN: End-to-end guard for the WASM integration itself, not just the pure-JS
// message parser. Encodes a standard message to audio, decodes that audio
// back, and checks the round trip recovers the original text — catches
// regressions in the wasmBinary wiring or an ft8js API change that unit
// tests on message.ts alone would never see.
// UK: Наскрізна перевірка саме WASM-інтеграції, а не лише чистого
// JS-парсера повідомлень. Кодує стандартне повідомлення в аудіо, декодує
// назад і перевіряє, що текст відновився — ловить регресії в підключенні
// wasmBinary чи зміну API ft8js, які тести самого message.ts не побачать.
test('encodeFt8 -> decodeFt8 round-trips a standard message', async () => {
  const wave = await encodeFt8('CQ UT1AAA KO50', 1000);
  assert.ok(wave, 'encodeFt8 should produce a waveform');
  assert.equal(wave.length, FT8_SAMPLE_RATE * FT8_CYCLE_SECONDS);

  const messages = await decodeFt8(wave);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, 'CQ UT1AAA KO50');
  assert.ok(Number.isFinite(messages[0].db));
  assert.ok(Number.isFinite(messages[0].dt));
  assert.ok(Math.abs(messages[0].df - 1000) < 5);
});

test('decodeFt8 finds nothing in silence', async () => {
  const silence = new Float32Array(FT8_SAMPLE_RATE * FT8_CYCLE_SECONDS);
  const messages = await decodeFt8(silence);
  assert.deepEqual(messages, []);
});
