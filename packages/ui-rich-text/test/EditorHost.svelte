<script lang="ts">
  import type {Editor} from '@tiptap/core';
  import type {RichTextCollaboration} from '../src/lib/collaboration';
  import {untrack} from 'svelte';
  import {createRichTextCollaboration} from '../src/lib/collaboration.js';
  import RichTextEditor from '../src/lib/RichTextEditor.svelte';
  import RichTextToolbar from '../src/lib/RichTextToolbar.svelte';
  let {initial = '<p>Hello</p>', collaboration = null, capture, onChange = (_: string) => {}}:
    {initial?: string; collaboration?: RichTextCollaboration | null; capture: {editor: Editor | null}; onChange?: (html: string) => void} = $props();
  let html = $state(untrack(() => initial));
  let editor = $state<Editor | null>(null);
  let readOnly = $state(false);
  const extension = $derived(collaboration ? createRichTextCollaboration(collaboration) : null);
  $effect(() => { capture.editor = editor; });
</script>
<RichTextToolbar {editor} disabled={readOnly}/>
<RichTextEditor bind:html bind:editor {readOnly} collaboration={extension} onHtmlChange={onChange}/>
<output aria-label="HTML">{html}</output>
<button onclick={() => {html = '<p>External source</p>';}}>External HTML</button>
<button onclick={() => {readOnly = !readOnly;}}>Toggle readonly</button>
