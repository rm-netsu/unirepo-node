#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import fs from 'fs/promises';
import { store } from './store.js';
import { deflate } from './deflate.js';
import { inflate } from './inflate.js';
import { exportFiles } from './export.js';

const program = new Command();

program
	.name('unirepo')
	.description('A CLI tool for managing canonical file dependencies.')
	.version('0.0.1');

program.option(
	'-R, --repo <path>',
	'Path to the unirepo root directory.',
	path.join(process.cwd(), '.unirepo-root')
);

program
	.command('store <filePath>')
	.description('Stores a file in the canonical repository, creates a symlink, and registers dependencies.')
	.action(async (filePath, options, command) => {
		const repoRootPath = command.parent.opts().repo;
		try {
			await store(filePath, repoRootPath);
			console.log(`File '${filePath}' successfully stored in the repository.`);
		} catch (error) {
			console.error('An error occurred during the store operation:', error);
			process.exit(1);
		}
	});

program
	.command('deflate')
	.description('Removes files from the current directory that are listed as dependencies.')
	.action(async (options) => {
		const dirPath = process.cwd();
		try {
			await deflate(dirPath);
			console.log(`Dependencies in '${dirPath}' successfully deflated.`);
		} catch (error) {
			console.error('An error occurred during the deflate operation:', error);
			process.exit(1);
		}
	});

program
	.command('inflate')
	.description('Recreates symbolic links for dependencies in the current directory.')
	.action(async (options, command) => {
		const repoRootPath = command.parent.opts().repo;
		const dirPath = process.cwd();
		try {
			await inflate(dirPath, repoRootPath);
			console.log(`Dependencies in '${dirPath}' successfully inflated.`);
		} catch (error) {
			console.error('An error occurred during the inflate operation:', error);
			process.exit(1);
		}
	});

program
	.command('export')
	.description('Exports canonical files to a specified directory, compressing them with xz.')
	.option('-o, --output <path>', 'Path to the output directory.', path.join(process.cwd(), 'export'))
	.option('--cx, --compression <level>', 'Compression level (0-9). 0 is fastest, 9 is best.', '9')
	.action(async (options, command) => {
		const repoRootPath = command.parent.opts().repo;
		const outputDir = options.output;
		const compressionLevel = parseInt(options.compression, 10);
		const exportLockPath = path.join(repoRootPath, 'export-lock');

		if (!Number.isInteger(compressionLevel) || compressionLevel < 0 || compressionLevel > 9) {
			console.error('Error: Compression level must be an integer between 0 and 9.');
			process.exit(1);
		}

		let lastExportTimestamp = null;
		try {
			lastExportTimestamp = await fs.readFile(exportLockPath, 'utf-8');
			console.log(`Found previous export timestamp: ${lastExportTimestamp}`);
		} catch (error: any) {
			if (error.code === 'ENOENT') {
				console.log('No previous export-lock file found. All files will be exported.');
			} else {
				console.error(`Error reading export-lock file:`, error);
				process.exit(1);
			}
		}
		
		try {
			await exportFiles(repoRootPath, outputDir, lastExportTimestamp, compressionLevel);
			console.log('Export command completed successfully.');
		} catch (error) {
			console.error('An error occurred during the export command:', error);
			process.exit(1);
		}
	});

program.parse(process.argv);
