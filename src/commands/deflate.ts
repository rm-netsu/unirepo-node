/* eslint-disable max-depth */
import fs from 'node:fs/promises'
import path from 'node:path'

import { getDependenciesPath } from '#/dependencies/canonical.js'
import { getLeechDependencies } from '#/dependencies/parse.js'
import { isENOENT } from '#/fsutils.js'

/**
 * Removes files listed in the .unirepo/dependencies.txt file from the specified directory.
 *
 * @param {string} leechDirectory The path to the directory containing the .unirepo folder.
 * @returns {Promise<void>} A promise that resolves when all files are removed.
 */
export const deflate = async (leechDirectory: string): Promise<void> => {
	try {
		const entries = await getLeechDependencies(leechDirectory)
		if (!entries) {
			const dependenciesPath = getDependenciesPath(leechDirectory)
			console.log(
				`No dependencies file found at '${dependenciesPath}'. Skipping deflate.`,
			)
			return
		}

		for (const basename of entries.keys()) {
			const filePath = path.join(leechDirectory, basename)
			try {
				// Check if the file exists and is a symbolic link before removing.
				const stats = await fs.lstat(filePath)
				if (stats.isSymbolicLink()) {
					await fs.unlink(filePath)
					console.log(`Removed symbolic link: '${filePath}'`)
				} else {
					console.warn(
						`File '${filePath}' is not a symbolic link. Skipping removal.`,
					)
				}
			} catch (error: unknown) {
				if (isENOENT(error)) {
					console.log(
						`File '${filePath}' not found. It may have already been removed.`,
					)
				} else {
					console.error(
						`Error removing file '${filePath}': ${String(error)}`,
					)
				}
			}
		}
	} catch (error: unknown) {
		console.error(
			`Error during deflate operation for '${leechDirectory}': ${String(error)}`,
		)
		throw error
	}
}
