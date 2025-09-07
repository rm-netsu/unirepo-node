import path from 'node:path'

import { getLeechDependencies } from '#/dependencies/parse.js'
import { readLeechesFile } from '#/leeches/parse.js'

const getHashesFromAllLeeches = async (
	leeches: string[],
): Promise<Set<string>> => {
	const allHashes = new Set<string>()

	for (const leechDirectory of leeches) {
		const entries = await getLeechDependencies(leechDirectory)
		if (!entries) continue

		for (const hash of entries.values()) allHashes.add(hash)
	}

	return allHashes
}

export const collectUsedHashes = async (
	repoRootPath: string,
): Promise<Set<string>> => {
	const leechesPath = path.join(repoRootPath, 'leeches.txt')

	const leeches = await readLeechesFile(leechesPath)
	if (!leeches) {
		console.log('No leeches file found. No dependencies will be collected.')
		return new Set()
	}
	console.log(`Found ${leeches.length} registered 'leech' directories.`)

	const usedHashes = await getHashesFromAllLeeches(leeches)
	console.log(`Found ${usedHashes.size} used file hashes.`)

	return usedHashes
}
