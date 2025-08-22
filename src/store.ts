import fs from 'node:fs/promises'
import path from 'node:path'

import { getCanonicalPath } from './canonical-path.js'
import { deduplicate } from './deduplicate.js'
import { isENOENT } from './fsutils.js'
import { registerDependency } from './register-dependency.js'

/**
 * Stores a file in a canonical location, deduplicates it, and registers its dependencies.
 * @param {string} filePath The path to the original file to be stored.
 * @param {string} repoRootPath The root directory of the repository.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function store(
	filePath: string,
	repoRootPath: string,
): Promise<void> {
	// Hardcoded algorithm for canonical path generation for now
	const hashName = 'sha256'

	// 1. Define all necessary paths.
	const lookupDirectory = path.join(repoRootPath, 'lookup', hashName)
	// eslint-disable-next-line unicorn/prevent-abbreviations
	const dependenciesDir = path.join(path.dirname(filePath), '.unirepo')
	const dependenciesPath = path.join(dependenciesDir, 'dependencies.txt')
	const leechesPath = path.join(repoRootPath, 'leeches.txt')

	// 2. Generate the canonical path based on the file's content hash.
	const canonicalPath = await getCanonicalPath(
		filePath,
		hashName,
		lookupDirectory,
	)

	try {
		// 3. Ensure all necessary directories exist.
		// The directory for the canonical file itself.
		await fs.mkdir(path.dirname(canonicalPath), { recursive: true })
		// The directory for the .unirepo folder and its dependencies file.
		await fs.mkdir(dependenciesDir, { recursive: true })

		// 4. Deduplicate the file.
		// If the canonical file already exists, it will be skipped.
		await deduplicate(filePath, canonicalPath)
		console.log(`Deduplicated '${filePath}' to canonical path.`)

		// 5. Register the file dependency.
		await registerDependency(filePath, hashName, dependenciesPath)
		console.log(`Registered dependency in '${dependenciesPath}'.`)

		// 6. Register the directory of the original file as a leech.
		const parentDirectory = path.resolve(path.dirname(filePath))
		const leechEntry = `${parentDirectory}\n`

		// Read the current leeches file content.
		let leechesContent = ''
		try {
			leechesContent = await fs.readFile(leechesPath, 'utf8')
		} catch (readError: unknown) {
			if (isENOENT(readError)) {
				throw readError
			}
			// If the file doesn't exist, we'll proceed with an empty content.
		}

		// Check if the leech entry already exists.
		if (leechesContent.includes(leechEntry)) {
			console.log(
				`Leech directory '${parentDirectory}' already registered.`,
			)
		} else {
			await fs.appendFile(leechesPath, leechEntry)
			console.log(`Registered leech directory '${parentDirectory}'.`)
		}
	} catch (error) {
		console.error(`Error storing file '${filePath}': ${String(error)}`)
		throw error
	}
}
