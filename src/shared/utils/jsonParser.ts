import { Chapter, SubjectData } from '../types';

interface JSONUnit {
    unit_number: number;
    unit_name: string;
    subtopics: string[];
}

interface ChemistrySyllabus {
    Physical_Chemistry?: JSONUnit[];
    Inorganic_Chemistry?: JSONUnit[];
    Organic_Chemistry?: JSONUnit[];
}

interface SyllabusResponse {
    JEE_Main_Physics_Syllabus_2026?: JSONUnit[];
    JEE_Main_Mathematics_Syllabus_2026?: JSONUnit[];
    JEE_Main_Chemistry_Syllabus_2026?: ChemistrySyllabus;
}

export async function parseSubjectJSON(subject: string): Promise<SubjectData> {
    const response = await fetch(`/data/${subject}.json`);
    if (!response.ok) {
        throw new Error(`Failed to fetch JSON for subject: ${subject}`);
    }
    const data: SyllabusResponse = await response.json();

    let units: JSONUnit[] = [];

    if (subject === 'physics') {
        units = data.JEE_Main_Physics_Syllabus_2026 || [];
    } else if (subject === 'maths') {
        units = data.JEE_Main_Mathematics_Syllabus_2026 || [];
    } else if (subject === 'chemistry') {
        const chemData = data.JEE_Main_Chemistry_Syllabus_2026;
        if (chemData) {
            units = [
                ...(chemData.Physical_Chemistry || []),
                ...(chemData.Inorganic_Chemistry || []),
                ...(chemData.Organic_Chemistry || []),
            ];
        }
    }

    // Sort units by unit_number to ensure correct sequence
    units.sort((a, b) => a.unit_number - b.unit_number);

    const materialNames = ['NCERT', 'PYQs', 'Modules'];

    const chapters: Chapter[] = units.map((unit) => ({
        serial: unit.unit_number,
        name: unit.unit_name,
        materials: [...materialNames],
    }));

    return {
        chapters,
        materialNames,
    };
}
