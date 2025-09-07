import fs from 'node:fs/promises'

import { isENOENT } from '#/fsutils.js'

const readFileSafe = async (
	filePath: string,
	encoding: BufferEncoding = 'utf8',
): Promise<string> => {
	try {
		return await fs.readFile(filePath, encoding)
	} catch (error: unknown) {
		if (isENOENT(error)) return ''

		throw error
	}
}

export const parseLeechesContent = (content: string): string[] =>
	content
		.trim()
		.split('\n')
		.filter(Boolean)
		.map(line => line.trim())
		.filter(line => line !== '')

export const readLeechesFile = async (
	leechesPath: string,
): Promise<string[] | undefined> => {
	try {
		const content = await readFileSafe(leechesPath)
		if (content) {
			const directories = parseLeechesContent(content)
			// Verify directories exist
			const existingDirectories: string[] = []

			for (const directory of directories) {
				// eslint-disable-next-line max-depth
				try {
					await fs.access(directory)
					existingDirectories.push(directory)
				} catch {
					console.warn(`Leech directory not found: ${directory}`)
				}
			}

			return existingDirectories.length > 0
				? existingDirectories
				: undefined
		}
		return undefined
	} catch (error: unknown) {
		if (isENOENT(error)) return undefined
		throw error
	}
}
