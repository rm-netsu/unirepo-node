import * as path from 'path'
import * as crypto from 'crypto'
import { createReadStream } from 'fs'

/**
 * Calculates a content hash of a file and returns its canonical path.
 *
 * @param {string} filePath The path to the file.
 * @param {string} hashName The name of the hashing algorithm to use (e.g., 'sha256', 'md5'). Defaults to 'sha256'.
 * @param {string} rootDir The root directory for the canonical paths.
 * @returns {Promise<string>} A promise that resolves to the canonical path string.
 */
export const getCanonicalPath = async (
	filePath: string,
	hashName: string = 'sha256',
	rootDir: string
): Promise<string> => {
	const hash = crypto.createHash(hashName)
	const fileStream = createReadStream(filePath)

	await new Promise<void>((resolve, reject) => {
		fileStream.on('data', (chunk) => hash.update(chunk))
		fileStream.on('end', () => resolve())
		fileStream.on('error', (err) => reject(err))
	})

	const fileHash = hash.digest('hex')
	const fileExtension = path.extname(filePath).slice(1) // Remove the leading dot

	const canonicalPath = path.join(
		rootDir,
		fileExtension,
		fileHash.slice(0, 2),
		`${fileHash}.${fileExtension}`
	)

	return canonicalPath
}
