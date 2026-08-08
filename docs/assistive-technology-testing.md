# Assistive Technology Release Testing

Automated ARIA, axe and keyboard checks do not prove that a screen reader presents a control coherently. Before a public release that changes interaction or semantics, run the scenarios in `tests/assistive-technology/matrix.json` with:

- VoiceOver and Safari on the current supported macOS release.
- NVDA and Firefox on supported Windows.
- NVDA and Chrome on supported Windows.

## Preparation

1. Run `pnpm test:e2e:prepare` and start the Astro and Svelte fixture previews using the commands from `playwright.config.ts`.
2. Test both adapter applications with default styling and keyboard-only input.
3. Keep screen-reader verbosity at its normal default. Record any non-default setting.
4. Use the built package exports. Do not test source-only demos.

## Evidence

Create one JSON evidence file per environment outside the published package artifacts. Record the environment ID, tester, date, app and AT versions, commit, every scenario result, and concise notes. Allowed results are `pass`, `fail`, `blocked`, and `not-run`.

A release is AT-verified only when all three required environments have current evidence and every scenario passes. `pnpm check:at-protocol` validates the protocol's completeness; it intentionally does not claim that a human screen-reader run occurred.

When a failure is found, preserve the smallest reproducible component state, the exact spoken output, expected output, key sequence and focus location. Add an automated semantic or keyboard regression test where possible, but keep the manual AT case because announcements can differ from the accessibility tree.
