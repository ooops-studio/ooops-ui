<script lang="ts">
  import { untrack } from 'svelte';
  import { Editor } from '@tiptap/core';
  import type { AnyExtension } from '@tiptap/core';

  interface Props {
    html?: string;
    text?: string;
    editor?: Editor | null;
    selectionRange?: { from: number; to: number } | null;
    surfaceEl?: HTMLDivElement | null;
    extensions?: AnyExtension[] | (() => AnyExtension[] | Promise<AnyExtension[]>);
    collaboration?: AnyExtension | null;
    placeholder?: string;
    ariaLabel?: string;
    contentClass?: string;
    surfaceClass?: string;
    rootClass?: string;
    rootStyle?: string;
    readOnly?: boolean;
    editorId?: string | null;
    role?: string | null;
    ariaMultiline?: boolean;
    onStandaloneUrlPaste?: ((editor: Editor, url: string) => boolean | Promise<boolean>) | null;
    onPaste?: ((editor: Editor, event: ClipboardEvent) => boolean) | null;
    onHtmlChange?: ((next: string) => void) | null;
    htmlToText?: ((html: string, editorText: string) => string) | null;
  }

  let {
    html = $bindable(''),
    text = $bindable(''),
    editor = $bindable<Editor | null>(null),
    // eslint-disable-next-line no-useless-assignment
    selectionRange = $bindable<{ from: number; to: number } | null>(null),
    surfaceEl = $bindable<HTMLDivElement | null>(null),
    extensions,
    collaboration = null,
    ariaLabel = 'Rich text editor',
    contentClass = 'shared-rich-text-editor__content',
    surfaceClass = 'shared-rich-text-editor__surface',
    rootClass = 'shared-rich-text-editor',
    rootStyle = '',
    readOnly = false,
    editorId = null,
    role = 'textbox',
    ariaMultiline = true,
    onStandaloneUrlPaste = null,
    onPaste = null,
    onHtmlChange = null,
    htmlToText = null
  }: Props = $props();

  let syncingFromEditor = $state(false);
  let collaborativeEditor = $state.raw<Editor | null>(null);
  // Parent prop objects can invalidate on every HTML/readOnly update. Rebuild
  // the view only when the collaboration extension identity actually changes.
  const activeCollaboration = $derived(collaboration);

  const defaultHtmlToText = (value: string, editorText: string): string => {
    if (editorText) return editorText;
    if (typeof document === 'undefined') return value;
    const holder = document.createElement('div');
    holder.innerHTML = value;
    return holder.textContent || '';
  };

  const syncFromEditor = (options: { emitChange?: boolean } = {}) => {
    if (!editor) return;
    syncingFromEditor = true;
    const nextHtml = editor.getHTML();
    const changed = nextHtml !== html;
    const nextText = (htmlToText ?? defaultHtmlToText)(nextHtml, editor.getText({ blockSeparator: '\n\n' }));
    // TipTap canonicalizes imported HTML when it mounts. Preserve the bound
    // source document until an actual edit, so hydration cannot trigger autosave.
    if (changed && options.emitChange !== false) {
      html = nextHtml;
    }
    if (changed || nextText !== text) text = nextText;
    selectionRange = {
      from: editor.state.selection.from,
      to: editor.state.selection.to
    };
    if (changed && options.emitChange !== false) onHtmlChange?.(nextHtml);
    queueMicrotask(() => {
      syncingFromEditor = false;
    });
  };

  const syncSelectionFromEditor = () => {
    if (!editor) return;
    selectionRange = {
      from: editor.state.selection.from,
      to: editor.state.selection.to
    };
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (!editor) return false;
    if (onPaste) return onPaste(editor, event);
    if (!onStandaloneUrlPaste) return false;
    const textValue = event.clipboardData?.getData('text/plain')?.trim() || '';
    if (!textValue || !/^https?:\/\//i.test(textValue)) return false;
    const handled = onStandaloneUrlPaste(editor, textValue);
    if (handled instanceof Promise) {
      void handled;
      event.preventDefault();
      return true;
    }
    if (handled) event.preventDefault();
    return handled;
  };

  $effect(() => {
    const targetSurface = surfaceEl;
    const collaborationExtension = activeCollaboration;
    if (!targetSurface) return;
    let disposed = false;
    let createdEditor: Editor | null = null;

    const mountEditor = async () => {
      const options = untrack(() => ({
        extensions,
        contentClass,
        ariaLabel,
        editorId,
        role,
        ariaMultiline,
        readOnly
      }));
      let resolvedExtensions = typeof options.extensions === 'function' ? await options.extensions() : options.extensions;
      if (!resolvedExtensions) {
        const {default: StarterKit} = await import('@tiptap/starter-kit');
        resolvedExtensions = [StarterKit.configure({undoRedo: collaborationExtension ? false : {}})];
      }
      if (collaborationExtension) resolvedExtensions = [...resolvedExtensions, collaborationExtension];
      if (disposed) return;
      const attributes: Record<string, string> = {
        class: options.contentClass,
        'aria-label': options.ariaLabel
      };
      if (options.editorId) attributes['data-editor-id'] = options.editorId;
      if (options.role) attributes.role = options.role;
      if (options.ariaMultiline) attributes['aria-multiline'] = 'true';

      const nextEditor = new Editor({
        element: targetSurface,
        extensions: resolvedExtensions,
        // Recovery can complete while asynchronous extensions are loading.
        // Initialize with the current document, not the pre-load snapshot.
        ...(resolvedExtensions.some(extension => extension.name === 'collaboration') ? {} : {content: untrack(() => html) || '<p></p>'}),
        autofocus: false,
        editable: !options.readOnly,
        editorProps: {
          attributes,
          handlePaste: (_view, event) => handlePaste(event)
        },
        onCreate: () => syncFromEditor({ emitChange: false }),
        onUpdate: () => syncFromEditor(),
        onSelectionUpdate: () => syncSelectionFromEditor()
      });
      createdEditor = nextEditor;
      collaborativeEditor = resolvedExtensions.some(extension => extension.name === 'collaboration') ? nextEditor : null;
      editor = nextEditor;
    };

    void mountEditor();
    return () => {
      disposed = true;
      createdEditor?.destroy();
      untrack(() => {
        if (editor === createdEditor) editor = null;
        if (collaborativeEditor === createdEditor) collaborativeEditor = null;
      });
      createdEditor = null;
    };
  });

  $effect(() => {
    if (!editor) return;
    if (editor.isEditable === !readOnly) return;
    // Toggling availability is not a document edit. TipTap emits update by default.
    editor.setEditable(!readOnly, false);
  });

  $effect(() => {
    if (!editor || syncingFromEditor || editor === collaborativeEditor) return;
    const current = editor.getHTML();
    const next = html || '<p></p>';
    if (current === next) return;
    editor.commands.setContent(next, { emitUpdate: false });
    text = (htmlToText ?? defaultHtmlToText)(next, editor.getText({ blockSeparator: '\n\n' }));
  });
</script>

<div class={rootClass} class:is-read-only={readOnly} style={rootStyle}>
  <div bind:this={surfaceEl} class={surfaceClass}></div>
</div>
