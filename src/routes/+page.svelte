<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import mermaid from 'mermaid';
  import { marked } from 'marked';
  import { save, open } from '@tauri-apps/plugin-dialog';
  import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

  // Оновлені імпорти для CodeMirror 6
  import { basicSetup } from 'codemirror';
  import { EditorView } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { tags as t } from '@lezer/highlight';

  interface ParsedBlock {
    block_type: string;
    content: string;
    metadata?: string;
  }

  let code = `# Вітання у вашій мові

| Параметр | Значення |
| --- | --- |
| Частота | 14.200 МГц |
| Потужність | 100 Вт |

#graph[Antenna -> Bandpass_Filter -> LNA -> SDR]
#adif{CALL: "UT1AAA", BAND: "20M", MODE: "SSB", RST: "59"}`;

  let parsedBlocks: ParsedBlock[] = [];
  let editorContainer: HTMLDivElement;
  let editorView: EditorView;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose'
  });

  // Стилі підсвічування для базових елементів
  const myHighlightStyle = HighlightStyle.define([
    { tag: t.heading, color: '#569cd6', fontWeight: 'bold' },
    { tag: t.keyword, color: '#c586c0' },
    { tag: t.string, color: '#ce9178' },
    { tag: t.comment, color: '#6a9955' }
  ]);

  function initCodeMirror() {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        code = update.state.doc.toString();
        parseCode();
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        oneDark,
        syntaxHighlighting(myHighlightStyle),
        updateListener,
        EditorView.lineWrapping
      ]
    });

    editorView = new EditorView({
      state,
      parent: editorContainer
    });
  }

  async function parseCode() {
    try {
      parsedBlocks = await invoke('parse_custom_language', { code });
      await tick();
      renderMermaid();
    } catch (e) {
      console.error(e);
    }
  }

  async function renderMermaid() {
    const elements = document.querySelectorAll('.mermaid-diagram');
    elements.forEach(async (el, index) => {
      const graphDefinition = el.getAttribute('data-graph');
      if (graphDefinition) {
        try {
          const id = `mermaid-svg-${index}-${Date.now()}`;
          const { svg } = await mermaid.render(id, graphDefinition);
          el.innerHTML = svg;
        } catch (err) {
          el.innerHTML = `<span style="color:#f48771;">Помилка графу: ${err}</span>`;
        }
      }
    });
  }

  function parseAdifPairs(content: string) {
    return content.split(',').map(pair => {
      const [key, value] = pair.split(':');
      return {
        key: key ? key.trim() : '',
        value: value ? value.trim().replace(/^"|"$/g, '') : ''
      };
    });
  }

  function addTemplate(template: string) {
    if (!editorView) return;
    const transaction = editorView.state.update({
      changes: { from: editorView.state.doc.length, insert: `\n\n${template}` }
    });
    editorView.dispatch(transaction);
  }

  // Робота з файлами через Tauri dialog/fs плагіни
  async function handleOpenFile() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Custom Language', extensions: ['txt', 'dsl', 'md'] }]
      });
      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected);
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: content }
        });
      }
    } catch (err) {
      console.error('Помилка відкриття файлу:', err);
    }
  }

  async function handleSaveFile() {
    try {
      const filePath = await save({
        filters: [{ name: 'Custom Language', extensions: ['dsl', 'txt'] }]
      });
      if (filePath) {
        await writeTextFile(filePath, code);
        alert('Файл успішно збережено!');
      }
    } catch (err) {
      console.error('Помилка збереження файлу:', err);
    }
  }

  onMount(() => {
    initCodeMirror();
    parseCode();
    return () => editorView?.destroy();
  });
</script>

<div class="app-container">
  <!-- Панель файлів та шаблонів -->
  <aside class="sidebar">
    <h3>Файли</h3>
    <button class="btn-file" on:click={handleOpenFile}>📁 Відкрити</button>
    <button class="btn-file" on:click={handleSaveFile}>💾 Зберегти</button>

    <hr class="divider" />

    <h3>Шаблони</h3>
    <button on:click={() => addTemplate('#graph[NodeA -> NodeB]')}>+ Граф (#graph)</button>
    <button on:click={() => addTemplate('#adif{CALL: "US5DEF", BAND: "40M", MODE: "FT8", RST: "-10"}')}>+ Log (#adif)</button>
    <button on:click={() => addTemplate('# Новий розділ')}>+ Заголовок (#md)</button>
    <button on:click={() => addTemplate('| Стовпець 1 | Стовпець 2 |\n| --- | --- |\n| Значення 1 | Значення 2 |')}>+ Таблиця</button>
  </aside>

  <!-- Редактор коду -->
  <section class="editor-section">
    <h3>Код мови</h3>
    <div class="codemirror-wrapper" bind:this={editorContainer}></div>
  </section>

  <!-- Прев'ю -->
  <section class="preview-section">
    <h3>Візуальне представлення</h3>
    <div class="preview-content">
      {#each parsedBlocks as block}
        {#if block.block_type === 'mermaid'}
          <div class="block graph-block">
            <span class="badge">Graph AST</span>
            <div class="mermaid-diagram" data-graph={block.content}></div>
          </div>
        {:else if block.block_type === 'adif'}
          <div class="block adif-block">
            <span class="badge">ADIF Record</span>
            <div class="adif-grid">
              {#each parseAdifPairs(block.content) as item}
                <div class="adif-field">
                  <span class="adif-label">{item.key}</span>
                  <span class="adif-val">{item.value}</span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="block text-block markdown-body">
            {@html marked.parse(block.content)}
          </div>
        {/if}
      {/each}
    </div>
  </section>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    background-color: #1e1e1e;
    color: #d4d4d4;
  }

  .app-container {
    display: flex;
    height: 100vh;
    box-sizing: border-box;
    padding: 10px;
    gap: 10px;
  }

  .sidebar {
    width: 180px;
    background-color: #252526;
    padding: 15px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .divider {
    border: none;
    border-top: 1px solid #3c3c3c;
    margin: 5px 0;
  }

  .sidebar button {
    background-color: #007acc;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
    font-size: 13px;
  }

  .sidebar button:hover {
    background-color: #005999;
  }

  .sidebar .btn-file {
    background-color: #3c3c3c;
  }

  .sidebar .btn-file:hover {
    background-color: #505050;
  }

  .editor-section, .preview-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #252526;
    padding: 15px;
    border-radius: 8px;
    overflow: hidden;
  }

  .codemirror-wrapper {
    flex: 1;
    overflow: auto;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
    background-color: #282c34;
  }

  :global(.cm-editor) {
    height: 100%;
    font-family: 'Consolas', 'Fira Code', monospace;
    font-size: 14px;
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .block {
    position: relative;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #3c3c3c;
  }

  .badge {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 10px;
    color: #888;
    background-color: #1e1e1e;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .graph-block {
    border-color: #264f78;
    background-color: #112233;
    padding-top: 25px;
  }

  .adif-block {
    border-color: #2e6930;
    background-color: #142915;
    padding-top: 25px;
  }

  .adif-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .adif-field {
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #2e6930;
  }

  .adif-label {
    font-size: 10px;
    color: #4ec9b0;
    font-weight: bold;
  }

  .adif-val {
    font-size: 14px;
    font-weight: bold;
    color: #dcdcaa;
  }

  .text-block {
    background-color: #1e1e1e;
  }

  /* Стилі для Markdown */
  :global(.markdown-body h1) {
    font-size: 1.5em;
    margin-top: 0;
    margin-bottom: 0.5em;
    color: #569cd6;
    border-bottom: 1px solid #3c3c3c;
    padding-bottom: 4px;
  }

  :global(.markdown-body h2) {
    font-size: 1.2em;
    color: #4ec9b0;
  }

  :global(.markdown-body p) {
    margin: 0.4em 0;
  }

  :global(.markdown-body table) {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
  }

  :global(.markdown-body th), :global(.markdown-body td) {
    border: 1px solid #3c3c3c;
    padding: 6px 12px;
    text-align: left;
  }

  :global(.markdown-body th) {
    background-color: #2d2d2d;
    color: #4ec9b0;
  }

  :global(.markdown-body tr:nth-child(even)) {
    background-color: #252526;
  }

  h3 {
    margin-top: 0;
    font-size: 16px;
    color: #ffffff;
  }
</style>