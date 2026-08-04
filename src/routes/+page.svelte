<script lang="ts">
  import { onMount } from 'svelte';
  import { save } from '@tauri-apps/plugin-dialog';
  import { writeTextFile } from '@tauri-apps/plugin-fs';
  import { exportAdif, parseAdif } from '$lib/adif';
  import { translate, type MessageKey } from '$lib/i18n';
  import { BANDS, MODES, defaultRst, emptyQso, normalizeCallsign, utcQsoDate, type Qso, type StationProfile } from '$lib/qso';
  import { DEFAULT_PROFILE, QsoRepository } from '$lib/qso-store';

  type Tab = 'new' | 'log' | 'notes' | 'settings';

  const repository = new QsoRepository();
  const NOTES_KEY = 'signal-radio-ide:field-notes:v1';
  const quickBands = ['80M', '40M', '20M', '15M', '10M', '2M'];
  const quickModes = ['SSB', 'CW', 'FT8', 'FM'];

  let activeTab: Tab = 'new';
  let profile: StationProfile = { ...DEFAULT_PROFILE };
  let draft: Qso = emptyQso(profile);
  let records: Qso[] = [];
  let searchQuery = '';
  let showAdvanced = false;
  let editing = false;
  let ready = false;
  let toast = '';
  let importInput: HTMLInputElement;
  let fieldNotes = '';
  let renderedMarkdown = '';
  let mermaidSvg = '';
  let noteRenderError = '';
  let noteRenderTimer: number | undefined;
  let noteRenderRevision = 0;

  $: t = (key: MessageKey) => translate(profile.language, key);
  $: normalizedSearch = searchQuery.trim().toUpperCase();
  $: filteredRecords = normalizedSearch
    ? records.filter((record) => [record.call, record.qth, record.band, record.mode, record.name, record.gridSquare]
        .some((value) => value.toUpperCase().includes(normalizedSearch)))
    : records;
  $: todayCount = records.filter((record) => record.qsoDate === utcQsoDate()).length;

  onMount(() => {
    profile = repository.loadProfile();
    records = repository.list();
    draft = emptyQso(profile);
    fieldNotes = localStorage.getItem(NOTES_KEY) ?? '';
    ready = true;
  });

  function flash(message: string): void {
    toast = message;
    window.setTimeout(() => { if (toast === message) toast = ''; }, 2600);
  }

  function chooseBand(band: string): void {
    draft.band = band;
  }

  function chooseMode(mode: string): void {
    draft.mode = mode;
    draft.rstSent = defaultRst(mode);
    draft.rstRcvd = defaultRst(mode);
  }

  function submitQso(): void {
    draft.call = normalizeCallsign(draft.call);
    if (!draft.call) { flash(t('requiredCall')); return; }
    repository.save(draft);
    records = repository.list();
    draft = emptyQso(profile);
    editing = false;
    showAdvanced = false;
    flash(t('saved'));
  }

  function editQso(record: Qso): void {
    // A deep copy protects the persisted record until the operator explicitly presses Update.
    draft = structuredClone(record);
    editing = true;
    showAdvanced = true;
    activeTab = 'new';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit(): void {
    draft = emptyQso(profile);
    editing = false;
    showAdvanced = false;
  }

  function removeQso(id: string): void {
    if (!window.confirm(t('confirmDelete'))) return;
    repository.remove(id);
    records = repository.list();
  }

  function saveProfile(): void {
    profile.callsign = normalizeCallsign(profile.callsign);
    profile.operator = normalizeCallsign(profile.operator);
    profile.gridSquare = profile.gridSquare.trim().toUpperCase();
    repository.saveProfile(profile);
    if (!editing) draft = emptyQso(profile);
    flash(t('profileSaved'));
  }

  async function importFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const imported = parseAdif(await file.text(), profile);
      repository.saveMany(imported);
      records = repository.list();
      flash(`${imported.length} ${t('imported')}`);
      activeTab = 'log';
    } catch (error) {
      console.error('ADIF import failed:', error);
      flash(t('importError'));
    } finally {
      input.value = '';
    }
  }

  async function exportFile(): Promise<void> {
    const content = exportAdif(records, '0.2.20');
    try {
      // Native save gives desktop/mobile users a predictable destination. Web builds use a download.
      if ('__TAURI_INTERNALS__' in window) {
        const path = await save({ defaultPath: `radio-log-${utcQsoDate()}.adi`, filters: [{ name: 'ADIF', extensions: ['adi', 'adif'] }] });
        if (path) await writeTextFile(path, content);
      } else {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = `radio-log-${utcQsoDate()}.adi`; anchor.click();
        URL.revokeObjectURL(url);
      }
      flash(t('exported'));
    } catch (error) {
      console.error('ADIF export failed:', error);
      flash(t('importError'));
    }
  }

  function displayDate(value: string): string {
    return value.length === 8 ? `${value.slice(6, 8)}.${value.slice(4, 6)}.${value.slice(0, 4)}` : value;
  }

  function displayTime(value: string): string {
    return value.length >= 4 ? `${value.slice(0, 2)}:${value.slice(2, 4)}` : value;
  }

  function openNotes(): void {
    activeTab = 'notes';
    scheduleNoteRender();
  }

  function scheduleNoteRender(): void {
    localStorage.setItem(NOTES_KEY, fieldNotes);
    if (noteRenderTimer) window.clearTimeout(noteRenderTimer);
    noteRenderTimer = window.setTimeout(renderNotes, 220);
  }

  async function renderNotes(): Promise<void> {
    const revision = ++noteRenderRevision;
    const mermaidMatch = fieldNotes.match(/```mermaid\s*\n([\s\S]*?)```/i);
    const markdownSource = fieldNotes.replace(/```mermaid\s*\n[\s\S]*?```/gi, '');
    noteRenderError = '';

    try {
      // Lazy imports keep the fast QSO entry screen small; these editors are optional tools.
      const [{ marked, Renderer }, mermaidModule] = await Promise.all([import('marked'), import('mermaid')]);
      if (revision !== noteRenderRevision) return;

      const renderer = new Renderer();
      renderer.html = ({ text }) => escapeHtml(text);
      renderedMarkdown = sanitizeHtml(await marked.parse(markdownSource, { renderer }));

      mermaidSvg = '';
      if (mermaidMatch?.[1].trim()) {
        const mermaid = mermaidModule.default;
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
        const result = await mermaid.render(`field-note-${revision}-${Date.now()}`, mermaidMatch[1].trim());
        if (revision === noteRenderRevision) mermaidSvg = sanitizeGeneratedSvg(result.svg);
      }
    } catch (error) {
      console.error('Note preview failed:', error);
      if (revision === noteRenderRevision) noteRenderError = t('diagramError');
    }
  }

  function escapeHtml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  }

  /** Defense in depth for both Markdown and generated SVG before Svelte's {@html} boundary. */
  function sanitizeHtml(value: string): string {
    const document = new DOMParser().parseFromString(value, 'text/html');
    document.querySelectorAll('script, iframe, object, embed, style, link, meta, foreignObject').forEach((node) => node.remove());
    document.querySelectorAll('*').forEach((element) => {
      for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase();
        const content = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || ((name === 'href' || name === 'src' || name === 'xlink:href') && /^(javascript|data):/.test(content))) {
          element.removeAttribute(attribute.name);
        }
      }
    });
    return document.body.innerHTML;
  }

  function sanitizeGeneratedSvg(value: string): string {
    const document = new DOMParser().parseFromString(value, 'image/svg+xml');
    document.querySelectorAll('script, foreignObject').forEach((node) => node.remove());
    document.querySelectorAll('*').forEach((element) => {
      for (const attribute of [...element.attributes]) {
        if (attribute.name.toLowerCase().startsWith('on') || /^(javascript|data):/i.test(attribute.value.trim())) {
          element.removeAttribute(attribute.name);
        }
      }
    });
    return document.documentElement.outerHTML;
  }
</script>

<svelte:head>
  <title>{t('appName')}</title>
  <meta name="theme-color" content="#0f172a" />
</svelte:head>

{#if ready}
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <img class="brand-mark" src="/brand-icon.svg" alt="" />
        <div><strong>{t('appName')}</strong><small>{records.length} {t('contacts')} · {todayCount} {t('today').toLowerCase()}</small></div>
      </div>
      <button class="language" onclick={() => { profile.language = profile.language === 'uk' ? 'en' : 'uk'; repository.saveProfile(profile); }}>
        {profile.language === 'uk' ? 'EN' : 'UA'}
      </button>
    </header>

    <main>
      {#if activeTab === 'new'}
        <section class="panel entry-panel">
          <div class="section-heading">
            <div><span class="eyebrow">UTC {displayTime(draft.timeOn)}</span><h1>{editing ? t('updateQso') : t('newQso')}</h1></div>
            {#if editing}<button class="text-button" onclick={cancelEdit}>{t('cancel')}</button>{/if}
          </div>

          <label class="call-field">
            <span>{t('call')}</span>
            <input bind:value={draft.call} oninput={() => draft.call = draft.call.toUpperCase()} placeholder={t('callHint')} autocomplete="off" autocapitalize="characters" />
          </label>

          <fieldset>
            <legend>{t('band')} · {t('quickPick')}</legend>
            <div class="chips">
              {#each quickBands as band}<button class:active={draft.band === band} onclick={() => chooseBand(band)}>{band}</button>{/each}
            </div>
            <select bind:value={draft.band} aria-label={t('band')}>{#each BANDS as band}<option value={band}>{band}</option>{/each}</select>
          </fieldset>

          <fieldset>
            <legend>{t('mode')} · {t('quickPick')}</legend>
            <div class="chips">
              {#each quickModes as mode}<button class:active={draft.mode === mode} onclick={() => chooseMode(mode)}>{mode}</button>{/each}
            </div>
            <select bind:value={draft.mode} onchange={() => chooseMode(draft.mode)} aria-label={t('mode')}>{#each MODES as mode}<option value={mode}>{mode}</option>{/each}</select>
          </fieldset>

          <div class="field-grid two">
            <label><span>{t('rstSent')}</span><input bind:value={draft.rstSent} inputmode="text" /></label>
            <label><span>{t('rstRcvd')}</span><input bind:value={draft.rstRcvd} inputmode="text" /></label>
          </div>

          <button class="advanced-toggle" onclick={() => showAdvanced = !showAdvanced} aria-expanded={showAdvanced}>
            <span>{t('optional')}</span><span>{showAdvanced ? '−' : '+'}</span>
          </button>

          {#if showAdvanced}
            <div class="advanced-fields">
              <div class="field-grid two">
                <label><span>{t('utcDate')}</span><input bind:value={draft.qsoDate} inputmode="numeric" maxlength="8" /></label>
                <label><span>{t('utcTime')}</span><input bind:value={draft.timeOn} inputmode="numeric" maxlength="6" /></label>
                <label><span>{t('frequency')}</span><input bind:value={draft.frequency} inputmode="decimal" placeholder="14.200" /></label>
                <label><span>{t('power')}</span><input bind:value={draft.txPower} inputmode="decimal" /></label>
                <label><span>{t('name')}</span><input bind:value={draft.name} /></label>
                <label><span>{t('qth')}</span><input bind:value={draft.qth} /></label>
                <label><span>{t('grid')}</span><input bind:value={draft.gridSquare} oninput={() => draft.gridSquare = draft.gridSquare.toUpperCase()} /></label>
              </div>
              <label><span>{t('comment')}</span><textarea bind:value={draft.comment} rows="3"></textarea></label>
            </div>
          {/if}

          <button class="primary-action" onclick={submitQso}>{editing ? t('updateQso') : t('saveQso')}</button>
        </section>
      {:else if activeTab === 'log'}
        <section class="panel log-panel">
          <div class="section-heading"><div><span class="eyebrow">ADIF 3.1.7</span><h1>{t('logbook')}</h1></div><strong class="count">{filteredRecords.length}</strong></div>
          <div class="toolbar">
            <input class="search" bind:value={searchQuery} type="search" placeholder={t('search')} />
            <button onclick={() => importInput.click()}>{t('importAdif')}</button>
            <button onclick={exportFile} disabled={records.length === 0}>{t('exportAdif')}</button>
            <input class="visually-hidden" bind:this={importInput} onchange={importFile} type="file" accept=".adi,.adif,.txt" />
          </div>
          <div class="qso-list">
            {#each filteredRecords as record (record.id)}
              <article class="qso-card">
                <div class="qso-main"><strong>{record.call}</strong><span>{record.band} · {record.mode}</span></div>
                <div class="qso-meta"><span>{displayDate(record.qsoDate)} · {displayTime(record.timeOn)} UTC</span>{#if record.qth}<span>{record.qth}</span>{/if}</div>
                <div class="qso-rst"><span>↑ {record.rstSent || '—'}</span><span>↓ {record.rstRcvd || '—'}</span></div>
                <div class="card-actions"><button onclick={() => editQso(record)}>{t('edit')}</button><button class="danger" onclick={() => removeQso(record.id)}>{t('remove')}</button></div>
              </article>
            {:else}
              <div class="empty-state"><span>◌</span><p>{t('noQso')}</p></div>
            {/each}
          </div>
        </section>
      {:else if activeTab === 'notes'}
        <section class="panel notes-panel">
          <div class="section-heading"><div><span class="eyebrow">Markdown + Mermaid</span><h1>{t('fieldNotes')}</h1></div><small>{t('autosaved')}</small></div>
          <p class="notes-hint">{t('notesHint')}</p>
          <div class="notes-workspace">
            <label class="note-editor"><span>Markdown</span><textarea bind:value={fieldNotes} oninput={scheduleNoteRender} placeholder={t('notePlaceholder')} spellcheck="true"></textarea></label>
            <section class="note-preview" aria-live="polite">
              <span class="preview-label">{t('preview')}</span>
              {#if renderedMarkdown}<div class="markdown-body">{@html renderedMarkdown}</div>{/if}
              {#if mermaidSvg}<div class="mermaid-preview">{@html mermaidSvg}</div>{/if}
              {#if noteRenderError}<p class="preview-error">{noteRenderError}</p>{/if}
              {#if !renderedMarkdown && !mermaidSvg && !noteRenderError}<div class="preview-empty">◇</div>{/if}
            </section>
          </div>
        </section>
      {:else}
        <section class="panel settings-panel">
          <div class="section-heading"><div><span class="eyebrow">ADIF</span><h1>{t('stationProfile')}</h1></div></div>
          <div class="settings-form">
            <label><span>{t('myCall')}</span><input bind:value={profile.callsign} oninput={() => profile.callsign = profile.callsign.toUpperCase()} /></label>
            <label><span>{t('operator')}</span><input bind:value={profile.operator} oninput={() => profile.operator = profile.operator.toUpperCase()} /></label>
            <label><span>{t('myGrid')}</span><input bind:value={profile.gridSquare} oninput={() => profile.gridSquare = profile.gridSquare.toUpperCase()} /></label>
            <div class="field-grid two">
              <label><span>{t('defaultBand')}</span><select bind:value={profile.defaultBand}>{#each BANDS as band}<option>{band}</option>{/each}</select></label>
              <label><span>{t('defaultMode')}</span><select bind:value={profile.defaultMode}>{#each MODES as mode}<option>{mode}</option>{/each}</select></label>
              <label><span>{t('defaultPower')}</span><input bind:value={profile.defaultPower} inputmode="decimal" /></label>
              <label><span>{t('language')}</span><select bind:value={profile.language}><option value="uk">{t('ukrainian')}</option><option value="en">{t('english')}</option></select></label>
            </div>
            <button class="primary-action" onclick={saveProfile}>{t('saveProfile')}</button>
          </div>
        </section>
      {/if}
    </main>

    <nav class="bottom-nav" aria-label="Primary navigation">
      <button class:active={activeTab === 'new'} onclick={() => activeTab = 'new'}><span>＋</span>{t('newQso')}</button>
      <button class:active={activeTab === 'log'} onclick={() => activeTab = 'log'}><span>☷</span>{t('logbook')}</button>
      <button class:active={activeTab === 'notes'} onclick={openNotes}><span>◇</span>{t('notes')}</button>
      <button class:active={activeTab === 'settings'} onclick={() => activeTab = 'settings'}><span>⚙</span>{t('settings')}</button>
    </nav>
    {#if toast}<div class="toast" role="status">{toast}</div>{/if}
  </div>
{/if}

<style>
  :global(:root) { --navy: #0f172a; --indigo-deep: #1e1b4b; --panel: #172033; --panel-raised: #1e293b; --border: #475569; --cyan: #38bdf8; --indigo: #818cf8; --violet: #c084fc; --text: #f8fafc; --muted: #94a3b8; --brand-gradient: linear-gradient(90deg, var(--cyan), var(--indigo), var(--violet)); }
  :global(*) { box-sizing: border-box; }
  :global(html) { background: #0b1022; }
  :global(body) { margin: 0; color: var(--text); background-color: #0b1022; background-image: linear-gradient(#ffffff0a 1px, transparent 1px), linear-gradient(90deg, #ffffff0a 1px, transparent 1px), radial-gradient(circle at 18% -8%, #263b72 0, var(--navy) 32%, #0b1022 72%); background-size: 50px 50px, 50px 50px, auto; background-attachment: fixed; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; min-width: 320px; }
  :global(button), :global(input), :global(select), :global(textarea) { font: inherit; }
  :global(button) { -webkit-tap-highlight-color: transparent; }
  .app-shell { width: min(100%, 1080px); min-height: 100dvh; margin: 0 auto; padding-bottom: 92px; }
  .topbar { height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #47556966; background: #0f172ae8; backdrop-filter: blur(16px); position: sticky; top: 0; z-index: 10; }
  .brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .brand-mark { display: block; width: 44px; height: 44px; border-radius: 13px; box-shadow: 0 8px 28px #818cf840; }
  .brand div { display: flex; flex-direction: column; min-width: 0; }
  .brand strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .brand small { color: var(--muted); margin-top: 2px; }
  .language, .text-button { border: 1px solid #47556999; background: #1e293b99; color: #cbd5e1; border-radius: 10px; padding: 9px 11px; cursor: pointer; }
  main { padding: 18px; }
  .panel { max-width: 780px; margin: 0 auto; }
  .section-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  h1 { margin: 2px 0 0; font-size: clamp(26px, 6vw, 38px); letter-spacing: -1.2px; }
  .eyebrow { color: var(--cyan); text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1.6px; }
  label { display: flex; flex-direction: column; gap: 7px; color: #cbd5e1; font-size: 13px; font-weight: 650; }
  input, select, textarea { width: 100%; border: 1px solid #47556999; background: #172033e8; color: var(--text); border-radius: 12px; padding: 12px 13px; outline: none; }
  input:focus, select:focus, textarea:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px #38bdf824; }
  .call-field input { padding: 15px 16px; font: 800 clamp(26px, 8vw, 42px)/1 monospace; letter-spacing: 2px; text-transform: uppercase; }
  fieldset { border: 0; padding: 0; margin: 22px 0 0; }
  legend { color: #cbd5e1; font-size: 13px; font-weight: 650; margin-bottom: 9px; }
  fieldset select { margin-top: 9px; }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(62px, 1fr)); gap: 7px; }
  .chips button { min-height: 44px; border: 1px solid #47556999; border-radius: 11px; background: #172033d9; color: #cbd5e1; cursor: pointer; font-weight: 750; }
  .chips button.active { color: #fff; background: linear-gradient(135deg, #2563eb, #7c3aed); border-color: var(--indigo); box-shadow: 0 7px 22px #818cf838; }
  .field-grid { display: grid; gap: 12px; margin-top: 18px; }
  .field-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .advanced-toggle { display: flex; justify-content: space-between; width: 100%; margin: 20px 0 0; padding: 13px 4px; border: 0; border-top: 1px solid #47556955; border-bottom: 1px solid #47556955; background: transparent; color: #cbd5e1; cursor: pointer; }
  .advanced-fields { display: grid; gap: 14px; animation: reveal .18s ease-out; }
  .primary-action { width: 100%; min-height: 54px; margin-top: 22px; border: 0; border-radius: 14px; background: var(--brand-gradient); color: #fff; font-weight: 900; cursor: pointer; box-shadow: 0 12px 34px #818cf83d; }
  .toolbar { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; margin-bottom: 16px; }
  .toolbar button, .card-actions button { border: 1px solid #47556999; border-radius: 10px; background: var(--panel-raised); color: #dbeafe; padding: 10px 12px; cursor: pointer; }
  .toolbar button:disabled { opacity: .4; }
  .search { grid-column: 1 / -1; }
  .count { display: grid; place-items: center; min-width: 46px; height: 38px; border-radius: 12px; color: var(--cyan); background: #38bdf817; }
  .qso-list { display: grid; gap: 10px; }
  .qso-card { display: grid; grid-template-columns: minmax(110px, 1.1fr) minmax(150px, 1fr) auto; gap: 12px; align-items: center; padding: 15px; border: 1px solid #47556966; border-radius: 15px; background: #172033e6; box-shadow: 0 8px 30px #0000002e; }
  .qso-main, .qso-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .qso-main strong { color: var(--text); font: 900 21px/1 monospace; }
  .qso-main span, .qso-meta span { color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .qso-rst { display: flex; gap: 6px; color: var(--cyan); font: 700 12px monospace; }
  .card-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 7px; border-top: 1px solid #ffffff0d; padding-top: 10px; }
  .card-actions .danger { color: #ff948c; }
  .empty-state { text-align: center; color: var(--muted); padding: 70px 20px; }
  .empty-state span { display: block; color: var(--indigo); font-size: 52px; }
  .settings-form { display: grid; gap: 15px; }
  .notes-panel .section-heading small { color: var(--muted); }
  .notes-hint { color: var(--muted); margin: -8px 0 18px; line-height: 1.5; }
  .notes-workspace { display: grid; gap: 14px; }
  .note-editor textarea { min-height: 270px; resize: vertical; font-family: 'Cascadia Code', Consolas, monospace; line-height: 1.55; }
  .note-preview { min-height: 270px; overflow: auto; padding: 18px; border: 1px solid #47556966; border-radius: 14px; background: #172033e6; }
  .preview-label { display: block; margin-bottom: 14px; color: var(--cyan); text-transform: uppercase; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; }
  .preview-empty { display: grid; place-items: center; min-height: 190px; color: #475569; font-size: 48px; }
  .preview-error { color: #ff948c; }
  .mermaid-preview { margin-top: 18px; padding-top: 18px; border-top: 1px solid #ffffff12; overflow-x: auto; }
  :global(.markdown-body h1), :global(.markdown-body h2), :global(.markdown-body h3) { color: var(--text); margin: 1em 0 .45em; }
  :global(.markdown-body h1:first-child) { margin-top: 0; }
  :global(.markdown-body p), :global(.markdown-body li) { color: #cbd5e1; line-height: 1.65; }
  :global(.markdown-body a) { color: var(--cyan); }
  :global(.markdown-body code) { padding: 2px 5px; border-radius: 5px; background: #0b1022; color: #a5b4fc; }
  :global(.markdown-body pre) { overflow: auto; padding: 13px; border-radius: 10px; background: #0b1022; }
  :global(.markdown-body table) { width: 100%; border-collapse: collapse; }
  :global(.markdown-body th), :global(.markdown-body td) { padding: 8px; border: 1px solid #ffffff1c; text-align: left; }
  .bottom-nav { position: fixed; z-index: 20; bottom: 0; left: 50%; transform: translateX(-50%); width: min(100%, 1080px); display: grid; grid-template-columns: repeat(4, 1fr); padding: 8px max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)); border-top: 1px solid #47556966; background: #0f172af2; backdrop-filter: blur(20px); }
  .bottom-nav button { display: flex; flex-direction: column; align-items: center; gap: 3px; border: 0; background: transparent; color: var(--muted); font-size: 10px; cursor: pointer; }
  .bottom-nav button span { font-size: 23px; line-height: 1; }
  .bottom-nav button.active { color: var(--cyan); }
  .toast { position: fixed; z-index: 30; left: 50%; bottom: 90px; transform: translateX(-50%); width: max-content; max-width: calc(100% - 32px); padding: 12px 17px; border: 1px solid #818cf880; border-radius: 12px; background: #1e1b4bf2; color: var(--text); box-shadow: 0 15px 40px #0008; animation: toast-in .2s ease-out; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
  @keyframes reveal { from { opacity: 0; transform: translateY(-5px); } }
  @keyframes toast-in { from { opacity: 0; transform: translate(-50%, 8px); } }
  @media (min-width: 760px) {
    .app-shell { padding: 0 0 30px 210px; }
    .topbar { margin-left: -210px; padding-left: 22px; }
    .bottom-nav { left: calc(50% - 435px); transform: none; top: 72px; bottom: 0; width: 210px; display: flex; flex-direction: column; padding: 20px 12px; border-top: 0; border-right: 1px solid #ffffff12; }
    .bottom-nav button { flex-direction: row; justify-content: flex-start; gap: 12px; padding: 12px; border-radius: 11px; font-size: 13px; }
    .bottom-nav button.active { background: linear-gradient(90deg, #38bdf814, #c084fc14); }
    main { padding: 32px; }
    .notes-workspace { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 540px) {
    .field-grid.two { grid-template-columns: 1fr 1fr; }
    .qso-card { grid-template-columns: 1fr auto; }
    .qso-meta { grid-column: 1; }
    .qso-rst { grid-column: 2; grid-row: 1 / 3; flex-direction: column; }
    .toolbar { grid-template-columns: 1fr 1fr; }
    .toolbar button { padding: 10px 7px; font-size: 12px; }
  }
</style>
