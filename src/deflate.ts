/* eslint-disable max-depth */
import fs from 'node:fs/promises'
import path from 'node:path'

import { isENOENT } from './fsutils.js'

/**
 * Removes files listed in the .unirepo/dependencies.txt file from the specified directory.
 *
 * @param {string} directoryPath The path to the directory containing the .unirepo folder.
 * @returns {Promise<void>} A promise that resolves when all files are removed.
 */
export async function deflate(directoryPath: string): Promise<void> {
	const dependenciesPath = path.join(
		directoryPath,
		'.unirepo',
		'dependencies.txt',
	)

	try {
		// 1. Read the dependencies file.
		const dependenciesContent = await fs.readFile(dependenciesPath, 'utf8')
		const lines = dependenciesContent.trim().split('\n')

		// 2. Iterate through each line (dependency) and remove the corresponding file.
		for (const line of lines) {
			const [, basename] = line.split(' ')
			if (basename) {
				const filePath = path.join(directoryPath, basename)
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
		}
	} catch (error: unknown) {
		if (isENOENT(error)) {
			console.log(
				`No dependencies file found at '${dependenciesPath}'. Skipping deflate.`,
			)
		} else {
			console.error(
				`Error during deflate operation for '${directoryPath}': ${String(error)}`,
			)
			throw error
		}
	}
}
