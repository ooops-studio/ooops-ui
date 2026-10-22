<script lang="ts">
  import type {Editor} from '@tiptap/core';
  import type {Snippet} from 'svelte';
  import {Button} from '@ooopsstudio/ui-svelte';
  import {observeRichTextToolbar, readRichTextToolbarState, type RichTextToolbarState} from './toolbar-state.js';
  let {editor, disabled = false, class: className = '', style = '', buttonClass = '', activeClass = 'is-active',
    ariaLabel = 'Text formatting', children}: {editor: Editor | null; disabled?: boolean; class?: string; style?: string;
      buttonClass?: string; activeClass?: string; ariaLabel?: string; children?: Snippet<[RichTextToolbarState]>} = $props();
  let state = $state(readRichTextToolbarState(null));
  $effect(() => {
    if (!editor) { state = readRichTextToolbarState(null); return; }
    return observeRichTextToolbar(editor, next => { state = next; });
  });
  const commands = ['bold', 'italic', 'underline', 'strike', 'undo', 'redo'] as const;
  const labels = {bold: 'Bold', italic: 'Italic', underline: 'Underline', strike: 'Strikethrough', undo: 'Undo', redo: 'Redo'};
  const run = (command: typeof commands[number]) => {
    if (!editor || disabled || !editor.isEditable) return;
    const chain = editor.chain().focus();
    if (command === 'undo' || command === 'redo') chain[command]().run();
    else chain.toggleMark(command).run();
  };
</script>
<div role="toolbar" aria-label={ariaLabel} class={className} {style} data-part="rich-text-toolbar">
  {#if children}{@render children(state)}{:else}
    {#each commands as command}
      <Button type="button" class={[buttonClass, command in state && state[command as keyof RichTextToolbarState] === true ? activeClass : ''].filter(Boolean).join(' ')}
        disabled={disabled || !editor || !editor.isEditable || (command === 'undo' && !state.canUndo) || (command === 'redo' && !state.canRedo)}
        aria-pressed={command !== 'undo' && command !== 'redo' ? state[command] : undefined}
        onpointerdown={event => event.preventDefault()} onclick={() => run(command)}>{labels[command]}</Button>
    {/each}
  {/if}
</div>
