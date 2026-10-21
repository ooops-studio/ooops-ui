import {copyFile, readdir, rm} from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const entries = await readdir(dist)

await Promise.all(
  entries
    .filter((entry) => entry.includes('.test.'))
    .map((entry) => rm(new URL(entry, dist), {force: true})),
)

// TypeScript's Node16 resolver looks for Component.d.svelte.ts when the
// declaration imports Component.svelte. Derive aliases from the emitted files
// so every new public component receives the same packaging support.
for (const entry of entries.filter((entry) => entry.endsWith('.svelte.d.ts'))) {
  const component = entry.slice(0, -'.svelte.d.ts'.length)
  await copyFile(
    new URL(`${component}.svelte.d.ts`, dist),
    new URL(`${component}.d.svelte.ts`, dist),
  )
}
