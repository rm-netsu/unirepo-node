// src/collect.ts

import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Scans all registered 'leech' directories and collects a list of all used canonical file hashes.
 *
 * @param {string} repoRootPath The root directory of the repository.
 * @returns {Promise<Set<string>>} A promise that resolves to a Set of used file hashes.
 */
export async function collectUsedHashes(repoRootPath: string): Promise<Set<string>> {
    const leechesPath = path.join(repoRootPath, 'leeches.txt');
    const usedHashes = new Set<string>();

    let leechesContent = '';
    try {
        leechesContent = await fs.readFile(leechesPath, 'utf-8');
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.log('No leeches file found. No dependencies will be collected.');
            return usedHashes;
        } else {
            throw error;
        }
    }

    const leeches = leechesContent.trim().split('\n').filter(Boolean);
    console.log(`Found ${leeches.length} registered 'leech' directories.`);

    for (const leechDir of leeches) {
        const dependenciesPath = path.join(leechDir, '.unirepo', 'dependencies.txt');
        try {
            const dependenciesContent = await fs.readFile(dependenciesPath, 'utf-8');
            const lines = dependenciesContent.trim().split('\n').filter(Boolean);
            for (const line of lines) {
                const [hash] = line.split(' ');
                if (hash) {
                    usedHashes.add(hash);
                }
            }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log(`Dependencies file not found for '${leechDir}'. Skipping.`);
            } else {
                console.warn(`Warning: Could not read dependencies for '${leechDir}':`, error);
            }
        }
    }
    console.log(`Found ${usedHashes.size} used file hashes.`);
    return usedHashes;
}
