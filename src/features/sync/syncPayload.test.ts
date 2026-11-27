import { describe, expect, it } from 'vitest';
import {
  buildSyncPayload,
  filterPlannerTasksForSync,
  getCustomSubjectDataForSync,
  hydrateSubjectDataWithBundledDefaults,
  isSubjectDataEqualToBundled,
} from './syncPayload';
import { AppProgress, ProgressCardSettings } from '../../shared/types';
import { getAllBundledSubjectData, getBundledSubjectData } from '../../shared/utils/syllabusData';

const baseProgress: AppProgress = {
  physics: {},
  chemistry: {},
  maths: {},
  biology: {},
};

const progressCardSettings: ProgressCardSettings = {
  userName: 'Naman',
  customAvatarUrl: 'https://example.com/avatar.png',
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
};

describe('syncPayload', () => {
  it('filters planner tasks to last 60 days plus future', () => {
    const now = new Date('2026-03-07T10:00:00.000Z');
    const filtered = filterPlannerTasksForSync(
      [
        {
          id: 'old',
          title: 'old',
          date: '2026-01-01',
          time: '10:00',
          completed: false,
          type: 'custom',
        },
        {
          id: 'edge',
          title: 'edge',
          date: '2026-01-06',
          time: '10:00',
          completed: false,
          type: 'custom',
        },
        {
          id: 'future',
          title: 'future',
          date: '2026-03-09',
          time: '10:00',
          completed: false,
          type: 'custom',
        },
      ],
      now,
      60
    );

    expect(filtered.map((t) => t.id)).toEqual(['edge', 'future']);
  });

  it('excludes avatar url and other profile settings in synced settings payload', () => {
    const payload = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings: {
        ...progressCardSettings,
        bannerUrl: 'https://example.com/banner.png',
        customStatus: 'Studying',
        gradeStatus: 'Class 12',
        targetExam: 'JEE 2026',
      },
      mockExamPresets: [],
      generatedAt: '2026-03-07T10:00:00.000Z',
    });

    expect(payload.domains.settings.progressCardSettings.userName).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.visibleStats.examCountdown).toBe(true);
    expect(payload.domains.settings.progressCardSettings.customAvatarUrl).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.bannerUrl).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.customStatus).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.gradeStatus).toBeUndefined();
    expect(payload.domains.settings.progressCardSettings.targetExam).toBeUndefined();
  });

  it('includes tombstones and modifiedAt when present, and excludes them when empty', () => {
    const payloadWithMetadata = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings,
      mockExamPresets: [],
      tombstones: {
        plannerTasks: [{ id: 'task-1', deletedAt: '2026-03-07T10:00:00.000Z' }],
      },
      domainsModifiedAt: {
        settings: '2026-03-07T10:00:00.000Z',
      },
    });

    expect(payloadWithMetadata.domains.tombstones).toEqual({
      plannerTasks: [{ id: 'task-1', deletedAt: '2026-03-07T10:00:00.000Z' }],
    });
    expect(payloadWithMetadata.domains.modifiedAt).toEqual({
      settings: '2026-03-07T10:00:00.000Z',
    });

    const payloadWithoutMetadata = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings,
      mockExamPresets: [],
      tombstones: {},
      domainsModifiedAt: {},
    });

    expect(payloadWithoutMetadata.domains.tombstones).toBeUndefined();
    expect(payloadWithoutMetadata.domains.modifiedAt).toBeUndefined();
  });

  it('omits unmodified bundled subjectData via getCustomSubjectDataForSync and omits domains.subjects when empty', () => {
    const bundledAll = getAllBundledSubjectData();
    expect(isSubjectDataEqualToBundled('physics', bundledAll.physics)).toBe(true);
    expect(getCustomSubjectDataForSync(bundledAll)).toEqual({});
    expect(
      getCustomSubjectDataForSync({ physics: null, chemistry: null, maths: null, biology: null })
    ).toEqual({});

    const emptyColumns = { physics: [], chemistry: [], maths: [], biology: [] };
    const payload = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings,
      mockExamPresets: [],
      subjects: {
        subjectData: bundledAll,
        customColumns: emptyColumns,
        excludedColumns: emptyColumns,
        materialOrder: emptyColumns,
      },
    });

    expect(payload.domains.subjects).toBeUndefined();
  });

  it('retains only modified subjectData keys and preserves domains.subjects when custom columns exist', () => {
    const bundledAll = getAllBundledSubjectData();
    bundledAll.physics.chapters.push({
      serial: 99,
      name: 'Custom Relativity',
      materials: [...bundledAll.physics.materialNames],
      isCustom: true,
    });

    const customOnly = getCustomSubjectDataForSync(bundledAll);
    expect(Object.keys(customOnly)).toEqual(['physics']);

    const emptyColumns = { physics: [], chemistry: [], maths: [], biology: [] };
    const payloadWithCustomChapter = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings,
      mockExamPresets: [],
      subjects: {
        subjectData: bundledAll,
        customColumns: emptyColumns,
        excludedColumns: emptyColumns,
        materialOrder: emptyColumns,
      },
    });

    expect(payloadWithCustomChapter.domains.subjects).toBeDefined();
    expect(Object.keys(payloadWithCustomChapter.domains.subjects!.subjectData)).toEqual(['physics']);
    const physicsDelta = payloadWithCustomChapter.domains.subjects!.subjectData.physics as any;
    expect(physicsDelta.isDelta).toBe(true);
    expect(physicsDelta.upsertChapters).toHaveLength(1);
    expect(physicsDelta.upsertChapters[0].serial).toBe(99);

    // Round-trip hydration restores full SubjectData including bundled chapters + custom chapter
    const roundTripped = hydrateSubjectDataWithBundledDefaults(
      payloadWithCustomChapter.domains.subjects!.subjectData
    );
    expect(roundTripped.physics.chapters).toHaveLength(
      getBundledSubjectData('physics').chapters.length + 1
    );
    expect(roundTripped.physics.chapters.find((c) => c.serial === 99)?.name).toBe(
      'Custom Relativity'
    );

    const payloadWithColumnsOnly = buildSyncPayload({
      progress: baseProgress,
      plannerTasks: [],
      mockScores: [],
      examDates: [],
      disableAutoShift: false,
      progressCardSettings,
      mockExamPresets: [],
      subjects: {
        subjectData: getAllBundledSubjectData(),
        customColumns: { physics: ['HC Verma'], chemistry: [], maths: [], biology: [] },
        excludedColumns: emptyColumns,
        materialOrder: emptyColumns,
      },
    });

    expect(payloadWithColumnsOnly.domains.subjects).toBeDefined();
    expect(payloadWithColumnsOnly.domains.subjects!.subjectData).toEqual({});
    expect(payloadWithColumnsOnly.domains.subjects!.customColumns.physics).toEqual(['HC Verma']);
  });

  it('hydrates missing or null subjectData keys with bundled defaults', () => {
    const customPhysics = getBundledSubjectData('physics');
    customPhysics.chapters[0].name = 'Custom Units & Measurements';

    const hydrated = hydrateSubjectDataWithBundledDefaults({
      physics: customPhysics,
      chemistry: null,
    });

    expect(hydrated.physics.chapters[0].name).toBe('Custom Units & Measurements');
    expect(hydrated.chemistry.chapters).toHaveLength(25);
    expect(hydrated.maths.chapters).toHaveLength(25);
    expect(hydrated.biology.chapters).toHaveLength(33);

    const hydratedEmpty = hydrateSubjectDataWithBundledDefaults(undefined);
    expect(hydratedEmpty.physics.chapters).toHaveLength(25);
    expect(hydratedEmpty.biology.chapters).toHaveLength(33);
  });
});
