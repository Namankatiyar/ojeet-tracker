import { SyncPayloadV1 } from './syncTypes';

export type SyncDomain = 'progress' | 'plannerTasks' | 'mockScores' | 'examDates' | 'settings' | 'subjects';

interface MergeOptions {
    hasLocalUnsyncedEdit: (domain: SyncDomain) => boolean;
}

export function mergePayloadDomainsWithPolicy(
    localPayload: SyncPayloadV1,
    remotePayload: SyncPayloadV1,
    options: MergeOptions
): SyncPayloadV1 {
    const merged: SyncPayloadV1 = {
        ...remotePayload,
        domains: {
            ...remotePayload.domains,
            settings: {
                ...remotePayload.domains.settings,
            },
        },
    };

    const useLocalForDomain = (domain: SyncDomain) => options.hasLocalUnsyncedEdit(domain);

    merged.domains.progress = useLocalForDomain('progress') || !remotePayload.domains.progress ? localPayload.domains.progress : remotePayload.domains.progress;
    merged.domains.plannerTasks = useLocalForDomain('plannerTasks') || !remotePayload.domains.plannerTasks ? localPayload.domains.plannerTasks : remotePayload.domains.plannerTasks;
    merged.domains.mockScores = useLocalForDomain('mockScores') || !remotePayload.domains.mockScores ? localPayload.domains.mockScores : remotePayload.domains.mockScores;
    merged.domains.examDates = useLocalForDomain('examDates') || !remotePayload.domains.examDates ? localPayload.domains.examDates : remotePayload.domains.examDates;
    merged.domains.settings = useLocalForDomain('settings') || !remotePayload.domains.settings ? localPayload.domains.settings : remotePayload.domains.settings;
    merged.domains.subjects = useLocalForDomain('subjects') || !remotePayload.domains.subjects ? localPayload.domains.subjects : remotePayload.domains.subjects;

    return merged;
}
