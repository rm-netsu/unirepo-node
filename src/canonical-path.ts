import * as crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import path from 'node:path'

/**
 * Calculates a content hash of a file and returns its canonical path.
 *
 * @param {string} filePath The path to the file.
 * @param {string} hashName The name of the hashing algorithm to use (e.g., 'sha256', 'md5'). Defaults to 'sha256'.
 * @param {string} repoRoot The root directory for the canonical paths.
 * @returns {Promise<string>} A promise that resolves to the canonical path string.
 */
export const getCanonicalPath = async (
	filePath: string,
	hashName: string = 'sha256',
	repoRoot: string,
): Promise<string> => {
	const hash = crypto.createHash(hashName)
	const fileStream = createReadStream(filePath)

	await new Promise<void>((resolve, reject) => {
		fileStream.on('data', chunk => hash.update(chunk))
		fileStream.on('end', () => resolve())
		fileStream.on('error', error => reject(error))
	})

	const fileHash = hash.digest('hex')
	const fileExtension = path.extname(filePath).slice(1) // Remove the leading dot

	const canonicalPath = path.join(
		repoRoot,
		fileExtension,
		fileHash.slice(0, 2),
		`${fileHash}.${fileExtension}`,
	)

	return canonicalPath
}
