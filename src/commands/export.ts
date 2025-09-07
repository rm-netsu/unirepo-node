/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable max-depth */

import type { Stats } from 'node:fs'

import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const getFileCreationTime = (fileStats: Stats, filePath: string) => {
	if (fileStats.birthtime.getDate() !== 0) return fileStats.birthtime

	console.warn(
		`Warning: birthtime not available for '${filePath}'. Using mtime instead.`,
	)
	return fileStats.mtime
}

const shouldExportFile = (
	fileCreationTime: Date,
	lastExportTimestamp: string | null,
): boolean => {
	if (!lastExportTimestamp) return true
	return fileCreationTime.toISOString() > lastExportTimestamp
}

const compressFile = async (
	filePath: string,
	outputFilePath: string,
	compressionLevel: number,
): Promise<void> => {
	try {
		const command = `xz -k -${compressionLevel} -T0 "${filePath}" -c > "${outputFilePath}"`
		await execAsync(command)
	} catch (error) {
		console.error(`Error compressing file '${filePath}':`, error)
		throw error
	}
}

const findFilesToProcess = async (
	lookupDirectory: string,
	lastExportTimestamp: string | null,
): Promise<Array<{ filePath: string; outputFileName: string }>> => {
	const filesToProcess: Array<{ filePath: string; outputFileName: string }> =
		[]

	const directories = await fs.readdir(lookupDirectory)

	for (const extensionDirectory of directories) {
		const hexDirectory = path.join(lookupDirectory, extensionDirectory)
		const hexDirStats = await fs.stat(hexDirectory)

		if (!hexDirStats.isDirectory()) continue

		const hexSubDirectories = await fs.readdir(hexDirectory)

		for (const subDir of hexSubDirectories) {
			const canonicalDir = path.join(hexDirectory, subDir)
			const canonicalDirStats = await fs.stat(canonicalDir)

			if (!canonicalDirStats.isDirectory()) continue

			const files = await fs.readdir(canonicalDir)

			for (const file of files) {
				const filePath = path.join(canonicalDir, file)
				const fileStats = await fs.stat(filePath)

				if (!fileStats.isFile()) continue

				const fileCreationTime = getFileCreationTime(
					fileStats,
					filePath,
				)

				if (!shouldExportFile(fileCreationTime, lastExportTimestamp)) {
					console.log(
						`Skipping '${filePath}' - created at ${fileCreationTime.toISOString()}, which is older than last export.`,
					)
					continue
				}

				filesToProcess.push({ filePath, outputFileName: `${file}.xz` })
			}
		}
	}

	return filesToProcess
}

const processFiles = async (
	filesToProcess: Array<{ filePath: string; outputFileName: string }>,
	outputDirectory: string,
	compressionLevel: number,
): Promise<void> => {
	for (const { filePath, outputFileName } of filesToProcess) {
		const outputFilePath = path.join(outputDirectory, outputFileName)

		console.log(
			`Exporting and compressing '${filePath}' to '${outputFilePath}'.`,
		)

		await compressFile(filePath, outputFilePath, compressionLevel)
	}
}

/**
 * Exports canonical files to a specified directory, optionally filtering by a last export timestamp.
 *
 * @param {string} repoRootPath The root directory of the repository, containing the canonical files.
 * @param {string} outputDirectory The directory where compressed files should be stored.
 * @param {string | null} lastExportTimestamp The timestamp from the last export-lock file.
 * @param {number} compressionLevel The compression level (0-9).
 * @returns {Promise<void>} A promise that resolves when the export is complete.
 */
export async function exportFiles(
	repoRootPath: string,
	outputDirectory: string,
	lastExportTimestamp: string | null,
	compressionLevel: number,
): Promise<void> {
	const lookupDirectory = path.join(repoRootPath, 'lookup', 'sha256')
	const exportLockPath = path.join(repoRootPath, 'export-lock')
	const startTime = new Date().toISOString()

	console.log(`Starting export operation from '${lookupDirectory}'.`)
	console.log(`Using compression level: ${compressionLevel}`)

	try {
		await fs.mkdir(outputDirectory, { recursive: true })

		const filesToProcess = await findFilesToProcess(
			lookupDirectory,
			lastExportTimestamp,
		)
		if (filesToProcess.length === 0) {
			console.log('No files to export.')
			return
		}

		console.log(`Found ${filesToProcess.length} files to export.`)

		await processFiles(filesToProcess, outputDirectory, compressionLevel)

		await fs.writeFile(exportLockPath, startTime, 'utf8')
		console.log(
			`Export completed. Updated export-lock with timestamp: ${startTime}`,
		)
	} catch (error) {
		console.error('An error occurred during the export operation:', error)
		throw error
	}
}
