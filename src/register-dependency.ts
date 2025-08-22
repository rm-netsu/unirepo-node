import * as crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { isENOENT } from './fsutils.js'

/**
 * Registers a file dependency by appending its hash and basename to a dependencies file.
 * The entry is only added if it doesn't already exist.
 *
 * @param {string} filePath The path to the file to be registered.
 * @param {string} hashName The name of the hashing algorithm (e.g., 'sha256'). Defaults to 'sha256'.
 * @param {string} dependenciesPath The path to the dependencies text file.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function registerDependency(
	filePath: string,
	hashName: string = 'sha256',
	dependenciesPath: string,
): Promise<void> {
	const hash = crypto.createHash(hashName)
	const fileStream = createReadStream(filePath)

	await new Promise<void>((resolve, reject) => {
		fileStream.on('data', chunk => hash.update(chunk))
		fileStream.on('end', () => resolve())
		fileStream.on('error', error => reject(error))
	})

	const fileHash = hash.digest('hex')
	const basename = path.basename(filePath)
	const entry = `${fileHash} ${basename}\n`

	try {
		// 1. Read the dependencies file.
		let dependenciesContent = ''
		try {
			dependenciesContent = await fs.readFile(dependenciesPath, 'utf8')
		} catch (readError: unknown) {
			if (isENOENT(readError)) {
				throw readError
			}
			// If the file doesn't exist, we'll proceed with an empty content string.
		}

		// 2. Check if the entry already exists.
		if (dependenciesContent.includes(entry)) {
			console.log(
				`Dependency for '${basename}' with hash '${fileHash}' already registered.`,
			)
			return // Exit the function if the entry is a duplicate.
		}

		// 3. Append the new entry to the dependencies file.
		await fs.appendFile(dependenciesPath, entry)
		console.log(`Successfully registered dependency for '${basename}'.`)
	} catch (error) {
		console.error(
			`Error registering dependency for '${filePath}': ${String(error)}`,
		)
		throw error
	}
}
