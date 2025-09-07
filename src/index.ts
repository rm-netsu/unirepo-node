#!/usr/bin/env node
/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import fs from 'node:fs/promises'
import path from 'node:path'

import { Command } from 'commander'

import { collectUsedHashes } from '#/commands/collect.js'
import { deflate } from '#/commands/deflate.js'
import { exportFiles } from '#/commands/export.js'
import { inflate } from '#/commands/inflate.js'
import { prune } from '#/commands/prune.js'
import { store } from '#/commands/store.js'
import { isENOENT } from '#/fsutils.js'

const program = new Command()

program
	.name('unirepo')
	.description('A CLI tool for managing canonical file dependencies.')
	.version('0.0.1')

program.option(
	'-R, --repo <path>',
	'Path to the unirepo root directory.',
	path.join(process.cwd(), '.unirepo-root'),
)

program
	.command('store <filePath>')
	.description(
		'Stores a file in the canonical repository, creates a symlink, and registers dependencies.',
	)
	.action(async (filePath, options, command) => {
		const repoRootPath = command.parent.opts().repo as string
		try {
			await store(filePath, repoRootPath)
			console.log(
				`File '${filePath}' successfully stored in the repository.`,
			)
		} catch (error) {
			console.error(
				'An error occurred during the store operation:',
				error,
			)
			process.exit(1)
		}
	})

program
	.command('deflate')
	.description(
		'Removes files from the current directory that are listed as dependencies.',
	)
	.action(async () => {
		const dirPath = process.cwd()
		try {
			await deflate(dirPath)
			console.log(`Dependencies in '${dirPath}' successfully deflated.`)
		} catch (error) {
			console.error(
				'An error occurred during the deflate operation:',
				error,
			)
			process.exit(1)
		}
	})

program
	.command('inflate')
	.description(
		'Recreates symbolic links for dependencies in the current directory.',
	)
	.action(async (options, command) => {
		const repoRootPath = command.parent.opts().repo
		const dirPath = process.cwd()
		try {
			await inflate(dirPath, repoRootPath)
			console.log(`Dependencies in '${dirPath}' successfully inflated.`)
		} catch (error) {
			console.error(
				'An error occurred during the inflate operation:',
				error,
			)
			process.exit(1)
		}
	})

program
	.command('export')
	.description(
		'Exports canonical files to a specified directory, compressing them with xz.',
	)
	.option(
		'-o, --output <path>',
		'Path to the output directory.',
		path.join(process.cwd(), 'export'),
	)
	.option(
		'--cx, --compression <level>',
		'Compression level (0-9). 0 is fastest, 9 is best.',
		'9',
	)
	.action(async (options, command) => {
		const repoRootPath = command.parent.opts().repo
		const outputDir = options.output
		const compressionLevel = Number.parseInt(options.compression, 10)
		const exportLockPath = path.join(repoRootPath, 'export-lock')

		if (
			!Number.isInteger(compressionLevel) ||
			compressionLevel < 0 ||
			compressionLevel > 9
		) {
			console.error(
				'Error: Compression level must be an integer between 0 and 9.',
			)
			process.exit(1)
		}

		let lastExportTimestamp = null
		try {
			lastExportTimestamp = await fs.readFile(exportLockPath, 'utf8')
			console.log(
				`Found previous export timestamp: ${lastExportTimestamp}`,
			)
		} catch (error: unknown) {
			if (isENOENT(error)) {
				console.log(
					'No previous export-lock file found. All files will be exported.',
				)
			} else {
				console.error(`Error reading export-lock file:`, error)
				process.exit(1)
			}
		}

		try {
			await exportFiles(
				repoRootPath,
				outputDir,
				lastExportTimestamp,
				compressionLevel,
			)
			console.log('Export command completed successfully.')
		} catch (error) {
			console.error('An error occurred during the export command:', error)
			process.exit(1)
		}
	})

program
	.command('collect')
	.description(
		'Collects and reports on all used file hashes from leech directories.',
	)
	.action(async (options, command) => {
		const repoRootPath = command.parent.opts().repo
		try {
			const usedHashes = await collectUsedHashes(repoRootPath)
			console.log(
				`\nSuccessfully collected ${usedHashes.size} unique hashes.`,
			)
		} catch (error) {
			console.error(
				'An error occurred during the collect operation:',
				error,
			)
			process.exit(1)
		}
	})

program
	.command('prune')
	.description(
		'Finds and removes unused files from the canonical repository.',
	)
	.option(
		'--dry, --dry-run',
		'Lists files that would be removed without deleting them.',
		false,
	)
	.action(async (options, command) => {
		const repoRootPath = command.parent.opts().repo
		const dryRun = options.dryRun
		try {
			await prune(repoRootPath, dryRun)
			console.log('Prune command completed successfully.')
		} catch (error) {
			console.error(
				'An error occurred during the prune operation:',
				error,
			)
			process.exit(1)
		}
	})

program.parse(process.argv)
