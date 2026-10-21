# Calendar and Drawer consumer contracts

Applies to `ui-primitives@0.5.0`, `ui-svelte@0.4.0` and `ui-astro@0.4.0`.
The [release evidence index](audits/evidence/2026-10-22-release/README.md) separates published package checks, library fixtures and the earlier Workspace pilot.

## Values, form ownership and reset

| Contract | DatePicker | DateRange |
|---|---|---|
| Public value | ISO string or `''` | `{start: string, end: string}`; empty endpoints are `''` |
| Date mode | `YYYY-MM-DD` | Same format per endpoint |
| Datetime mode | Local `YYYY-MM-DDTHH:mm` | Same format per endpoint; each keeps its own time |
| Submitted names | Explicit `name`; omission means no named field | Explicit `startName`/`endName`, otherwise `${name}-start`/`${name}-end`; without these no named fields |
| External form | `form` identifies an existing form | Both endpoints belong to that form |
| Svelte notification | `bind:value`, `onChange(string)` | `bind:value`, `onChange(CalendarSelection)` |
| Astro notification | Bubbling native input/change and `ooops:date-change`, `detail.value` is a string | Same events; `detail.value` is the range object |

There is no implicit UTC conversion, offset or IANA time zone. Applications own conversion to an instant, including ambiguous/nonexistent local times around daylight-saving changes. `locale` formats calendar names; it does not translate the explicit label/help/error props.

`mode` defaults to `date`; `dateFormat` defaults to `native`. Without JavaScript, named native date/datetime inputs remain usable, with the platform's own presentation. That fallback enforces native constraints such as min/max/required; custom unavailable-date and cross-endpoint rules still require server/business validation when JavaScript is absent. With a formatted date (`DD-MM-YYYY`, `MM-DD-YYYY` or `YYYY-MM-DD`), enhancement uses text/time controls for editing and canonical hidden inputs for submission. `spacedSeparators` affects display only. Invalid drafts do not replace the last canonical value, but they block native submission. Do not read the hidden value alone as proof that the current draft is valid.

`min`/`max` constrain values; `isDateDisabled` (Svelte) and serializable `disabledDates` (Astro) restrict calendar dates. A range cannot cross an unavailable date; an incomplete range is invalid. `minYear`/`maxYear` bound the year navigation control, not the submitted date validation: use `min`/`max` for business bounds. Month and year controls share the top row between navigation buttons. `month-title` is visually hidden and remains the live/accessible calendar name.

`timeStepMinutes` defaults to 15. `defaultTime` supplies a deterministic initial time when choosing a date without an existing time; otherwise the current local time is rounded to the configured step. Explicit values and datetime bounds must satisfy the step contract. These are value constraints, not a booking/time-zone service.

Reset returns to the value captured at mount (Astro: the rendered value). A later external Svelte value update does not replace that baseline. Reset waits for native reset listeners, respects cancellation, restores display/time values and updates Svelte bindings without calling `onChange`. Astro reset is silent. Disabled controls are excluded from FormData; readonly controls remain submitted and cannot be changed through the calendar or clear action.

## Svelte: supported updates and remount policy

| Area | Supported live update | Recreate/remount when |
|---|---|---|
| Selection/model | `value`, `min`, `max`, `locale`, `firstDayOfWeek`, `dir`, `disabled`, `readOnly`, `isDateDisabled` configure the shared controller | Switching record or establishing a new reset baseline |
| Presentation | Labels/help/error copy, `required`, `clearable`, placeholder, year-navigation limits, `class`, `parts`, `monthParts`, icons/day snippets render from current props | Replacing stable IDs, external form owner or the identity used by labels/reset listeners |
| Format/time configuration | Current event handlers read current configuration; this is not a guarantee of seamless conversion of an existing draft | Use a keyed remount for changes to `mode`, `dateFormat`, `spacedSeparators`, `timeStepMinutes`, `defaultTime` or the initial `today` reference |
| Drawer | `open`, `busy`, title/description/labels, size, `side`, `class`, `parts`, body/footer snippets | Changing identity or controller dismissal flags (`closeOnEscape`, `closeOnBackdrop`) |

The format/time remount rule is a conservative consumer contract: markup reactivity alone does not migrate partial drafts, time values or the reset baseline. Close the calendar, resolve/save the draft and supply a value valid for the new configuration before remounting. Use an application record/configuration key; avoid regenerating it on each keystroke. External value synchronization does not represent a user edit and does not call the value callback.

Drawer delegates to Modal. `beforeClose`, `initialFocus` and `restoreFocusTo` are invoked through getters that read current props. `onClose` is captured when the controller mounts; keep its function identity stable and read current application state inside the callback, or remount to replace it. `side="start"|"end"` follows writing direction; top/bottom are physical edges. The shipped Drawer is modal; it does not expose a non-modal navigation rail API.

## Astro: server snapshots and DOM events

Astro props/configuration, slots and `parts` are rendered snapshots. Changing a DOM attribute or editing the serialized config after installation is not a supported reactive API. Rerender/reinstall through the documented lifecycle when switching identity, bounds, formatting, form ownership or layout configuration. Installers are idempotent and release listeners, controllers and owned layers on teardown/ClientRouter transitions.

For programmatic native input edits, use the named canonical control and its expected input event path; assigning `.value` alone does not synchronize the calendar model. Listen to `ooops:date-change` for application updates, using `detail.value` according to the table above. Mounting and reset do not emit a user change. Do not serialize Svelte callbacks into Astro props; unavailable dates use `disabledDates`.

Drawer takes Modal's `initialFocusId`, `restoreFocusId`, `busy`, dismissal flags and trigger/body/footer slots. Cancel the root's `ooops:before-close` event synchronously to veto dismissal; `detail.reason` identifies the attempt. `ooops:modal-close` reports accepted close. Busy state and close guards retain the shared Modal behavior. Product routing guards, persistence and async operations remain consumer responsibilities.

## Styling, content and Workspace preferences

- Supply `parts` for each owned element. Drawer forwards these to Modal; it does not add another styled surface. `class` stays on the root. The optional base stylesheet provides geometry through a low-priority cascade layer.
- Supply calendar month-menu styles separately via `monthParts`, using DropdownMenu part names. `parts.day` survives calendar rerenders; styling does not replace ARIA, disabled state or keyboard handlers.
- Svelte day snippets receive `CalendarDayContext`; icon snippets are `calendarIcon`, `previousIcon`, `nextIcon`, `clearIcon`, `closeIcon`. Astro uses corresponding kebab-case named slots and an inert `day` template; `data-calendar-day-number` receives the day number. Avoid duplicate IDs or interactive descendants inside day buttons.
- Map Workspace's saved date format to `dateFormat` (and `spacedSeparators` if needed); pass locale and translated labels explicitly. The library does not read Workspace cookies, store preferences or add Litepicker. Map product plain/default variants through classes/parts. Resolve preferences before mounting; use the remount policy if they change during editing.
- Keep server/business validation, autosave, timezone conversion, presence metadata and dirty-state navigation guards in Workspace wrappers. Shared behavior and these migration recipes do not prove that every Workspace caller has migrated.

See the [part reference](styling.md), [general consumer contracts](consumer-contracts.md), [Svelte adapter guide](../packages/ui-svelte/README.md) and [Astro adapter guide](../packages/ui-astro/README.md).

Source: [Svelte CalendarField](../packages/ui-svelte/src/lib/CalendarField.svelte), [calendar prop types](../packages/ui-svelte/src/lib/calendar-types.ts), [Svelte Modal](../packages/ui-svelte/src/lib/Modal.svelte), [Astro calendar runtime](../packages/ui-astro/src/runtime/calendar.ts) and [Astro Drawer](../packages/ui-astro/src/Drawer.astro). These document existing behavior; this documentation update changes no component implementation.
