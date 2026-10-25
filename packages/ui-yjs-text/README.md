# @ooopsstudio/ui-yjs-text

Experimental, optional, framework-neutral native text collaboration. No CSS or framework adapter is required. The standard Ooops UI packages do not import or depend on this package or Yjs.

## Install

```sh
pnpm add @ooopsstudio/ui-yjs-text yjs
```

Install this package only for collaborative controls. Plain Input/Textarea controls keep their standalone behavior and do not require Yjs. Importing the binding module is SSR-safe; call a binding only after its DOM element exists.

## Native controls

```ts
import * as Y from 'yjs'
import {bindCollaborativeTextInput} from '@ooopsstudio/ui-yjs-text'

const document = new Y.Doc()
const text = document.getText('title')
const binding = bindCollaborativeTextInput(inputOrTextarea, text)
// On view teardown, before destroying the host document:
binding.destroy()
```

`bindCollaborativeTextEditable(element, text, options)` supports plain inline contenteditable labels. Rich text continues to use `@ooopsstudio/ui-rich-text` and Tiptap.

Bindings preserve Yjs item identity with minimal UTF-16 replacements, map focused selections through remote changes, merge IME composition from its starting branch, and route Ctrl/Meta+Z (and redo) to local-origin undo. Non-selectable input types still synchronize their value without attempting unsupported selection APIs.

## Host-owned undo and documents

Each default binding owns its undo manager and exposes `undo` and `origin`. For a shared host session, pass `{origin, undo}` where the host undo manager already tracks that origin. External undo managers and documents are never destroyed by a binding. `destroy()` is idempotent and removes all DOM and Yjs observers, including composition resources.

Use a root `Y.Text` attached to its document. Nested Y.Text values are rejected. Reconnect, persistence, authorization, sessions, durable recovery, synchronization providers and autosave acknowledgements remain host responsibilities. Reconnect applies Yjs updates to the same document; switching documents requires destroying the old binding and creating a new one.

## Styling

The binding does not add markup, classes, styles, attributes or layout. Style the host input, textarea or editable element normally. Set readOnly/disabled and accessible names on the native control. No state is submitted to a server by this module.
