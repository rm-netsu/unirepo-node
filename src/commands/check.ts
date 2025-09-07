/* eslint-disable max-depth */
/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable complexity */
import fs from 'node:fs/promises'
import path from 'node:path'

import { getDependenciesPath } from '#/dependencies/canonical.js'
import { getFileHashString } from '#/dependencies/canonical.js'
import { getLeechDependencies } from '#/dependencies/parse.js'
import { registerDependency } from '#/dependencies/register.js'
import { isENOENT } from '#/fsutils.js'
import { readLeechesFile } from '#/leeches/parse.js'

interface CheckOptions {
	drop?: boolean
	forceFix?: boolean
	store?: boolean
	global?: boolean
}

interface CheckResult {
	leechDirectory: string
	filename: string
	status: 'valid' | 'invalid' | 'missing' | 'repaired' | 'dropped' | 'stored'
	registeredHash?: string
	currentHash?: string
	error?: string
}

/**
 * Removes a file entry from dependencies.txt
 */
const removeFromDependencies = async (
	dependenciesPath: string,
	filename: string,
): Promise<void> => {
	try {
		const content = await fs.readFile(dependenciesPath, 'utf8')
		const lines = content.split('\n').filter(line => {
			const parts = line.trim().split(' ')
			return parts.length >= 2 && parts[1] !== filename
		})
		await fs.writeFile(dependenciesPath, lines.join('\n') + '\n', 'utf8')
	} catch (error) {
		console.error(
			`Error removing ${filename} from dependencies: ${String(error)}`,
		)
		throw error
	}
}

/**
 * Checks the integrity of dependencies in a directory
 */
const checkDirectory = async (
	leechDirectory: string,
	repoRootPath: string,
	options: CheckOptions,
): Promise<CheckResult[]> => {
	const results: CheckResult[] = []
	const dependenciesPath = getDependenciesPath(leechDirectory)
	const lookupDir = path.join(repoRootPath, 'lookup', 'sha256')

	try {
		const entries = await getLeechDependencies(leechDirectory)
		if (!entries) {
			console.log(
				`No dependencies file found at '${dependenciesPath}'. Nothing to check.`,
			)
			return results
		}

		console.log(
			`Checking ${entries.size} dependencies in '${leechDirectory}'...`,
		)

		for (const [basename, registeredHash] of entries) {
			const filePath = path.join(leechDirectory, basename)

			try {
				// Check if file exists
				await fs.access(filePath)

				// Get current hash
				const currentHash = await getFileHashString(filePath)
				const fileExtension = path.extname(basename).slice(1)
				const canonicalPath = path.join(
					lookupDir,
					fileExtension,
					currentHash.slice(0, 2),
					`${currentHash}.${fileExtension}`,
				)

				if (currentHash === registeredHash) {
					// Hash matches - file is valid
					results.push({
						leechDirectory,
						filename: basename,
						status: 'valid',
						registeredHash,
						currentHash,
					})
					continue
				}

				// Hash mismatch - handle based on options
				const result: CheckResult = {
					leechDirectory,
					filename: basename,
					status: 'invalid',
					registeredHash,
					currentHash,
				}

				if (options.drop) {
					// Remove from dependencies list
					await removeFromDependencies(dependenciesPath, basename)
					result.status = 'dropped'
				} else if (options.forceFix) {
					// Replace with symlink to canonical file
					try {
						await fs.access(canonicalPath)
						await fs.unlink(filePath)
						await fs.symlink(canonicalPath, filePath)
						result.status = 'repaired'
					} catch (error) {
						result.status = 'invalid'
						result.error = `Canonical file not found: ${String(error)}`
					}
				} else if (options.store) {
					// Register the new hash in repository
					try {
						await registerDependency(
							filePath,
							'sha256',
							leechDirectory,
						)
						result.status = 'stored'
					} catch (error) {
						result.status = 'invalid'
						result.error = `Failed to store: ${String(error)}`
					}
				}

				results.push(result)
			} catch (error) {
				if (isENOENT(error)) {
					// File doesn't exist
					results.push({
						leechDirectory,
						filename: basename,
						status: 'missing',
						registeredHash,
					})
				} else {
					// Other error
					results.push({
						leechDirectory,
						filename: basename,
						status: 'invalid',
						registeredHash,
						error: String(error),
					})
				}
			}
		}

		return results
	} catch (error) {
		console.error(
			`Error during check operation in '${leechDirectory}': ${String(error)}`,
		)
		throw error
	}
}

/**
 * Checks the integrity of dependencies
 */
export const check = async (
	leechDirectory: string,
	repoRootPath: string,
	options: CheckOptions,
): Promise<CheckResult[]> => {
	if (options.global) {
		// Check all directories from leeches.txt
		const leechesPath = path.join(repoRootPath, 'leeches.txt')
		const leechDirectories = await readLeechesFile(leechesPath)

		if (!leechDirectories || leechDirectories.length === 0) {
			console.log('No leech directories found in leeches.txt')
			return []
		}

		const allResults: CheckResult[] = []

		for (const directory of leechDirectories) {
			try {
				const results = await checkDirectory(
					directory,
					repoRootPath,
					options,
				)
				allResults.push(...results)
			} catch (error) {
				console.error(
					`Error checking directory '${directory}': ${String(error)}`,
				)
				// Continue with other directories
			}
		}

		return allResults
	}
	// Check only the current directory
	return await checkDirectory(leechDirectory, repoRootPath, options)
}

/**
 * Generates a report from check results
 */
export const generateReport = (results: CheckResult[]): string => {
	const summary = {
		valid: 0,
		invalid: 0,
		missing: 0,
		repaired: 0,
		dropped: 0,
		stored: 0,
	}

	// Group results by directory
	const resultsByDirectory = new Map<string, CheckResult[]>()
	for (const result of results) {
		if (!resultsByDirectory.has(result.leechDirectory)) {
			resultsByDirectory.set(result.leechDirectory, [])
		}
		resultsByDirectory.get(result.leechDirectory)!.push(result)
		summary[result.status]++
	}

	let report = 'Dependency Check Report:\n\n'

	// Report by directory
	for (const [directory, dirResults] of resultsByDirectory.entries()) {
		report += `📁 Directory: ${directory}\n`

		const dirSummary = {
			valid: 0,
			invalid: 0,
			missing: 0,
			repaired: 0,
			dropped: 0,
			stored: 0,
		}

		for (const result of dirResults) {
			dirSummary[result.status]++

			switch (result.status) {
				case 'valid': {
					report += `  ✅ ${result.filename}: Valid (hash: ${result.registeredHash})\n`
					break
				}
				case 'invalid': {
					report += `  ❌ ${result.filename}: Invalid (registered: ${result.registeredHash}, current: ${result.currentHash})`
					if (result.error) report += ` - Error: ${result.error}`
					report += '\n'
					break
				}
				case 'missing': {
					report += `  ⚠️ ${result.filename}: Missing (registered hash: ${result.registeredHash})\n`
					break
				}
				case 'repaired': {
					report += `  🔧 ${result.filename}: Repaired (new hash: ${result.currentHash})\n`
					break
				}
				case 'dropped': {
					report += `  🗑️ ${result.filename}: Dropped from dependencies\n`
					break
				}
				case 'stored': {
					report += `  💾 ${result.filename}: Stored with new hash (${result.currentHash})\n`
					break
				}
			}
		}

		report += `  📊 Summary for directory: `
		report += `✅ ${dirSummary.valid} | `
		report += `❌ ${dirSummary.invalid} | `
		report += `⚠️ ${dirSummary.missing}`
		if (dirSummary.repaired > 0) report += ` | 🔧 ${dirSummary.repaired}`
		if (dirSummary.dropped > 0) report += ` | 🗑️ ${dirSummary.dropped}`
		if (dirSummary.stored > 0) report += ` | 💾 ${dirSummary.stored}`
		report += '\n\n'
	}

	report += `Global Summary:\n`
	report += `📁 Directories checked: ${resultsByDirectory.size}\n`
	report += `📄 Files checked: ${results.length}\n`
	report += `✅ Valid: ${summary.valid}\n`
	report += `❌ Invalid: ${summary.invalid}\n`
	report += `⚠️ Missing: ${summary.missing}\n`
	if (summary.repaired > 0) report += `🔧 Repaired: ${summary.repaired}\n`
	if (summary.dropped > 0) report += `🗑️ Dropped: ${summary.dropped}\n`
	if (summary.stored > 0) report += `💾 Stored: ${summary.stored}\n`

	return report
}
