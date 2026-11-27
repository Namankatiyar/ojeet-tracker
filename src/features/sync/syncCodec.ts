import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import {
  EncodedPayload,
  EncodedSplitPayload,
  SyncChunkRow,
  SyncPayloadV1,
  SYNC_MAX_COMPRESSED_BYTES,
  SYNC_SCHEMA_VERSION,
} from './syncTypes';

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

export function upgradeSyncPayloadToV2(payload: any): SyncPayloadV1 {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid sync payload format.');
  }

  const upgraded: SyncPayloadV1 = {
    ...payload,
    schemaVersion: SYNC_SCHEMA_VERSION,
    domains: {
      ...payload.domains,
      tombstones: payload.domains?.tombstones,
      modifiedAt: payload.domains?.modifiedAt,
    },
  };

  if (!upgraded.domains.tombstones) {
    delete upgraded.domains.tombstones;
  }
  if (!upgraded.domains.modifiedAt) {
    delete upgraded.domains.modifiedAt;
  }

  return upgraded;
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

  return upgradeSyncPayloadToV2(parsed);
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

export function splitCompressedPayload(
  compressedPayload: string,
  maxChunkBytes = SYNC_MAX_COMPRESSED_BYTES
): string[] {
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

export async function encodeSyncPayload(
  payload: SyncPayloadV1,
  maxChunkBytes = SYNC_MAX_COMPRESSED_BYTES
): Promise<EncodedPayload> {
  const compressed = compressSyncPayload(payload);
  const compressedBytes = getUtf8ByteLength(compressed);

  // Hash only the deterministic data to prevent generatedAt from breaking caching
  const dataString = JSON.stringify(payload.domains);
  const checksum = await computeChecksum(dataString);

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

function compressDomainGroup(data: unknown): string {
  const compressed = compressToEncodedURIComponent(JSON.stringify(data));
  if (!compressed) {
    throw new Error('Failed to compress split sync domain group.');
  }
  return compressed;
}

function decompressDomainGroup<T>(compressed: string): T {
  const decompressed = decompressFromEncodedURIComponent(compressed);
  if (!decompressed) {
    throw new Error('Failed to decompress split sync domain group.');
  }
  return JSON.parse(decompressed) as T;
}

/**
 * Encodes a SyncPayloadV1 into separate hot (progress, plannerTasks) and cold
 * (mockScores, examDates, settings, subjects, tombstones, modifiedAt) compressed blobs
 * for split_v2 storage, avoiding TOAST write amplification on cold domains.
 */
export async function encodeSplitSyncPayload(
  payload: SyncPayloadV1,
  maxBytes = SYNC_MAX_COMPRESSED_BYTES
): Promise<EncodedSplitPayload> {
  const hotObj = {
    progress: payload.domains.progress,
    plannerTasks: payload.domains.plannerTasks,
  };
  const coldObj: Record<string, unknown> = {
    mockScores: payload.domains.mockScores,
    examDates: payload.domains.examDates,
    settings: payload.domains.settings,
  };
  if (payload.domains.subjects !== undefined) coldObj.subjects = payload.domains.subjects;
  if (payload.domains.tombstones !== undefined) coldObj.tombstones = payload.domains.tombstones;
  if (payload.domains.modifiedAt !== undefined) coldObj.modifiedAt = payload.domains.modifiedAt;

  const hotSerialized = JSON.stringify(hotObj);
  const coldSerialized = JSON.stringify(coldObj);
  const hotCompressed = compressDomainGroup(hotObj);
  const coldCompressed = compressDomainGroup(coldObj);
  const hotBytes = getUtf8ByteLength(hotCompressed);
  const coldBytes = getUtf8ByteLength(coldCompressed);

  const [hotChecksum, coldChecksum, checksum] = await Promise.all([
    computeChecksum(hotSerialized),
    computeChecksum(coldSerialized),
    computeChecksum(JSON.stringify(payload.domains)),
  ]);

  return {
    hotCompressed,
    hotBytes,
    hotChecksum,
    coldCompressed,
    coldBytes,
    coldChecksum,
    checksum,
    fitsSplitInline: hotBytes <= maxBytes && coldBytes <= maxBytes,
  };
}

/**
 * Reconstructs a SyncPayloadV1 from split_v2 hot_payload and cold_payload columns.
 */
export function reconstructSplitSyncPayload(
  hotCompressed: string,
  coldCompressed: string
): SyncPayloadV1 {
  const hot = decompressDomainGroup<{
    progress: SyncPayloadV1['domains']['progress'];
    plannerTasks: SyncPayloadV1['domains']['plannerTasks'];
  }>(hotCompressed);
  const cold = decompressDomainGroup<{
    mockScores: SyncPayloadV1['domains']['mockScores'];
    examDates: SyncPayloadV1['domains']['examDates'];
    settings: SyncPayloadV1['domains']['settings'];
    subjects?: SyncPayloadV1['domains']['subjects'];
    tombstones?: SyncPayloadV1['domains']['tombstones'];
    modifiedAt?: SyncPayloadV1['domains']['modifiedAt'];
  }>(coldCompressed);

  const domains: SyncPayloadV1['domains'] = {
    progress: hot.progress,
    plannerTasks: hot.plannerTasks,
    mockScores: cold.mockScores,
    examDates: cold.examDates,
    settings: cold.settings,
  };
  if (cold.subjects !== undefined) domains.subjects = cold.subjects;
  if (cold.tombstones !== undefined) domains.tombstones = cold.tombstones;
  if (cold.modifiedAt !== undefined) domains.modifiedAt = cold.modifiedAt;

  return {
    schemaVersion: SYNC_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    domains,
  };
}
