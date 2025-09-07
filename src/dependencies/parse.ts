import fs from 'node:fs/promises'

import { isENOENT } from '#/fsutils.js'

import { getDependenciesPath } from './canonical.js'

export const parseDependenciesContent = (
	content: string,
): Map<string, string> => {
	const entries = new Map<string, string>()
	const lines = content
		.trim()
		.split('\n')
		.map($ => $.trim())
		.filter($ => /\S+/.test($))

	for (const line of lines) {
		const [hash, filename] = line.split(' ')
		if (!hash || !filename) {
			console.warn(`Malformed dependency entry: '${line}'`)
			continue
		}

		entries.set(filename, hash)
	}

	return entries
}

export const getLeechDependencies = async (
	leechDirectory: string,
): Promise<Map<string, string> | undefined> => {
	const dependenciesPath = getDependenciesPath(leechDirectory)

	try {
		const content = await fs.readFile(dependenciesPath, 'utf8')
		return parseDependenciesContent(content)
	} catch (error: unknown) {
		if (isENOENT(error)) return

		throw error
	}
}
