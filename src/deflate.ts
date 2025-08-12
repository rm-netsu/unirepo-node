import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Removes files listed in the .unirepo/dependencies.txt file from the specified directory.
 *
 * @param {string} dirPath The path to the directory containing the .unirepo folder.
 * @returns {Promise<void>} A promise that resolves when all files are removed.
 */
export async function deflate(dirPath: string): Promise<void> {
	const dependenciesPath = path.join(dirPath, '.unirepo', 'dependencies.txt');

	try {
		// 1. Read the dependencies file.
		const dependenciesContent = await fs.readFile(dependenciesPath, 'utf-8');
		const lines = dependenciesContent.trim().split('\n');

		// 2. Iterate through each line (dependency) and remove the corresponding file.
		for (const line of lines) {
			const [hash, basename] = line.split(' ');
			if (basename) {
				const filePath = path.join(dirPath, basename);
				try {
					// Check if the file exists and is a symbolic link before removing.
					const stats = await fs.lstat(filePath);
					if (stats.isSymbolicLink()) {
						await fs.unlink(filePath);
						console.log(`Removed symbolic link: '${filePath}'`);
					} else {
						console.warn(`File '${filePath}' is not a symbolic link. Skipping removal.`);
					}
				} catch (error: any) {
					if (error.code === 'ENOENT') {
						console.log(`File '${filePath}' not found. It may have already been removed.`);
					} else {
						console.error(`Error removing file '${filePath}': ${error}`);
					}
				}
			}
		}
	} catch (error: any) {
		if (error.code === 'ENOENT') {
			console.log(`No dependencies file found at '${dependenciesPath}'. Skipping deflate.`);
		} else {
			console.error(`Error during deflate operation for '${dirPath}': ${error}`);
			throw error;
		}
	}
}
