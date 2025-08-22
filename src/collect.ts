import fs from 'node:fs/promises'
import path from 'node:path'

import { isENOENT } from './fsutils.js'

/**
 * Scans all registered 'leech' directories and collects a list of all used canonical file hashes.
 *
 * @param {string} repoRootPath The root directory of the repository.
 * @returns {Promise<Set<string>>} A promise that resolves to a Set of used file hashes.
 */
export async function collectUsedHashes(
	repoRootPath: string,
): Promise<Set<string>> {
	const leechesPath = path.join(repoRootPath, 'leeches.txt')
	const usedHashes = new Set<string>()

	let leechesContent = ''
	try {
		leechesContent = await fs.readFile(leechesPath, 'utf8')
	} catch (error: unknown) {
		if (isENOENT(error)) {
			console.log(
				'No leeches file found. No dependencies will be collected.',
			)
			return usedHashes
		}
		throw error
	}

	const leeches = leechesContent.trim().split('\n').filter(Boolean)
	console.log(`Found ${leeches.length} registered 'leech' directories.`)

	for (const leechDirectory of leeches) {
		const dependenciesPath = path.join(
			leechDirectory,
			'.unirepo',
			'dependencies.txt',
		)
		try {
			const dependenciesContent = await fs.readFile(
				dependenciesPath,
				'utf8',
			)
			const lines = dependenciesContent.trim().split('\n').filter(Boolean)
			for (const line of lines) {
				const [hash] = line.split(' ')
				// eslint-disable-next-line max-depth
				if (hash) usedHashes.add(hash)
			}
		} catch (error: unknown) {
			if (isENOENT(error)) {
				console.log(
					`Dependencies file not found for '${leechDirectory}'. Skipping.`,
				)
			} else {
				console.warn(
					`Warning: Could not read dependencies for '${leechDirectory}':`,
					error,
				)
			}
		}
	}
	console.log(`Found ${usedHashes.size} used file hashes.`)
	return usedHashes
}
