import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Exports canonical files to a specified directory, optionally filtering by a last export timestamp.
 *
 * @param {string} repoRootPath The root directory of the repository, containing the canonical files.
 * @param {string} outputDir The directory where compressed files should be stored.
 * @param {string | null} lastExportTimestamp The timestamp from the last export-lock file.
 * @param {number} compressionLevel The compression level (0-9).
 * @returns {Promise<void>} A promise that resolves when the export is complete.
 */
export async function exportFiles(
    repoRootPath: string,
    outputDir: string,
    lastExportTimestamp: string | null,
    compressionLevel: number
): Promise<void> {
    const lookupDir = path.join(repoRootPath, 'lookup', 'sha256');
    const exportLockPath = path.join(repoRootPath, 'export-lock');
    const startTime = new Date().toISOString();

    console.log(`Starting export operation from '${lookupDir}'.`);
    console.log(`Using compression level: ${compressionLevel}`);

    try {
        await fs.mkdir(outputDir, { recursive: true });
        
        const directories = await fs.readdir(lookupDir);
        for (const extDir of directories) {
            const hexDir = path.join(lookupDir, extDir);
            if ((await fs.stat(hexDir)).isDirectory()) {
                const hexSubDirs = await fs.readdir(hexDir);
                for (const subDir of hexSubDirs) {
                    const canonicalDir = path.join(hexDir, subDir);
                    if ((await fs.stat(canonicalDir)).isDirectory()) {
                        const files = await fs.readdir(canonicalDir);
                        for (const file of files) {
                            const filePath = path.join(canonicalDir, file);
                            const fileStats = await fs.stat(filePath);
                            
                            let fileCreationTime: Date;

                            if (fileStats.birthtime.getTime() !== 0) {
                                fileCreationTime = fileStats.birthtime;
                            } else {
                                fileCreationTime = fileStats.mtime;
                                console.warn(`Warning: birthtime not available for '${filePath}'. Using mtime instead.`);
                            }

                            if (lastExportTimestamp && fileCreationTime.toISOString() <= lastExportTimestamp) {
                                console.log(`Skipping '${filePath}' - created at ${fileCreationTime.toISOString()}, which is older than last export.`);
                                continue;
                            }
                            
                            const outputFilePath = path.join(outputDir, `${file}.xz`);
                            console.log(`Exporting and compressing '${filePath}' to '${outputFilePath}'.`);
                            
                            try {
                                const command = `xz -k -${compressionLevel} -T0 "${filePath}" -c > "${outputFilePath}"`;
                                await execAsync(command);
                            } catch (error) {
                                console.error(`Error compressing file '${filePath}':`, error);
                            }
                        }
                    }
                }
            }
        }

        await fs.writeFile(exportLockPath, startTime, 'utf-8');
        console.log(`Export completed. Updated export-lock with timestamp: ${startTime}`);

    } catch (error) {
        console.error('An error occurred during the export operation:', error);
        throw error;
    }
}
