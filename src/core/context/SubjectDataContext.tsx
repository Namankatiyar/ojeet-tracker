import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { useLocalStorage } from '../../shared/hooks/useLocalStorage';
import { Subject, SubjectData } from '../../shared/types';
import { parseSubjectCSV } from '../../shared/utils/csvParser';

interface SubjectDataContextType {
    subjectData: Record<Subject, SubjectData | null>;
    setSubjectData: (data: Record<Subject, SubjectData | null> | ((prev: Record<Subject, SubjectData | null>) => Record<Subject, SubjectData | null>)) => void;
    mergedSubjectData: Record<Subject, SubjectData | null>;
    customColumns: Record<Subject, string[]>;
    setCustomColumns: (cols: Record<Subject, string[]> | ((prev: Record<Subject, string[]>) => Record<Subject, string[]>)) => void;
    excludedColumns: Record<Subject, string[]>;
    setExcludedColumns: (cols: Record<Subject, string[]> | ((prev: Record<Subject, string[]>) => Record<Subject, string[]>)) => void;
    materialOrder: Record<Subject, string[]>;
    setMaterialOrder: (order: Record<Subject, string[]> | ((prev: Record<Subject, string[]>) => Record<Subject, string[]>)) => void;
    handleAddColumn: (subject: Subject, columnName: string) => void;
    handleRemoveColumn: (subject: Subject, columnName: string) => void;
    handleReorderMaterials: (subject: Subject, materials: string[]) => void;
    handleAddChapter: (subject: Subject, name: string) => void;
    handleRemoveChapter: (subject: Subject, serial: number) => void;
    handleRenameChapter: (subject: Subject, serial: number, newName: string) => void;
    handleReorderChapters: (subject: Subject, newOrderChapters: any[]) => void;
}

const SubjectDataContext = createContext<SubjectDataContextType | undefined>(undefined);

export const SubjectDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [subjectData, setSubjectData] = useLocalStorage<Record<Subject, SubjectData | null>>('jee-tracker-subject-data', {
        physics: null,
        chemistry: null,
        maths: null,
    });

    const [customColumns, setCustomColumns] = useLocalStorage<Record<Subject, string[]>>('jee-tracker-custom-columns', {
        physics: [],
        chemistry: [],
        maths: []
    });
    const [excludedColumns, setExcludedColumns] = useLocalStorage<Record<Subject, string[]>>('jee-tracker-excluded-columns', {
        physics: [],
        chemistry: [],
        maths: []
    });
    const [materialOrder, setMaterialOrder] = useLocalStorage<Record<Subject, string[]>>('jee-tracker-material-order', {
        physics: [],
        chemistry: [],
        maths: []
    });

    // Load CSV data if not in local storage
    useEffect(() => {
        const loadSubjectData = async (subject: Subject) => {
            try {
                const data = await parseSubjectCSV(subject);
                setSubjectData(prev => {
                    if (prev[subject] && prev[subject]?.chapters && prev[subject]!.chapters.length > 0) {
                        return prev;
                    }
                    return { ...prev, [subject]: data };
                });
            } catch (error) {
                console.error(`Failed to load ${subject} data:`, error);
            }
        };

        if (!subjectData.physics?.chapters?.length) loadSubjectData('physics');
        if (!subjectData.chemistry?.chapters?.length) loadSubjectData('chemistry');
        if (!subjectData.maths?.chapters?.length) loadSubjectData('maths');
    }, []);

    // Merge CSV data with custom columns and filter excluded ones
    const mergedSubjectData = useMemo(() => {
        const merged: Record<Subject, SubjectData | null> = { physics: null, chemistry: null, maths: null };
        (['physics', 'chemistry', 'maths'] as Subject[]).forEach(subject => {
            const data = subjectData[subject];
            if (!data) return;

            const custom = customColumns[subject] || [];
            const excluded = excludedColumns[subject] || [];

            const uniqueCustom = custom.filter(c => !data.materialNames.includes(c));
            let activeMaterials = [...data.materialNames, ...uniqueCustom].filter(m => !excluded.includes(m));

            const order = materialOrder[subject] || [];

            if (order.length > 0) {
                const orderedActive = order.filter(m => activeMaterials.includes(m));
                const newItems = activeMaterials.filter(m => !orderedActive.includes(m));
                activeMaterials = [...orderedActive, ...newItems];
            }

            merged[subject] = {
                ...data,
                materialNames: activeMaterials,
                chapters: data.chapters.map(c => ({
                    ...c,
                    materials: activeMaterials
                }))
            };
        });
        return merged;
    }, [subjectData, customColumns, excludedColumns, materialOrder]);

    const handleAddColumn = useCallback((subject: Subject, columnName: string) => {
        if (!columnName.trim()) return;
        if (excludedColumns[subject]?.includes(columnName.trim())) {
            setExcludedColumns(prev => ({
                ...prev,
                [subject]: prev[subject].filter(c => c !== columnName.trim())
            }));
            return;
        }

        setCustomColumns(prev => ({
            ...prev,
            [subject]: [...(prev[subject] || []), columnName.trim()]
        }));
    }, [excludedColumns, setExcludedColumns, setCustomColumns]);

    const handleRemoveColumn = useCallback((subject: Subject, columnName: string) => {
        const isCustom = customColumns[subject]?.includes(columnName);

        if (isCustom) {
            setCustomColumns(prev => ({
                ...prev,
                [subject]: prev[subject].filter(c => c !== columnName)
            }));
        } else {
            setExcludedColumns(prev => ({
                ...prev,
                [subject]: [...(prev[subject] || []), columnName]
            }));
        }
    }, [customColumns, setCustomColumns, setExcludedColumns]);

    const handleReorderMaterials = useCallback((subject: Subject, materials: string[]) => {
        setMaterialOrder(prev => ({
            ...prev,
            [subject]: materials
        }));
    }, [setMaterialOrder]);

    const handleAddChapter = useCallback((subject: Subject, name: string) => {
        setSubjectData(prev => {
            const data = prev[subject];
            if (!data) return prev;

            const maxSerial = data.chapters.reduce((max, c) => Math.max(max, c.serial), 0);
            const newChapter = {
                serial: maxSerial + 1,
                name: name.trim(),
                materials: data.materialNames
            };

            return {
                ...prev,
                [subject]: {
                    ...data,
                    chapters: [...data.chapters, newChapter]
                }
            };
        });
    }, [setSubjectData]);

    const handleRemoveChapter = useCallback((subject: Subject, serial: number) => {
        setSubjectData(prev => {
            const data = prev[subject];
            if (!data) return prev;

            return {
                ...prev,
                [subject]: {
                    ...data,
                    chapters: data.chapters.filter(c => c.serial !== serial)
                }
            };
        });
    }, [setSubjectData]);

    const handleRenameChapter = useCallback((subject: Subject, serial: number, newName: string) => {
        setSubjectData(prev => {
            const data = prev[subject];
            if (!data) return prev;

            return {
                ...prev,
                [subject]: {
                    ...data,
                    chapters: data.chapters.map(c => c.serial === serial ? { ...c, name: newName.trim() } : c)
                }
            };
        });
    }, [setSubjectData]);

    const handleReorderChapters = useCallback((subject: Subject, newOrderChapters: any[]) => {
        setSubjectData(prev => {
            const data = prev[subject];
            if (!data) return prev;

            return {
                ...prev,
                [subject]: {
                    ...data,
                    chapters: newOrderChapters
                }
            };
        });
    }, [setSubjectData]);

    return (
        <SubjectDataContext.Provider value={{
            subjectData, setSubjectData, mergedSubjectData,
            customColumns, setCustomColumns, excludedColumns, setExcludedColumns, materialOrder, setMaterialOrder,
            handleAddColumn, handleRemoveColumn, handleReorderMaterials,
            handleAddChapter, handleRemoveChapter, handleRenameChapter, handleReorderChapters
        }}>
            {children}
        </SubjectDataContext.Provider>
    );
};

export const useSubjectData = () => {
    const context = useContext(SubjectDataContext);
    if (context === undefined) {
        throw new Error('useSubjectData must be used within a SubjectDataProvider');
    }
    return context;
};
