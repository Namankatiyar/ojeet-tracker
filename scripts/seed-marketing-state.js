/*
  Marketing seed script for OJEE Tracker.
  Run this in the browser console while the app is open (localhost or deployed URL).
  It will replace app localStorage data with a realistic "regularly used" state.
*/

(async () => {
  const SUBJECTS = ["physics", "chemistry", "maths"];
  const MATERIAL_PRIORITIES = ["NCERT", "PYQs", "Modules", "Revision"];

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatTime = (date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const toIsoOnDate = (dateStr, timeStr, plusMinutes = 0) => {
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    dt.setMinutes(dt.getMinutes() + plusMinutes);
    return dt.toISOString();
  };

  const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const stableNoise = (n) => {
    const x = Math.sin(n * 9999.9) * 10000;
    return x - Math.floor(x);
  };

  const parseCsv = (csvText) => {
    const lines = csvText.trim().split(/\r?\n/);
    const headers = lines[0].split(",").map((h) => h.trim());
    const materialNames = headers.filter((h) => h !== "serial" && h !== "chapter");
    const chapters = lines.slice(1).map((line) => {
      const parts = line.split(",");
      const serial = Number(parts[0]?.trim());
      const name = (parts[1] || "").trim();
      return { serial, name, materials: [...materialNames] };
    }).filter((c) => Number.isFinite(c.serial) && c.name);
    return { chapters, materialNames };
  };

  const loadSubjectData = async (subject) => {
    const res = await fetch(`/data/${subject}.csv`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${subject}.csv`);
    return parseCsv(await res.text());
  };

  const id = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  const subjectData = {
    physics: await loadSubjectData("physics"),
    chemistry: await loadSubjectData("chemistry"),
    maths: await loadSubjectData("maths"),
  };

  const customColumns = {
    physics: ["Revision"],
    chemistry: ["Revision"],
    maths: ["Revision"],
  };

  const excludedColumns = {
    physics: [],
    chemistry: [],
    maths: [],
  };

  const materialOrder = {};
  for (const subject of SUBJECTS) {
    const mats = [...subjectData[subject].materialNames, ...customColumns[subject]];
    materialOrder[subject] = MATERIAL_PRIORITIES.filter((m) => mats.includes(m)).concat(
      mats.filter((m) => !MATERIAL_PRIORITIES.includes(m))
    );
  }

  const activeMaterialsBySubject = {};
  for (const subject of SUBJECTS) {
    const base = [...subjectData[subject].materialNames, ...customColumns[subject]];
    const active = base.filter((m) => !excludedColumns[subject].includes(m));
    const ordered = materialOrder[subject].filter((m) => active.includes(m));
    activeMaterialsBySubject[subject] = ordered.concat(active.filter((m) => !ordered.includes(m)));
  }

  const progress = { physics: {}, chemistry: {}, maths: {} };
  for (const subject of SUBJECTS) {
    const chapters = subjectData[subject].chapters;
    const total = chapters.length;
    for (let i = 0; i < chapters.length; i += 1) {
      const chapter = chapters[i];
      const completionRatio = 1 - i / Math.max(total, 1);
      const priority = i < Math.floor(total * 0.2)
        ? "high"
        : i < Math.floor(total * 0.5)
          ? "medium"
          : i < Math.floor(total * 0.8)
            ? "low"
            : "none";

      const completed = {};
      activeMaterialsBySubject[subject].forEach((material, matIndex) => {
        const boost = material === "NCERT" ? 0.15 : material === "Revision" ? -0.12 : 0;
        const threshold = 0.18 + (matIndex * 0.08) - boost;
        const n = stableNoise(chapter.serial * 10 + matIndex + subject.length);
        completed[material] = completionRatio + n * 0.12 > threshold;
      });

      progress[subject][chapter.serial] = { completed, priority };
    }
  }

  const today = new Date();
  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(addDays(today, -1));
  const tomorrowStr = formatDate(addDays(today, 1));
  const plus2Str = formatDate(addDays(today, 2));
  const plus3Str = formatDate(addDays(today, 3));
  const plus5Str = formatDate(addDays(today, 5));
  const plus8Str = formatDate(addDays(today, 8));

  const chapterBySerial = (subject, serial) =>
    subjectData[subject].chapters.find((c) => c.serial === serial) || subjectData[subject].chapters[0];

  const makeChapterTask = ({ day, time, subject, serial, material, completed, wasShifted = false }) => {
    const chapter = chapterBySerial(subject, serial);
    return {
      id: id("task"),
      title: chapter.name,
      subtitle: material,
      date: day,
      time,
      completed,
      type: "chapter",
      subject,
      chapterSerial: chapter.serial,
      material,
      completedAt: completed ? toIsoOnDate(day, time, 70) : undefined,
      wasShifted,
    };
  };

  const plannerTasks = [
    makeChapterTask({ day: todayStr, time: "06:30", subject: "physics", serial: 12, material: "NCERT", completed: true }),
    makeChapterTask({ day: todayStr, time: "09:00", subject: "chemistry", serial: 17, material: "PYQs", completed: false }),
    makeChapterTask({ day: todayStr, time: "11:45", subject: "maths", serial: 22, material: "Modules", completed: false }),
    makeChapterTask({ day: todayStr, time: "15:30", subject: "physics", serial: 19, material: "Revision", completed: false, wasShifted: true }),
    makeChapterTask({ day: todayStr, time: "18:15", subject: "chemistry", serial: 24, material: "NCERT", completed: true }),
    {
      id: id("task"),
      title: "Analyze full mock test mistakes",
      date: todayStr,
      time: "20:30",
      completed: false,
      type: "custom",
      subject: "maths",
    },
    makeChapterTask({ day: tomorrowStr, time: "07:15", subject: "maths", serial: 28, material: "Revision", completed: false }),
    makeChapterTask({ day: tomorrowStr, time: "10:00", subject: "physics", serial: 21, material: "PYQs", completed: false }),
    makeChapterTask({ day: plus2Str, time: "08:00", subject: "chemistry", serial: 26, material: "Modules", completed: false }),
    makeChapterTask({ day: plus2Str, time: "17:30", subject: "physics", serial: 23, material: "Revision", completed: false }),
    makeChapterTask({ day: plus3Str, time: "06:45", subject: "chemistry", serial: 28, material: "Revision", completed: false }),
    {
      id: id("task"),
      title: "NCERT formula recap sprint",
      date: plus3Str,
      time: "21:00",
      completed: false,
      type: "custom",
      subject: "physics",
    },
    makeChapterTask({ day: plus5Str, time: "08:30", subject: "maths", serial: 24, material: "PYQs", completed: false }),
    makeChapterTask({ day: plus8Str, time: "09:30", subject: "physics", serial: 24, material: "Modules", completed: false }),
    makeChapterTask({ day: yesterdayStr, time: "19:30", subject: "chemistry", serial: 23, material: "Revision", completed: false, wasShifted: true }),
  ];

  const studySessions = [];
  for (let dayOffset = -28; dayOffset <= -1; dayOffset += 1) {
    const sessionCount = 1 + (Math.abs(dayOffset) % 2);
    for (let s = 0; s < sessionCount; s += 1) {
      const subject = SUBJECTS[(Math.abs(dayOffset) + s) % SUBJECTS.length];
      const chapters = subjectData[subject].chapters;
      const chapter = chapters[(Math.abs(dayOffset) * 3 + s * 5) % chapters.length];
      const duration = 35 * 60 + ((Math.abs(dayOffset) + s * 7) % 55) * 60;
      const date = addDays(today, dayOffset);
      date.setHours(6 + s * 4 + (Math.abs(dayOffset) % 3), (Math.abs(dayOffset) * 11) % 60, 0, 0);
      const startTime = date.toISOString();
      const endTime = new Date(date.getTime() + duration * 1000).toISOString();
      const material = activeMaterialsBySubject[subject][(s + chapter.serial) % activeMaterialsBySubject[subject].length];
      studySessions.push({
        id: id("session"),
        title: `${subject[0].toUpperCase()}${subject.slice(1)} > ${chapter.name} > ${material}`,
        subject,
        chapterSerial: chapter.serial,
        chapterName: chapter.name,
        material,
        type: "chapter",
        startTime,
        endTime,
        duration,
        timerMode: s % 3 === 0 ? "pomodoro" : s % 3 === 1 ? "stopwatch" : "countdown",
      });
    }
  }

  studySessions.push(
    {
      id: id("session"),
      title: "Full Length Mock Test",
      type: "custom",
      startTime: toIsoOnDate(yesterdayStr, "13:00"),
      endTime: toIsoOnDate(yesterdayStr, "16:00"),
      duration: 3 * 60 * 60,
      timerMode: "custom",
    },
    {
      id: id("session"),
      title: "Mistake Log Review",
      subject: "chemistry",
      type: "custom",
      startTime: toIsoOnDate(todayStr, "05:10"),
      endTime: toIsoOnDate(todayStr, "05:55"),
      duration: 45 * 60,
      timerMode: "stopwatch",
    }
  );

  const mockScores = [
    { name: "Allen Part Test 3", daysAgo: 65, p: 56, c: 61, m: 54 },
    { name: "NTA Abhyas Mock 12", daysAgo: 54, p: 62, c: 64, m: 58 },
    { name: "Resonance CBT 5", daysAgo: 43, p: 68, c: 65, m: 61 },
    { name: "Mathongo FT 7", daysAgo: 32, p: 72, c: 69, m: 67 },
    { name: "NTA Abhyas Mock 22", daysAgo: 24, p: 77, c: 71, m: 70 },
    { name: "Allen Major Test 2", daysAgo: 16, p: 80, c: 74, m: 75 },
    { name: "Resonance Grand Test", daysAgo: 9, p: 83, c: 76, m: 78 },
    { name: "Mathongo FTS 11", daysAgo: 3, p: 86, c: 79, m: 82 },
  ].map((x) => {
    const totalMarks = x.p + x.c + x.m;
    return {
      id: id("mock"),
      name: x.name,
      date: formatDate(addDays(today, -x.daysAgo)),
      physicsMarks: x.p,
      chemistryMarks: x.c,
      mathsMarks: x.m,
      totalMarks,
      maxMarks: 300,
    };
  });

  const examDates = [
    { id: id("exam"), name: "JEE Main 2027 Session 1", date: "2027-01-20", isPrimary: true },
    { id: id("exam"), name: "JEE Main 2027 Session 2", date: "2027-04-09", isPrimary: false },
    { id: id("exam"), name: "JEE Advanced 2027", date: "2027-05-23", isPrimary: false },
    { id: id("exam"), name: "OJEE 2027", date: "2027-05-10", isPrimary: false },
  ];

  const progressCardSettings = {
    userName: "Aarav Singh",
    customAvatarUrl: "",
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

  const keysToClear = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith("jee-") ||
      key.startsWith("ojeet-") ||
      key.startsWith("studyClock_")
    ) {
      keysToClear.push(key);
    }
  }
  keysToClear.forEach((k) => localStorage.removeItem(k));

  setJSON("jee-tracker-theme", "dark");
  setJSON("jee-tracker-accent", "#14b8a6");
  setJSON("jee-tracker-background-url", "");
  setJSON("jee-tracker-dim-level", 22);
  setJSON("jee-tracker-glass-intensity", 72);
  setJSON("jee-tracker-glass-refraction", 58);
  setJSON("jee-tracker-quote-index", 11);

  setJSON("jee-tracker-subject-data", subjectData);
  setJSON("jee-tracker-custom-columns", customColumns);
  setJSON("jee-tracker-excluded-columns", excludedColumns);
  setJSON("jee-tracker-material-order", materialOrder);
  setJSON("jee-tracker-progress", progress);
  setJSON("jee-tracker-filter-physics", "all");
  setJSON("jee-tracker-filter-chemistry", "all");
  setJSON("jee-tracker-filter-maths", "all");

  setJSON("jee-tracker-planner-tasks", plannerTasks);
  setJSON("ojeet-planner-view", "weekly");
  setJSON("jee-tracker-disable-auto-shift", false);
  setJSON("jee-tracker-study-sessions", studySessions);
  setJSON("jee-tracker-mock-scores", mockScores);
  setJSON("jee-exam-dates", examDates);
  setJSON("jee-secondary-exam-index", 1);
  setJSON("jee-tracker-progress-card", progressCardSettings);

  setJSON("studyClock_taskType", "task");
  setJSON("studyClock_selectedSubject", "physics");
  setJSON("studyClock_selectedChapter", 19);
  setJSON("studyClock_selectedMaterial", "Revision");
  setJSON("studyClock_customTitle", "");
  setJSON("studyClock_selectedTaskId", plannerTasks.find((t) => !t.completed)?.id || "");
  localStorage.removeItem("jee-timer-engine");
  setJSON("jee-timer-presets", [
    {
      id: id("preset"),
      name: "Deep Focus 90/15",
      subject: "physics",
      config: {
        mode: "pomodoro",
        pomodoro: {
          workMinutes: 90,
          shortBreakMinutes: 15,
          longBreakMinutes: 25,
          cyclesBeforeLongBreak: 2,
        },
      },
    },
    {
      id: id("preset"),
      name: "Mock Analysis Sprint",
      subject: "chemistry",
      config: {
        mode: "countdown",
        countdown: { minutes: 45, seconds: 0 },
      },
    },
  ]);

  localStorage.setItem("ojeet-sync-prompt-dismissed", "1");

  console.log("[OJEE Tracker] Marketing seed applied.");
  console.log(`[OJEE Tracker] Created ${plannerTasks.length} tasks, ${studySessions.length} sessions, ${mockScores.length} mock scores.`);
  window.location.reload();
})();
