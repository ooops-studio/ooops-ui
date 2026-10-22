import {readFile, writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'

// Browser dependencies use Ubuntu's signed archives. Avoid the Azure mirror,
// whose very slow package responses can hold hosted runners for many minutes.
export async function configureUbuntuMirror(files) {
	const changed = []
	for (const file of files) {
		let source
		try {source = await readFile(file, 'utf8')} catch(error) {
			if (error.code === 'ENOENT') continue
			throw error
		}
		const next = source.replace(/(^|\s)https?:\/\/azure\.archive\.ubuntu\.com\/ubuntu(?=\/|\s|$)/gmu,
			'$1https://archive.ubuntu.com/ubuntu')
		if (next === source) continue
		await writeFile(file, next)
		changed.push(file)
	}
	return changed
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
	const changed = await configureUbuntuMirror([
		'/etc/apt/sources.list', '/etc/apt/sources.list.d/ubuntu.sources',
		'/etc/apt/apt-mirrors.txt', '/etc/apt/apt-mirrors-security.txt'
	])
	for (const file of changed) console.log(`Using canonical Ubuntu archive in ${file}`)
}
