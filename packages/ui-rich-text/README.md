# @ooopsstudio/ui-rich-text

Tiptap editor and toolbar helpers extracted from Ooops Workspace. Supports standalone
HTML editing and optional Yjs collaboration. Styling and application integrations
belong to the consuming application. MIT license.

## Installation

```sh
pnpm add @ooopsstudio/ui-rich-text @tiptap/core @tiptap/pm @tiptap/starter-kit svelte
# Only for collaborative editing:
pnpm add @tiptap/extension-collaboration yjs
```

## Standalone usage

```svelte
<script>
  import {RichTextEditor, RichTextToolbar} from '@ooopsstudio/ui-rich-text';
  let html = $state('<p>Hello</p>');
  let editor = $state(null);
</script>
<RichTextToolbar {editor} class="my-toolbar" buttonClass="my-button" />
<RichTextEditor bind:html bind:editor ariaLabel="Description"
  rootClass="my-editor" surfaceClass="my-surface" contentClass="my-content" />
```

Without `collaboration` or a Collaboration extension, the editor uses regular Tiptap
history. External HTML updates are applied silently. Imported HTML normalization
does not emit a user edit or trigger autosave. `readOnly` toggles do not edit content.

## Yjs usage

```svelte
<script>
  import {RichTextEditor} from '@ooopsstudio/ui-rich-text';
  import {createRichTextCollaboration} from '@ooopsstudio/ui-rich-text/collaboration';
  // The application supplies its connected, authorized Y.Doc.
  let {document, undoManager} = $props();
  const collaboration = $derived(createRichTextCollaboration({document, undoManager, field: 'content'}));
</script>
<RichTextEditor {collaboration} ariaLabel="Shared description" />
```

The host owns the Y.Doc, transport/provider, authentication, awareness/presence,
durable recovery, synchronization acknowledgements and document lifetime. Each user
has a separate local document and undo manager; remote updates must use an origin
outside that manager's tracked local origins. Unmounting the editor destroys its
Tiptap view, never the host's document or undo manager.

In this mode Yjs owns the content. Passing or changing `html` cannot overwrite it.
The default StarterKit disables its ordinary history when `collaboration` is supplied.
Applications supplying custom `extensions` must disable StarterKit's `undoRedo`
themselves when using Collaboration. For existing integrations, the editor also
recognizes an externally supplied Tiptap extension named `collaboration`.

`createRichTextCollaboration` is available from the optional `/collaboration` entry.
It is not re-exported from the root, so standalone imports do not load Yjs or
Tiptap Collaboration. Lazy extension initialization is canceled safely on unmount.

## Composition and styling

No product CSS is injected. Root/surface/content classes, root inline styles and
toolbar/button classes can be supplied by the host. The toolbar accepts a children
snippet receiving `RichTextToolbarState` for a fully custom presentation.
`readRichTextToolbarState` and `observeRichTextToolbar` support existing toolbars
without changing their DOM. Native formatting, link/table, selection, floating-menu,
slash-command and sanitization helpers are exposed through dedicated subpaths.

The `editor`, `html`, `text`, `surfaceEl` and `selectionRange` bindings expose the
actual editor state. Host paste callbacks, asset adapters and async extensions keep
network access and application-specific entities outside the library.

## Validation

Run `pnpm --filter @ooopsstudio/ui-rich-text test`, `typecheck`, `build` and `publint`.
The standalone and collaborative browser fixtures cover concurrent peers, offline
reconnect/recovery, local undo, formatting, lifecycle and visual compatibility.
