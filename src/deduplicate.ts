import fs from 'fs/promises'

export const deduplicate = async (
	path: string,
	canonicalPath: string
): Promise<void> => {
	try {
		try {
			await fs.access(canonicalPath, fs.constants.F_OK)
			console.log(
				`Canonical file '${canonicalPath}' already exists. Skipping copy.`
			)
		} catch (accessError) {
			// Assume an access error and proceed with the copy
			console.log(`Copying file from '${path}' to '${canonicalPath}'...`)
			await fs.copyFile(path, canonicalPath)
		}

		await fs.unlink(path)
		await fs.symlink(canonicalPath, path)

		console.log(
			`Successfully deduplicated file at '${path}' to '${canonicalPath}'.`
		)
	} catch (error) {
		console.error(`Error during deduplication: ${error}`)
		throw error
	}
}
