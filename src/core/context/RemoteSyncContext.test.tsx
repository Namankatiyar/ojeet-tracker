import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteSyncProvider } from './RemoteSyncContext';

type TableCalls = {
    selects: string[];
    upserts: number;
    inserts: number;
};

const supabaseState = vi.hoisted(() => {
    const tables = new Map<string, TableCalls>();
    const fromTables: string[] = [];

    const ensureTable = (table: string) => {
        if (!tables.has(table)) {
            tables.set(table, { selects: [], upserts: 0, inserts: 0 });
        }
        return tables.get(table)!;
    };

    const recordSelect = (table: string, selection?: string) => {
        ensureTable(table).selects.push(selection ?? '*');
    };
    const recordUpsert = (table: string) => {
        ensureTable(table).upserts += 1;
    };
    const recordInsert = (table: string) => {
        ensureTable(table).inserts += 1;
    };

    const resolveMaybeSingle = (table: string, selection?: string) => {
        if (table === 'user_sync_state' && selection?.includes('checksum')) {
            return { data: { checksum: 'abc', payload_version: 1 }, error: null };
        }
        if (table === 'user_study_aggregate') {
            return { data: null, error: null };
        }
        return { data: null, error: null };
    };

    const resolveSelect = (table: string) => {
        if (table === 'study_session_log') {
            return { data: [], error: null };
        }
        return { data: [], error: null };
    };

    const resolveInsertSelect = (table: string) => {
        if (table === 'study_session_log') {
            return { data: [], error: null };
        }
        return { data: [], error: null };
    };

    const createBuilder = (table: string) => {
        let selection: string | undefined;
        const builder: any = {
            select(sel?: string) {
                selection = sel;
                recordSelect(table, sel);
                return this;
            },
            eq() {
                return this;
            },
            gte() {
                return this;
            },
            gt() {
                return this;
            },
            order() {
                return this;
            },
            maybeSingle() {
                return Promise.resolve(resolveMaybeSingle(table, selection));
            },
            upsert() {
                recordUpsert(table);
                return Promise.resolve({ data: null, error: null });
            },
            insert() {
                recordInsert(table);
                return {
                    select(sel?: string) {
                        recordSelect(table, sel);
                        return Promise.resolve(resolveInsertSelect(table));
                    },
                };
            },
            then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
                return Promise.resolve(resolveSelect(table)).then(onFulfilled, onRejected);
            },
        };
        return builder;
    };

    const supabase = {
        from: vi.fn((table: string) => {
            fromTables.push(table);
            return createBuilder(table);
        }),
    };

    const reset = () => {
        tables.clear();
        fromTables.length = 0;
    };

    return { supabase, tables, fromTables, reset };
});

vi.mock('../../shared/lib/supabase', () => ({ supabase: supabaseState.supabase }));
vi.mock('./RemoteAuthContext', () => ({
    useRemoteAuth: () => ({ user: { id: 'user-1' }, isConfigured: true }),
}));
vi.mock('./UserProgressContext', () => ({
    useUserProgress: () => ({
        progress: { physics: {}, chemistry: {}, maths: {} },
        setProgress: vi.fn(),
        plannerTasks: [],
        setPlannerTasks: vi.fn(),
        studySessions: [],
        setStudySessions: vi.fn(),
        mockScores: [],
        setMockScores: vi.fn(),
        examDates: [],
        setExamDates: vi.fn(),
        disableAutoShift: false,
        setDisableAutoShift: vi.fn(),
        mockExamPresets: [],
        setMockExamPresets: vi.fn(),
        progressCardSettings: {
            userName: '',
            customAvatarUrl: '',
            visibleStats: {
                totalStudyTime: true,
                highestMockScore: true,
                highestDailyHours: true,
                highestWeekAverage: true,
                physicsTime: true,
                chemistryTime: true,
                mathsTime: true,
                physicsProgress: true,
                chemistryProgress: true,
                mathsProgress: true,
                examCountdown: true,
            },
        },
        setProgressCardSettings: vi.fn(),
    }),
    defaultMockExamPresets: [
        {
            id: 'jm',
            name: 'JEE Main',
            shortName: 'JM',
            paperCount: 1,
            subjectMaxMarks: { physics: 100, chemistry: 100, maths: 100 }
        }
    ],
}));
vi.mock('./SubjectDataContext', () => ({
    useSubjectData: () => ({
        subjectData: { physics: null, chemistry: null, maths: null },
        setSubjectData: vi.fn(),
        customColumns: { physics: [], chemistry: [], maths: [] },
        setCustomColumns: vi.fn(),
        excludedColumns: { physics: [], chemistry: [], maths: [] },
        setExcludedColumns: vi.fn(),
        materialOrder: { physics: [], chemistry: [], maths: [] },
        setMaterialOrder: vi.fn(),
    }),
}));
vi.mock('../../features/sync/syncCodec', () => ({
    computeChecksum: vi.fn().mockResolvedValue('same'),
    decompressSyncPayload: vi.fn(),
    encodeSyncPayload: vi.fn().mockResolvedValue({
        storage: 'inline',
        compressed: '',
        compressedBytes: 0,
        checksum: 'abc',
        chunkCount: 0,
    }),
    reconstructCompressedPayload: vi.fn(),
}));

describe('RemoteSyncContext egress optimizations', () => {
    beforeEach(() => {
        supabaseState.reset();
        localStorage.clear();
        localStorage.setItem('ojeet-remote-sync-remote-checksum', 'abc');
        localStorage.setItem('ojeet-remote-sync-last-session-delta-synced-at', JSON.stringify({ created_at: '2000-01-01T00:00:00.000Z' }));
        (globalThis as any).__APP_VERSION__ = 'test';
    });

    it('skips full payload and chunk fetches when checksum is unchanged', async () => {
        render(
            <RemoteSyncProvider>
                <div />
            </RemoteSyncProvider>
        );

        await waitFor(() => {
            const userSync = supabaseState.tables.get('user_sync_state');
            expect(userSync?.selects.length ?? 0).toBeGreaterThan(0);
        });

        const userSync = supabaseState.tables.get('user_sync_state');
        expect(userSync?.selects).toContain('checksum,payload_version');
        const fetchedPayload = (userSync?.selects ?? []).some((sel) => sel.includes('payload_inline') || sel.includes('payload_storage'));
        expect(fetchedPayload).toBe(false);
        expect(supabaseState.fromTables).not.toContain('user_sync_chunks');
        expect(userSync?.upserts ?? 0).toBe(0);
    });
});
