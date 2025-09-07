import fs from 'node:fs/promises'
import path from 'node:path'

const M_PROCESSING = (path: string) => `Processing file '${path}':`

const M_SKIPPING = (canonicalPath: string) =>
	`\t ♻️ Canonical file '${path.basename(canonicalPath)}' already exists. Skipping copy.`

const M_COPYING = (canonicalPath: string) =>
	`\t 📤 Copying file to '${canonicalPath}'...`

const M_SUCCESS = `\t ✅ Successfully deduplicated.`

const M_ERROR = (error: unknown) =>
	`\t ⚠️ Error during deduplication: ${String(error)}`

export const deduplicate = async (
	path: string,
	canonicalPath: string,
): Promise<void> => {
	console.log(M_PROCESSING(path))

	try {
		try {
			await fs.access(canonicalPath, fs.constants.F_OK)
			console.log(M_SKIPPING(canonicalPath))
		} catch {
			// Assume an access error and proceed with the copy
			console.log(M_COPYING(canonicalPath))
			await fs.copyFile(path, canonicalPath)
		}

		await fs.unlink(path)
		await fs.symlink(canonicalPath, path)

		console.log(M_SUCCESS)
	} catch (error) {
		console.error(M_ERROR(error))
		throw error
	}
}
