import * as crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import path from 'node:path'

export const getFileHashString = async (
	filePath: string,
	builtinHashName: string = 'sha256',
): Promise<string> => {
	const hash = crypto.createHash(builtinHashName)
	const fileStream = createReadStream(filePath)

	await new Promise<void>((resolve, reject) => {
		fileStream.on('data', chunk => hash.update(chunk))
		fileStream.on('end', () => resolve())
		fileStream.on('error', error => reject(error))
	})

	return hash.digest('hex')
}

export const getCanonicalPath = async (
	filePath: string,
	builtinHashName: string = 'sha256',
	repoRootPath: string,
): Promise<string> => {
	const fileHash = await getFileHashString(filePath, builtinHashName)
	const fileExtension = path.extname(filePath).slice(1) // Remove the leading dot

	const canonicalPath = path.join(
		repoRootPath,
		fileExtension,
		fileHash.slice(0, 2),
		`${fileHash}.${fileExtension}`,
	)

	return canonicalPath
}

export const getDependenciesPath = (leechDirectory: string) =>
	path.join(leechDirectory, '.unirepo', 'dependencies.txt')
