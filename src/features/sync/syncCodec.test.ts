import { describe, expect, it } from 'vitest';
import { computeChecksum, decompressSyncPayload, encodeSyncPayload, reconstructCompressedPayload, splitCompressedPayload } from './syncCodec';
import { SyncPayloadV1 } from './syncTypes';

const payload: SyncPayloadV1 = {
    schemaVersion: 1,
    generatedAt: '2026-03-07T10:00:00.000Z',
    domains: {
        progress: { physics: {}, chemistry: {}, maths: {} },
        plannerTasks: [{ id: 'a', title: 'task', date: '2026-03-07', time: '10:00', completed: false, type: 'custom' }],
        mockScores: [],
        examDates: [{ id: 'ex1', name: 'JEE Main', date: '2026-04-10', isPrimary: true }],
        settings: {
            disableAutoShift: false,
            progressCardSettings: {
                userName: 'Naman',
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
        },
    },
};

describe('syncCodec', () => {
    it('encodes and decodes payload losslessly', async () => {
        const encoded = await encodeSyncPayload(payload);
        const decoded = decompressSyncPayload(encoded.compressed);
        expect(decoded).toEqual(payload);
    });

    it('splits and reconstructs payload chunks', () => {
        const data = 'x'.repeat(1200);
        const chunks = splitCompressedPayload(data, 100);
        expect(chunks.length).toBeGreaterThan(1);

        const reconstructed = reconstructCompressedPayload(chunks);
        expect(reconstructed).toBe(data);
    });

    it('reconstructs chunk rows by chunk_index order', () => {
        const reconstructed = reconstructCompressedPayload([
            { chunk_index: 2, chunk_data: 'C' },
            { chunk_index: 0, chunk_data: 'A' },
            { chunk_index: 1, chunk_data: 'B' },
        ]);
        expect(reconstructed).toBe('ABC');
    });

    it('produces deterministic checksum for same input', async () => {
        const a = await computeChecksum('same-input');
        const b = await computeChecksum('same-input');
        const c = await computeChecksum('different-input');

        expect(a).toBe(b);
        expect(a).not.toBe(c);
    });

    it('returns chunked mode when maxChunkBytes is tiny', async () => {
        const encoded = await encodeSyncPayload(payload, 40);
        expect(encoded.storage).toBe('chunked');
        if (encoded.storage === 'chunked') {
            expect(encoded.chunkCount).toBeGreaterThan(1);
            expect(encoded.chunks.length).toBe(encoded.chunkCount);
        }
    });
});
