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
	content.trim().split('\n').filter(Boolean)

export const readLeechesFile = async (
	leechesPath: string,
): Promise<string[] | undefined> => {
	const content = await readFileSafe(leechesPath)
	if (content) return parseLeechesContent(content)

	return
}
