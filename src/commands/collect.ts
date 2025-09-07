/* eslint-disable unicorn/prevent-abbreviations */
import path from 'node:path'

import CliTable3 from 'cli-table3'

import { getLeechDependencies } from '#/dependencies/parse.js'
import { readLeechesFile } from '#/leeches/parse.js'

interface CollectOptions {
	table?: boolean
	silent?: boolean
}

interface FileHashEntry {
	filename: string
	hash: string
	leechDirectory: string
}

const getHashesFromAllLeeches = async (
	leeches: string[],
): Promise<FileHashEntry[]> => {
	const allEntries: FileHashEntry[] = []

	for (const leechDirectory of leeches) {
		const entries = await getLeechDependencies(leechDirectory)
		if (!entries) continue

		for (const [filename, hash] of entries.entries()) {
			allEntries.push({
				filename,
				hash,
				leechDirectory,
			})
		}
	}

	return allEntries
}

/**
 * Formats output as a table using cli-table3
 */
const formatAsTable = (entries: FileHashEntry[]): string => {
	if (entries.length === 0) {
		return 'No dependencies found.'
	}

	const table = new CliTable3({
		head: ['filename', 'hash', 'directory'],
		colWidths: [20, 50, 40],
		wordWrap: true,
	})

	for (const entry of entries) {
		table.push([entry.filename, entry.hash, entry.leechDirectory])
	}

	return table.toString()
}

/**
 * Formats output as simple list (original behavior)
 */
const formatAsList = (
	entries: FileHashEntry[],
	uniqueHashes: Set<string>,
): string => {
	let output = ''

	if (entries.length === 0) {
		output += 'No dependencies found.\n'
		return output
	}

	// Group by directory
	const entriesByDirectory = new Map<string, FileHashEntry[]>()
	for (const entry of entries) {
		if (!entriesByDirectory.has(entry.leechDirectory)) {
			entriesByDirectory.set(entry.leechDirectory, [])
		}
		entriesByDirectory.get(entry.leechDirectory)!.push(entry)
	}

	// Output by directory
	for (const [directory, dirEntries] of entriesByDirectory.entries()) {
		output += `\n📁 Directory: ${directory}\n`
		for (const entry of dirEntries) {
			output += `  ${entry.filename} | ${entry.hash}\n`
		}
	}

	output += `\n📊 Summary:\n`
	output += `  Directories: ${entriesByDirectory.size}\n`
	output += `  Total files: ${entries.length}\n`
	output += `  Unique hashes: ${uniqueHashes.size}\n`

	return output
}

export const collectUsedHashes = async (
	repoRootPath: string,
	options: CollectOptions = {},
): Promise<Set<string>> => {
	const leechesPath = path.join(repoRootPath, 'leeches.txt')

	const leeches = await readLeechesFile(leechesPath)
	if (!leeches) {
		console.log('No leeches file found. No dependencies will be collected.')
		return new Set()
	}
	console.log(`Found ${leeches.length} registered 'leech' directories.`)

	const fileEntries = await getHashesFromAllLeeches(leeches)
	const uniqueHashes = new Set(fileEntries.map(entry => entry.hash))

	// Output the results
	if (!options.silent) {
		if (options.table) {
			console.log('\n' + formatAsTable(fileEntries))
		} else {
			console.log(formatAsList(fileEntries, uniqueHashes))
		}

		console.log(
			`\nSuccessfully collected ${fileEntries.length} file entries with ${uniqueHashes.size} unique hashes.`,
		)
	}

	return uniqueHashes
}

/**
 * Silent version for internal use by other commands
 */
export const collectUsedHashesSilent = async (
	repoRootPath: string,
): Promise<Set<string>> => {
	return collectUsedHashes(repoRootPath, { silent: true })
}
