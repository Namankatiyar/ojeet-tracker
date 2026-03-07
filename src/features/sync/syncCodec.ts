import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { EncodedPayload, SyncChunkRow, SyncPayloadV1, SYNC_MAX_COMPRESSED_BYTES } from './syncTypes';

const encoder = new TextEncoder();

export function getUtf8ByteLength(value: string): number {
    return encoder.encode(value).length;
}

export function compressSyncPayload(payload: SyncPayloadV1): string {
    const serialized = JSON.stringify(payload);
    const compressed = compressToEncodedURIComponent(serialized);
    if (!compressed) {
        throw new Error('Failed to compress sync payload.');
    }
    return compressed;
}

export function decompressSyncPayload(compressedPayload: string): SyncPayloadV1 {
    const decompressed = decompressFromEncodedURIComponent(compressedPayload);
    if (!decompressed) {
        throw new Error('Failed to decompress sync payload.');
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(decompressed);
    } catch {
        throw new Error('Failed to parse decompressed sync payload JSON.');
    }

    if (!parsed || typeof parsed !== 'object' || !('schemaVersion' in parsed)) {
        throw new Error('Invalid sync payload format.');
    }

    return parsed as SyncPayloadV1;
}

function fallbackFnv1aHex(input: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function computeChecksum(input: string): Promise<string> {
    const data = encoder.encode(input);
    if (globalThis.crypto?.subtle) {
        const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
    }
    return fallbackFnv1aHex(input);
}

export function splitCompressedPayload(compressedPayload: string, maxChunkBytes = SYNC_MAX_COMPRESSED_BYTES): string[] {
    if (maxChunkBytes <= 0) {
        throw new Error('maxChunkBytes must be greater than zero.');
    }

    const bytes = getUtf8ByteLength(compressedPayload);
    if (bytes <= maxChunkBytes) {
        return [compressedPayload];
    }

    // compressToEncodedURIComponent produces ASCII-safe output; char split aligns with byte split.
    const chunkSize = maxChunkBytes;
    const chunks: string[] = [];
    for (let index = 0; index < compressedPayload.length; index += chunkSize) {
        const chunk = compressedPayload.slice(index, index + chunkSize);
        chunks.push(chunk);
    }

    return chunks;
}

export function reconstructCompressedPayload(chunks: string[] | SyncChunkRow[]): string {
    if (chunks.length === 0) return '';

    if (typeof chunks[0] === 'string') {
        return (chunks as string[]).join('');
    }

    return (chunks as SyncChunkRow[])
        .slice()
        .sort((a, b) => a.chunk_index - b.chunk_index)
        .map((row) => row.chunk_data)
        .join('');
}

export async function encodeSyncPayload(payload: SyncPayloadV1, maxChunkBytes = SYNC_MAX_COMPRESSED_BYTES): Promise<EncodedPayload> {
    const compressed = compressSyncPayload(payload);
    const compressedBytes = getUtf8ByteLength(compressed);
    const checksum = await computeChecksum(compressed);

    if (compressedBytes <= maxChunkBytes) {
        return {
            storage: 'inline',
            compressed,
            compressedBytes,
            checksum,
            chunkCount: 0,
        };
    }

    const chunks = splitCompressedPayload(compressed, maxChunkBytes);
    return {
        storage: 'chunked',
        compressed,
        compressedBytes,
        checksum,
        chunkCount: chunks.length,
        chunks,
    };
}
