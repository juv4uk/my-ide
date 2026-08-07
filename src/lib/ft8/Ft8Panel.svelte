<script lang="ts">
  import { decodeFt8, FT8_SAMPLE_RATE, FT8_CYCLE_SECONDS, type Ft8ReceivedMessage } from './codec';
  import type { MessageKey } from '../i18n';

  let { t }: { t: (key: MessageKey) => string } = $props();

  type LogEntry = Ft8ReceivedMessage & { id: string; capturedAt: string };

  let listening = $state(false);
  let statusMessage = $state('');
  let entries = $state<LogEntry[]>([]);
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let chunk: number[] = [];

  // EN: FT8 slots start on UTC 15-second boundaries. We resample the phone/PC
  // mic's native sample rate down to a rolling buffer and hand a 15 s window
  // to the decoder each time one fills up. This is a best-effort cadence, not
  // strictly UTC-aligned yet — good enough to prove decoding works end to
  // end; slot alignment is a follow-up.
  // UK: Слоти FT8 починаються на межах UTC по 15с. Мікрофон ресемплюємо в
  // буфер, що котиться, і кожні 15с віддаємо вікно в декодер. Це орієнтовний
  // темп, ще не строго прив'язаний до UTC — достатньо, щоб довести, що
  // декодування працює наскрізь; вирівнювання по слотах — наступний крок.
  async function startListening() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 }, video: false });
    } catch (error) {
      statusMessage = String((error as Error)?.message ?? error);
      return;
    }

    audioContext = new AudioContext();
    source = audioContext.createMediaStreamSource(stream);
    // ScriptProcessorNode is deprecated but remains the most portable way to
    // reach raw PCM across the Tauri webview targets this app ships for; an
    // AudioWorklet migration is worth revisiting once mobile audio capture
    // is validated on-device.
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    const inputRate = audioContext.sampleRate;

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i++) chunk.push(input[i]);

      const chunkSeconds = chunk.length / inputRate;
      if (chunkSeconds >= FT8_CYCLE_SECONDS) {
        const captured = chunk;
        chunk = [];
        void processCapture(new Float32Array(captured), inputRate);
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    listening = true;
    statusMessage = '';
  }

  function stopListening() {
    processor?.disconnect();
    source?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    void audioContext?.close();
    processor = null;
    source = null;
    stream = null;
    audioContext = null;
    chunk = [];
    listening = false;
  }

  async function processCapture(samples: Float32Array, inputRate: number) {
    const resampled = await resampleTo12kHzMono(samples, inputRate);
    try {
      const messages = await decodeFt8(resampled);
      if (messages.length === 0) return;
      const capturedAt = new Date().toISOString();
      entries = [
        ...messages.map((message) => ({ ...message, id: crypto.randomUUID(), capturedAt })),
        ...entries
      ].slice(0, 200);
    } catch (error) {
      statusMessage = String((error as Error)?.message ?? error);
    }
  }

  async function resampleTo12kHzMono(samples: Float32Array, inputRate: number): Promise<Float32Array> {
    if (inputRate === FT8_SAMPLE_RATE) return samples;
    const durationSeconds = samples.length / inputRate;
    const offline = new OfflineAudioContext(1, Math.ceil(durationSeconds * FT8_SAMPLE_RATE), FT8_SAMPLE_RATE);
    const buffer = offline.createBuffer(1, samples.length, inputRate);
    buffer.copyToChannel(samples, 0);
    const bufferSource = offline.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.connect(offline.destination);
    bufferSource.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }

  function copyCallsign(text: string) {
    const call = text.split(' ').find((token, index) => index > 0 && /^[A-Z0-9/]{3,}$/.test(token));
    if (call) void navigator.clipboard?.writeText(call);
  }
</script>

<section class="ft8-panel">
  <div class="ft8-controls">
    {#if !listening}
      <button class="ft8-toggle" onclick={startListening}>{t('ft8Start')}</button>
    {:else}
      <button class="ft8-toggle ft8-toggle--active" onclick={stopListening}>{t('ft8Stop')}</button>
    {/if}
    <span class="ft8-hint">{t('ft8Hint')}</span>
  </div>

  {#if statusMessage}
    <p class="ft8-error">{statusMessage}</p>
  {/if}

  {#if entries.length === 0}
    <div class="ft8-empty">◇ {t('ft8Empty')}</div>
  {:else}
    <ul class="ft8-list">
      {#each entries as entry (entry.id)}
        <li class="ft8-entry">
          <span class="ft8-db">{entry.db > 0 ? '+' : ''}{entry.db.toFixed(0)} dB</span>
          <span class="ft8-df">{entry.df.toFixed(0)} Hz</span>
          <span class="ft8-text">{entry.text}</span>
          <button class="ft8-copy" onclick={() => copyCallsign(entry.text)} title={t('ft8CopyCall')}>⧉</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .ft8-panel { display: flex; flex-direction: column; gap: 14px; }
  .ft8-controls { display: flex; align-items: center; gap: 12px; }
  .ft8-toggle {
    padding: 10px 18px; border-radius: 12px; border: 1px solid #47556966;
    background: var(--cyan); color: #0b1220; font-weight: 800; cursor: pointer;
  }
  .ft8-toggle--active { background: #ff948c; }
  .ft8-hint { color: #64748b; font-size: 12px; }
  .ft8-error { color: #ff948c; }
  .ft8-empty { display: grid; place-items: center; min-height: 160px; color: #475569; font-size: 40px; }
  .ft8-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .ft8-entry {
    display: grid; grid-template-columns: 60px 70px 1fr auto; align-items: center; gap: 10px;
    padding: 8px 12px; border: 1px solid #47556966; border-radius: 10px; background: #172033e6;
    font-family: monospace; font-size: 13px;
  }
  .ft8-db { color: var(--cyan); }
  .ft8-df { color: #94a3b8; }
  .ft8-copy { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; }
</style>
