<script lang="ts">
  import {onMount} from 'svelte';
  import type {Editor, AnyExtension} from '@tiptap/core';
  import * as Y from 'yjs';
  import {RichTextEditor, RichTextToolbar} from '@ooopsstudio/ui-rich-text';
  import {createRichTextCollaboration} from '@ooopsstudio/ui-rich-text/collaboration';
  let html = $state('<p>Standalone rich text</p>');
  let editor = $state.raw<Editor | null>(null);
  let collaboration = $state.raw<AnyExtension | null>(null);
  let ready = $state(false), online = $state(false), mode = $state('standalone');
  let channel: BroadcastChannel | null = null;
  let document: Y.Doc | null = null;
  let room = '', storageKey = '';
  const clientId = crypto.randomUUID();
  const remoteOrigin = {};
  const publish = (kind: 'sync' | 'state', update?: Uint8Array) => channel?.postMessage({kind, sender: clientId, ...(update ? {update: Array.from(update)} : {})});
  const disconnect = () => {channel?.close(); channel = null; online = false;};
  const connect = () => {
    if (!document || channel) return;
    channel = new BroadcastChannel(room); online = true;
    channel.onmessage = event => {
      if (!document || event.data.sender === clientId) return;
      if (event.data.kind === 'sync') publish('state', Y.encodeStateAsUpdate(document));
      if (event.data.kind === 'state') Y.applyUpdate(document, Uint8Array.from(event.data.update), remoteOrigin);
    };
    publish('sync'); publish('state', Y.encodeStateAsUpdate(document));
  };
  onMount(() => {
    const query = new URL(location.href).searchParams;
    mode = query.get('mode') ?? 'standalone';
    if (mode === 'collaborative') {
      room = `ui-rich-text:${query.get('room') ?? 'test'}`;
      storageKey = `${room}:${query.get('user') ?? 'alice'}`;
      document = new Y.Doc();
      const retained = localStorage.getItem(storageKey);
      if (retained) Y.applyUpdate(document, Uint8Array.from(JSON.parse(retained)), remoteOrigin);
      document.on('update', (update: Uint8Array, origin: unknown) => {
        if (!document) return;
        localStorage.setItem(storageKey, JSON.stringify(Array.from(Y.encodeStateAsUpdate(document))));
        if (origin !== remoteOrigin) publish('state', update);
      });
      collaboration = createRichTextCollaboration({document}); connect();
    }
    ready = true;
    return () => {disconnect(); document?.destroy(); document = null;};
  });
</script>
<svelte:head><title>Rich text contract</title><link rel="icon" href="data:,"/></svelte:head>
<section aria-label="Rich text contract">
  <h1>Rich text contract</h1>
  {#if ready}
    <RichTextToolbar {editor} class="toolbar" buttonClass="tool"/>
    <RichTextEditor bind:html bind:editor {collaboration} ariaLabel="Description"
      rootClass="editor" contentClass="content" surfaceClass="surface"/>
    <p role="status">{editor ? 'Editor ready' : 'Loading'}</p>
    {#if mode === 'collaborative'}
      <p aria-label="Transport">{online ? 'Online' : 'Offline'}</p>
      <button onclick={disconnect} disabled={!online}>Disconnect</button>
      <button onclick={connect} disabled={online}>Reconnect</button>
    {/if}
  {/if}
</section>
<style>
  section{max-width:720px;margin:auto;padding:24px;font-family:system-ui}
  :global(.toolbar){display:flex;flex-wrap:wrap;gap:6px}
  :global(.tool){padding:8px;border:1px solid #aaa;border-radius:6px;background:white;color:#222}
  :global(.tool.is-active){background:#e4eaff}
  :global(.editor){margin-top:12px;border:1px solid #aaa;border-radius:8px}
  :global(.content){min-height:160px;padding:16px;outline-offset:3px;overflow-wrap:anywhere}
</style>
