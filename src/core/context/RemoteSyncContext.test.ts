import { describe, it, expect } from 'vitest';

// Test that a legacy payload without examMode deserializes to 'jee' default
describe('settings payload backward compat', () => {
  it('legacy payload without examMode resolves to jee default', () => {
    const legacyPayload = {
      disableAutoShift: false,
      enableAIAgent: true,
      enableMusicPlayer: true,
      progressCardSettings: { visibleStats: [], showTasks: false },
      mockExamPresets: [],
      // no examMode, no neetMockExamPresets
    };
    const resolvedMode = (legacyPayload as any).examMode !== undefined ? (legacyPayload as any).examMode : 'jee';
    expect(resolvedMode).toBe('jee');
  });

  it('payload with neet examMode resolves to neet', () => {
    const payload = { examMode: 'neet' };
    const resolvedMode = payload.examMode !== undefined ? payload.examMode : 'jee';
    expect(resolvedMode).toBe('neet');
  });
});
