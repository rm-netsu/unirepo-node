import * as path from 'path'
import { promises as fs } from 'fs'
import { deduplicate } from './deduplicate.js'
import { getCanonicalPath } from './canonical-path.js'
import { registerDependency } from './register-dependency.js'

/**
 * Stores a file in a canonical location, deduplicates it, and registers its dependencies.
 * @param {string} filePath The path to the original file to be stored.
 * @param {string} repoRootPath The root directory of the repository.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function store(filePath: string, repoRootPath: string): Promise<void> {
	// Hardcoded algorithm for canonical path generation for now
	const hashName = 'sha256';

	// 1. Define all necessary paths.
	const lookupDir = path.join(repoRootPath, 'lookup', hashName);
	const dependenciesDir = path.join(path.dirname(filePath), '.unirepo');
	const dependenciesPath = path.join(dependenciesDir, 'dependencies.txt');
	const leechesPath = path.join(repoRootPath, 'leeches.txt');

	// 2. Generate the canonical path based on the file's content hash.
	const canonicalPath = await getCanonicalPath(filePath, hashName, lookupDir);

	try {
		// 3. Ensure all necessary directories exist.
		// The directory for the canonical file itself.
		await fs.mkdir(path.dirname(canonicalPath), { recursive: true });
		// The directory for the .unirepo folder and its dependencies file.
		await fs.mkdir(dependenciesDir, { recursive: true });

		// 4. Deduplicate the file.
		// If the canonical file already exists, it will be skipped.
		await deduplicate(filePath, canonicalPath);
		console.log(`Deduplicated '${filePath}' to canonical path.`);

		// 5. Register the file dependency.
		await registerDependency(filePath, hashName, dependenciesPath);
		console.log(`Registered dependency in '${dependenciesPath}'.`);
		
		// 6. Register the directory of the original file as a leech.
		const parentDir = path.resolve(path.dirname(filePath));
		const leechEntry = `${parentDir}\n`;
		
		// Read the current leeches file content.
		let leechesContent = '';
		try {
			leechesContent = await fs.readFile(leechesPath, 'utf-8');
		} catch (readError: any) {
			if (readError.code !== 'ENOENT') {
				throw readError;
			}
			// If the file doesn't exist, we'll proceed with an empty content.
		}

		// Check if the leech entry already exists.
		if (!leechesContent.includes(leechEntry)) {
			await fs.appendFile(leechesPath, leechEntry);
			console.log(`Registered leech directory '${parentDir}'.`);
		} else {
			console.log(`Leech directory '${parentDir}' already registered.`);
		}
	} catch (error) {
		console.error(`Error storing file '${filePath}': ${error}`);
		throw error;
	}
}
