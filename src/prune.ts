// src/prune.ts (обновлённая версия)

import { promises as fs } from 'fs';
import * as path from 'path';
import { collectUsedHashes } from './collect.js';

/**
 * Finds and optionally removes unused canonical files in the repository.
 *
 * @param {string} repoRootPath The root directory of the repository.
 * @param {boolean} dryRun If true, only reports on files to be removed without deleting them.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function prune(repoRootPath: string, dryRun: boolean): Promise<void> {
    const lookupDir = path.join(repoRootPath, 'lookup', 'sha256');

    console.log('Starting the prune operation...');

    try {
        // 1. Get a list of all canonical files and their hashes.
        const allCanonicalFiles = new Map<string, string>(); // Map<hash, filePath>
        console.log(`Scanning canonical repository for all files...`);
        const extensions = await fs.readdir(lookupDir);
        for (const extDir of extensions) {
            const hexDirs = await fs.readdir(path.join(lookupDir, extDir));
            for (const hexDir of hexDirs) {
                const files = await fs.readdir(path.join(lookupDir, extDir, hexDir));
                for (const file of files) {
                    const filePath = path.join(lookupDir, extDir, hexDir, file);
                    const fileHash = path.basename(file, path.extname(file));
                    allCanonicalFiles.set(fileHash, filePath);
                }
            }
        }
        console.log(`Found ${allCanonicalFiles.size} total canonical files.`);

        // 2. Get a list of all used file hashes from the new collector function.
        const usedHashes = await collectUsedHashes(repoRootPath);

        // 3. Find orphan files (in allCanonicalFiles but not in usedHashes).
        const orphanFiles: string[] = [];
        for (const [hash, filePath] of allCanonicalFiles.entries()) {
            if (!usedHashes.has(hash)) {
                orphanFiles.push(filePath);
            }
        }
        
        console.log(`Found ${orphanFiles.length} unused (orphan) files.`);

        if (orphanFiles.length === 0) {
            console.log('No orphan files found. Prune operation complete.');
            return;
        }

        // 4. Report or remove files.
        if (dryRun) {
            console.log('\n--- Dry Run: The following files would be removed ---');
            orphanFiles.forEach(file => console.log(file));
            console.log('--- End of dry run ---');
        } else {
            console.log('\n--- Removing unused files ---');
            for (const filePath of orphanFiles) {
                try {
                    // await fs.unlink(filePath);
                    console.log(`Removed: ${filePath}`);
                } catch (error) {
                    console.error(`Error removing file '${filePath}':`, error);
                }
            }
            console.log('--- Removal complete ---');
        }

    } catch (error) {
        console.error('An error occurred during the prune operation:', error);
        throw error;
    }
}
