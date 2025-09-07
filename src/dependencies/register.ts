import fs from 'node:fs/promises'
import path from 'node:path'

import { getDependenciesPath, getFileHashString } from './canonical.js'
import { getLeechDependencies } from './parse.js'

export const registerDependency = async (
	filePath: string,
	builtinHashName: string = 'sha256',
	leechDirectory: string,
): Promise<void> => {
	const fileHash = await getFileHashString(filePath, builtinHashName)
	const basename = path.basename(filePath)

	try {
		const entries = await getLeechDependencies(leechDirectory)

		if (entries?.has(basename)) {
			console.log(`Dependency for file '${basename}' already registered.`)

			const registeredHash = entries.get(basename)
			if (registeredHash !== fileHash)
				console.warn(
					`Warning: file '${basename}' with hash '${fileHash}' registered with different hash '${registeredHash}'`,
				)

			return
		}

		const dependenciesPath = getDependenciesPath(leechDirectory)
		await fs.appendFile(dependenciesPath, `${fileHash} ${basename}\n`)
		console.log(`Successfully registered dependency for '${basename}'.`)
	} catch (error) {
		console.error(
			`Error registering dependency for '${filePath}': ${String(error)}`,
		)
		throw error
	}
}
