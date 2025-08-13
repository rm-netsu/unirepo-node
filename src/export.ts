import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Exports canonical files to a specified directory, optionally filtering by a last export timestamp.
 * @param {string} repoRootPath The root directory of the repository, containing the canonical files.
 * @param {string} outputDir The directory where compressed files should be stored.
 * @param {string} lastExportTimestamp The timestamp from the last export-lock file.
 * @returns {Promise<void>} A promise that resolves when the export is complete.
 */
export async function exportFiles(
    repoRootPath: string,
    outputDir: string,
    lastExportTimestamp: string | null
): Promise<void> {
    const lookupDir = path.join(repoRootPath, 'lookup', 'sha256');
    const exportLockPath = path.join(repoRootPath, 'export-lock');
    const startTime = new Date().toISOString();

    console.log(`Starting export operation from '${lookupDir}'.`);

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

                            // Фильтрация по дате
                            if (lastExportTimestamp && fileStats.mtime.toISOString() <= lastExportTimestamp) {
                                console.log(`Skipping '${filePath}' - older than last export.`);
                                continue;
                            }
                            
                            const outputFilePath = path.join(outputDir, `${file}.xz`);
                            console.log(`Exporting and compressing '${filePath}' to '${outputFilePath}'.`);
                            
                            try {
                                const command = `xz -k -T0 -9 "${filePath}" -c > "${outputFilePath}"`;
                                await execAsync(command);
                            } catch (error) {
                                console.error(`Error compressing file '${filePath}':`, error);
                            }
                        }
                    }
                }
            }
        }

        // Обновляем export-lock файл
        await fs.writeFile(exportLockPath, startTime, 'utf-8');
        console.log(`Export completed. Updated export-lock with timestamp: ${startTime}`);

    } catch (error) {
        console.error('An error occurred during the export operation:', error);
        throw error;
    }
}
