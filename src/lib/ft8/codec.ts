// EN: Thin wrapper around ft8js's Emscripten modules. We bypass ft8js's own
// `decode`/`encode` exports (dist/index.js) because those call the module
// factory with no arguments, which makes it fetch() its .wasm binary at
// runtime — incompatible with the portable single-file Web build and with
// Tauri's asset origins. Passing `wasmBinary` directly skips that fetch.
// UK: Легка обгортка над Emscripten-модулями ft8js. Власні `decode`/`encode`
// з ft8js (dist/index.js) викликають фабрику без аргументів, тому вона сама
// робить fetch() за .wasm — це не сумісно з портативною Web-збіркою і
// origin-ами Tauri. Передача `wasmBinary` напряму прибирає цей fetch.
// DE: Dünner Wrapper um die Emscripten-Module von ft8js. Die eigenen
// `decode`/`encode`-Exporte (dist/index.js) rufen die Factory ohne
// Argumente auf, wodurch sie ihre .wasm-Datei per fetch() lädt — nicht
// kompatibel mit dem portablen Web-Build und Tauris Asset-Origins. Die
// direkte Übergabe von `wasmBinary` überspringt diesen fetch.

// @ts-expect-error ft8js ships this as a plain .js Emscripten module without types
import createDecodeModule from 'ft8js/wasm/decode.js';
// @ts-expect-error ft8js ships this as a plain .js Emscripten module without types
import createEncodeModule from 'ft8js/wasm/encode.js';
import { FT8_DECODE_WASM_BASE64, FT8_ENCODE_WASM_BASE64 } from './wasm-assets.js';

export type Ft8ReceivedMessage = {
  db: number;
  dt: number;
  df: number;
  text: string;
};

const SAMPLE_RATE = 12000;
const FT8_DURATION_SECONDS = 15;
const FT8_WAVE_LENGTH = SAMPLE_RATE * FT8_DURATION_SECONDS;
const DECODE_RESULT_SIZE = 2048;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type Decoder = {
  init: () => number;
  exec: (decoderPtr: number, inputPtr: number, resultPtr: number) => Promise<number>;
  module: any;
};

type Encoder = {
  exec: (input: string, frequency: number, bufferPointer: number) => Promise<number>;
  module: any;
};

let decoderReady: Promise<Decoder> | undefined;
let encoderReady: Promise<Encoder> | undefined;

function loadDecoder(): Promise<Decoder> {
  decoderReady ??= createDecodeModule({ wasmBinary: base64ToBytes(FT8_DECODE_WASM_BASE64) }).then(
    (module: any) => ({
      init: module.cwrap('init_decode', 'number', []),
      exec: module.cwrap('exec_decode', 'number', ['number', 'number'], { async: true }),
      module,
    })
  );
  return decoderReady!;
}

function loadEncoder(): Promise<Encoder> {
  encoderReady ??= createEncodeModule({ wasmBinary: base64ToBytes(FT8_ENCODE_WASM_BASE64) }).then(
    (module: any) => ({
      exec: module.cwrap('exec_encode', 'number', ['string', 'number', 'number'], { async: true }),
      module,
    })
  );
  return encoderReady!;
}

// EN: Decodes one 15-second, 12000 Hz mono FT8 capture into the messages
// found in it. Resampling audio to 12 kHz mono is the caller's job.
// UK: Декодує один 15-секундний, 12000 Гц моно-запис FT8 у знайдені
// повідомлення. Ресемплінг до 12 кГц моно — відповідальність виклику.
export async function decodeFt8(samples: Float32Array): Promise<Ft8ReceivedMessage[]> {
  const { init, exec, module } = await loadDecoder();
  const decoderPtr = init();
  const resultPtr = module._malloc(DECODE_RESULT_SIZE);
  const inputPtr = module._malloc(samples.length * samples.BYTES_PER_ELEMENT);
  try {
    module.HEAPF32.set(samples, inputPtr / samples.BYTES_PER_ELEMENT);
    await exec(decoderPtr, inputPtr, resultPtr);
    const raw = new Uint8Array(module.HEAPU8.buffer, resultPtr, DECODE_RESULT_SIZE);
    return new TextDecoder('utf8')
      .decode(raw)
      .replaceAll('\x00', '')
      .trim()
      .split('\n')
      .filter((row) => row.length > 0)
      .map((row) => {
        const [db, dt, df, text] = row.split(',');
        return { db: Number(db), dt: Number(dt), df: Number(df), text };
      });
  } finally {
    module._free(inputPtr);
    module._free(resultPtr);
  }
}

// EN: Encodes a standard FT8 message into a 15-second, 12000 Hz mono audio
// buffer, ready for playback into a transceiver's mic/data input.
// UK: Кодує стандартне повідомлення FT8 у 15-секундний моно-буфер 12000 Гц,
// готовий для відтворення в мікрофонний/data-вхід трансивера.
export async function encodeFt8(text: string, frequency: number): Promise<Float32Array | null> {
  const { exec, module } = await loadEncoder();
  const ptr = module._malloc(FT8_WAVE_LENGTH * 4);
  try {
    const result = await exec(text, frequency, ptr);
    if (result < 0) return null;
    return new Float32Array(module.HEAPU8.buffer.slice(ptr, ptr + FT8_WAVE_LENGTH * 4));
  } finally {
    module._free(ptr);
  }
}

export const FT8_SAMPLE_RATE = SAMPLE_RATE;
export const FT8_CYCLE_SECONDS = FT8_DURATION_SECONDS;
