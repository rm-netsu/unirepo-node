/* eslint-disable max-depth */
import fs from 'node:fs/promises'
import path from 'node:path'

import { getDependenciesPath } from '#/dependencies/canonical.js'
import { getLeechDependencies } from '#/dependencies/parse.js'
import { isENOENT } from '#/fsutils.js'

/**
 * Recreates symbolic links for files listed in the .unirepo/dependencies.txt file.
 *
 * @param {string} leechDirectory The path to the directory containing the .unirepo folder.
 * @param {string} repoRootPath The root directory of the repository, containing the lookup directory.
 * @returns {Promise<void>} A promise that resolves when all symbolic links are created.
 */
export const inflate = async (
	leechDirectory: string,
	repoRootPath: string,
): Promise<void> => {
	const dependenciesPath = getDependenciesPath(leechDirectory)
	// eslint-disable-next-line unicorn/prevent-abbreviations
	const lookupDir = path.join(repoRootPath, 'lookup', 'sha256') // Hardcoded hash algorithm

	try {
		const entries = await getLeechDependencies(leechDirectory)
		if (!entries) {
			console.log(
				`No dependencies file found at '${dependenciesPath}'. Skipping inflate.`,
			)
			return
		}

		for (const [basename, fileHash] of entries) {
			const fileExtension = path.extname(basename).slice(1)
			const canonicalPath = path.join(
				lookupDir,
				fileExtension,
				fileHash.slice(0, 2),
				`${fileHash}.${fileExtension}`,
			)

			// Construct the path for the new symbolic link.
			const symlinkPath = path.join(leechDirectory, basename)

			try {
				// Check if the canonical file exists before creating the link.
				await fs.access(canonicalPath, fs.constants.F_OK)

				// Check if a link already exists to avoid errors.
				try {
					await fs.lstat(symlinkPath)
					console.log(
						`Symbolic link for '${basename}' already exists. Skipping.`,
					)
				} catch (lstatError: unknown) {
					if (isENOENT(lstatError)) {
						// The link doesn't exist, so we can create it.
						await fs.symlink(canonicalPath, symlinkPath)
						console.log(
							`Created symbolic link for '${basename}' pointing to '${canonicalPath}'.`,
						)
					} else {
						throw lstatError
					}
				}
			} catch {
				console.warn(
					`Canonical file '${canonicalPath}' not found. Could not create link for '${basename}'.`,
				)
			}
		}
	} catch (error: unknown) {
		console.error(
			`Error during inflate operation for '${leechDirectory}': ${String(error)}`,
		)
		throw error
	}
}
