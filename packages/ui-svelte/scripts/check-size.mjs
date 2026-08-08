import {readFile, readdir} from 'node:fs/promises'
import {brotliCompressSync} from 'node:zlib'

const dist = new URL('../dist/', import.meta.url)
const files = (await readdir(dist)).filter((file) => file.endsWith('.svelte'))
const bytes = (await Promise.all(files.map(async(file) =>
	brotliCompressSync(await readFile(new URL(file, dist))).byteLength
))).reduce((total, size) => total + size, 0)
const limit = 30 * 1024

if (bytes > limit) {
	throw new Error(`Svelte component size ${bytes} B exceeds ${limit} B.`)
}

process.stdout.write(`Svelte component size: ${bytes} B brotli (${files.length} files).\n`)
