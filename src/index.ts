#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { store } from './store.js';
import { deflate } from './deflate.js';
import { inflate } from './inflate.js';

const program = new Command();

// Определяем базовую информацию об утилите
program
	.name('unirepo')
	.description('A CLI tool for managing canonical file dependencies.')
	.version('0.0.1');

// Определяем глобальную опцию для пути к репозиторию
program.option(
	'-R, --repo <path>',
	'Path to the unirepo root directory.',
	path.join(process.cwd(), '.unirepo-root') // Путь по умолчанию
);

// Определяем команду `store`
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

// Определяем команду `deflate`
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

// Определяем команду `inflate`
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

program.parse(process.argv);
