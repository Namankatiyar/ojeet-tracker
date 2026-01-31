import Papa from 'papaparse';
import { Chapter, SubjectData } from '../types';

export async function parseSubjectCSV(subject: string): Promise<SubjectData> {
    const response = await fetch(`/data/${subject}.csv`);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields || [];
                const materialNames = headers.filter(h => h !== 'serial' && h !== 'chapter');

                const chapters: Chapter[] = (results.data as Record<string, string>[]).map((row) => ({
                    serial: parseInt(row.serial, 10),
                    name: row.chapter,
                    materials: materialNames,
                }));

                resolve({ chapters, materialNames });
            },
            error: (error: Error) => {
                reject(error);
            },
        });
    });
}
