/**
 * OJEE Tracker - Mock Scores Seeder Script
 * 
 * Paste this script directly in the browser's developer console (F12 > Console)
 * while running the OJEE Tracker application.
 * 
 * Features:
 *  1. Backup & Recovery: Backs up original mock scores to 'ojeet-mock-scores-backup' before seeding.
 *     Allows restoring with `restoreOriginalMockScores()`.
 *  2. Relative Dates: Aligns mock exam dates relative to current date (e.g. -5 days, -12 days, etc.).
 *  3. Param Coverage: Seeds JEE Main (jm), BITSAT (bt), and JEE Advanced (ja) mocks with:
 *     - Subject-wise scores, total marks, paper 1 & 2 breakdown (for ja)
 *     - Attempted vs wrong question counts
 *     - Subject-wise time spent
 *     - Tagged weak chapters and subtopics
 *     - Footnotes & reflection notes
 */

(() => {
  console.log("%c[Mock Scores Seeder] Initializing...", "color: #8b5cf6; font-weight: bold; font-size: 14px;");

  const today = new Date();
  
  // Helper: Format Date as YYYY-MM-DD
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  // 1. BACKUP CURRENT MOCK SCORES
  const originalMocks = localStorage.getItem("jee-tracker-mock-scores");
  if (originalMocks) {
    localStorage.setItem("ojeet-mock-scores-backup", originalMocks);
    console.log("%c[Backup] Original mock scores backed up to 'ojeet-mock-scores-backup'.", "color: #10b981;");
  }

  // Restore helper
  window.restoreOriginalMockScores = () => {
    const backup = localStorage.getItem("ojeet-mock-scores-backup");
    if (!backup) {
      console.error("[Mock Scores Seeder] No backup found.");
      return "No backup found.";
    }
    localStorage.setItem("jee-tracker-mock-scores", backup);
    localStorage.removeItem("ojeet-mock-scores-backup");
    console.log("%c[Restore] Restored original mock scores. Reloading...", "color: #10b981; font-weight: bold;");
    setTimeout(() => window.location.reload(), 500);
    return "Restoring...";
  };

  // Try to load real chapter structures to match names
  let subjectData = {};
  try {
    const raw = localStorage.getItem("jee-tracker-subject-data");
    if (raw) subjectData = JSON.parse(raw);
  } catch (e) {}

  const getChapterInfo = (subject, serial, fallbackName) => {
    const chapters = subjectData[subject]?.chapters || [];
    const ch = chapters.find(c => c.serial === serial);
    return {
      subject,
      chapterSerial: serial,
      chapterName: ch ? ch.name : fallbackName
    };
  };

  // Seed Mock Data using ALL parameters
  const seedMockScores = [
    {
      id: makeId("mock"),
      name: "JEE Main Practice Test 1",
      date: formatDate(addDays(today, -30)),
      examType: "jm",
      physicsMarks: 45,
      chemistryMarks: 50,
      mathsMarks: 35,
      totalMarks: 130,
      maxMarks: 300,
      attemptedQuestions: { physics: 15, chemistry: 18, maths: 12 },
      wrongQuestions: { physics: 3, chemistry: 5, maths: 3 },
      totalTimeAllotted: 180,
      timeSpent: { physics: 65, chemistry: 50, maths: 65 },
      weakChapters: [
        getChapterInfo("physics", 4, "Laws of Motion"),
        getChapterInfo("maths", 2, "Quadratic Equations")
      ],
      weakSubtopics: [
        { ...getChapterInfo("physics", 4, "Laws of Motion"), subtopicName: "Newton's Third Law" }
      ],
      footnotes: "Need to work on speed in Maths. Chemistry organic section had many silly errors."
    },
    {
      id: makeId("mock"),
      name: "BITSAT Full Test 1",
      date: formatDate(addDays(today, -25)),
      examType: "bt",
      physicsMarks: 75,
      chemistryMarks: 82,
      mathsMarks: 90,
      totalMarks: 247,
      maxMarks: 390,
      attemptedQuestions: { physics: 28, chemistry: 30, maths: 32 },
      wrongQuestions: { physics: 3, chemistry: 2, maths: 2 },
      totalTimeAllotted: 180,
      timeSpent: { physics: 55, chemistry: 50, maths: 75 },
      weakChapters: [
        getChapterInfo("chemistry", 14, "Chemical Kinetics")
      ],
      footnotes: "Decent score but missed several easy chemistry physical questions due to calculation errors."
    },
    {
      id: makeId("mock"),
      name: "FIITJEE AITS Mains Mock 2",
      date: formatDate(addDays(today, -20)),
      examType: "jm",
      physicsMarks: 62,
      chemistryMarks: 58,
      mathsMarks: 48,
      totalMarks: 168,
      maxMarks: 300,
      attemptedQuestions: { physics: 18, chemistry: 20, maths: 15 },
      wrongQuestions: { physics: 2, chemistry: 5, maths: 3 },
      totalTimeAllotted: 180,
      timeSpent: { physics: 60, chemistry: 55, maths: 65 },
      weakChapters: [
        getChapterInfo("chemistry", 3, "Chemical Bonding")
      ],
      weakSubtopics: [
        { ...getChapterInfo("chemistry", 3, "Chemical Bonding"), subtopicName: "Hybridization" }
      ],
      footnotes: "Maths paper was extremely tough. Chemistry inorganic needs revision."
    },
    {
      id: makeId("mock"),
      name: "Allen Advanced Practice Test 1",
      date: formatDate(addDays(today, -15)),
      examType: "ja",
      physicsMarks: 60,
      chemistryMarks: 65,
      mathsMarks: 58,
      totalMarks: 183,
      maxMarks: 360,
      paper1Marks: { physics: 32, chemistry: 30, maths: 28 },
      paper2Marks: { physics: 28, chemistry: 35, maths: 30 },
      attemptedQuestions: { physics: 24, chemistry: 26, maths: 22 },
      wrongQuestions: { physics: 4, chemistry: 3, maths: 3 },
      totalTimeAllotted: 360,
      timeSpent: { physics: 120, chemistry: 100, maths: 140 },
      weakChapters: [
        getChapterInfo("physics", 11, "Rotational Motion"),
        getChapterInfo("maths", 15, "Limits & Continuity")
      ],
      footnotes: "Advanced paper 2 was exhausting. Rotational mechanics questions were highly conceptual."
    },
    {
      id: makeId("mock"),
      name: "Mathongo Mains Full Test 5",
      date: formatDate(addDays(today, -10)),
      examType: "jm",
      physicsMarks: 78,
      chemistryMarks: 72,
      mathsMarks: 65,
      totalMarks: 215,
      maxMarks: 300,
      attemptedQuestions: { physics: 22, chemistry: 21, maths: 19 },
      wrongQuestions: { physics: 2, chemistry: 3, maths: 2 },
      totalTimeAllotted: 180,
      timeSpent: { physics: 55, chemistry: 50, maths: 75 },
      weakChapters: [
        getChapterInfo("chemistry", 21, "Hydrocarbons")
      ],
      weakSubtopics: [
        { ...getChapterInfo("chemistry", 21, "Hydrocarbons"), subtopicName: "Alkenes & Alkynes" }
      ],
      footnotes: "Excellent improvement in Physics speed. Maths is still a bottleneck."
    },
    {
      id: makeId("mock"),
      name: "NTA Abhyas Mock 22",
      date: formatDate(addDays(today, -5)),
      examType: "jm",
      physicsMarks: 85,
      chemistryMarks: 80,
      mathsMarks: 72,
      totalMarks: 237,
      maxMarks: 300,
      attemptedQuestions: { physics: 24, chemistry: 23, maths: 20 },
      wrongQuestions: { physics: 1, chemistry: 2, maths: 1 },
      totalTimeAllotted: 180,
      timeSpent: { physics: 50, chemistry: 50, maths: 80 },
      weakChapters: [
        getChapterInfo("maths", 7, "Binomial Theorem")
      ],
      footnotes: "Highest score so far! Accuracy was outstanding. Minor revision needed in Binomial Theorem."
    }
  ];

  localStorage.setItem("jee-tracker-mock-scores", JSON.stringify(seedMockScores));

  console.log("%c[Mock Scores Seeder] Success! Seeded 6 comprehensive mock scores.", "color: #10b981; font-weight: bold;");
  console.log("To restore original scores, run: restoreOriginalMockScores()");
  console.log("Reloading page to display seeded data...");
  setTimeout(() => window.location.reload(), 1000);
})();
