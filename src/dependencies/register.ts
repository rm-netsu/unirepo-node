import fs from 'node:fs/promises'
import path from 'node:path'

import { getDependenciesPath, getFileHashString } from './canonical.js'
import { getLeechDependencies } from './parse.js'

export const updateDependency = async (
	filePath: string,
	builtinHashName: string = 'sha256',
	leechDirectory: string,
): Promise<void> => {
	const fileHash = await getFileHashString(filePath, builtinHashName)
	const basename = path.basename(filePath)
	const dependenciesPath = getDependenciesPath(leechDirectory)

	try {
		const entries = await getLeechDependencies(leechDirectory)

		if (entries?.has(basename)) {
			// Update existing entry
			const dependenciesContents = await fs.readFile(
				dependenciesPath,
				'utf8',
			)
			const lines = dependenciesContents
				.split('\n')
				.map(line => {
					const parts = line.trim().split(' ')
					if (parts.length >= 2 && parts[1] === basename)
						return `${fileHash} ${basename}`

					return line
				})
				.filter(line => line.trim() !== '')

			await fs.writeFile(
				dependenciesPath,
				lines.join('\n') + '\n',
				'utf8',
			)
			console.log(
				`Updated dependency for '${basename}' to hash '${fileHash}'.`,
			)
		} else {
			// Add new entry
			await fs.appendFile(dependenciesPath, `${fileHash} ${basename}\n`)
			console.log(`Registered dependency for '${basename}'.`)
		}
	} catch (error) {
		console.error(
			`Error updating dependency for '${filePath}': ${String(error)}`,
		)
		throw error
	}
}

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
			const registeredHash = entries.get(basename)
			if (registeredHash === fileHash) {
				console.log(
					`Dependency for file '${basename}' already registered.`,
				)
			} else {
				console.warn(
					`Warning: file '${basename}' with hash '${fileHash}' registered with different hash '${registeredHash}'`,
				)
				// For check --store, we want to update the hash
				await updateDependency(
					filePath,
					builtinHashName,
					leechDirectory,
				)
			}
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
