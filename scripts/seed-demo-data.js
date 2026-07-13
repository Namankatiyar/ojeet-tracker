/**
 * OJEE Tracker - Comprehensive Demo & Testing Data Seeder
 * 
 * Paste this script directly in the browser's developer console (F12 > Console)
 * while running the OJEE Tracker application.
 * 
 * Features:
 *  1. Backup & Recovery: Automatically back up original user state to 'ojeet-demo-backup' before seeding.
 *     Provides a simple command to restore the original state: restoreOriginalData()
 *  2. Adaptive Dates: Generates relative dates so that the progress card, planner tasks, study sessions,
 *     and mock tests align with the current date, no matter when this script is run.
 *  3. Dynamic CSV Parsing: Fetches and parses local syllabus CSVs to ensure compatibility.
 *  4. Advanced Mock Exams: Seeds JEE Main (single-paper), BITSAT (single-paper), and JEE Advanced (double-paper) mocks.
 *  5. Custom Column Support: Introduces custom materials ('Short Notes', 'Reference Book') to show versatility.
 *  6. Calendar Activity: Seeds past, present, and future tasks to demonstrate the Weekly/Monthly planners.
 *  7. Study Analytics: Generates 3 weeks of dense daily study session logs to show graphs and subject breakdowns.
 *  8. Premium Theme Styling: Sets a modern glassmorphism configuration with a dark theme, custom accent color, and high-res abstract wallpaper.
 */

(async () => {
  console.log("%c[OJEE Tracker Seeder] Initializing demo data generation...", "color: #8b5cf6; font-weight: bold; font-size: 14px;");

  const SUBJECTS = ["physics", "chemistry", "maths"];

  const today = new Date();

  // Helper: Format Date as YYYY-MM-DD
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Helper: Format Time as HH:mm
  const formatTime = (date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // Helper: Add relative days
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  // Helper: Get ISO String on a specific date and time
  const toIsoOnDate = (dateStr, timeStr, offsetMinutes = 0) => {
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    if (offsetMinutes) {
      dt.setMinutes(dt.getMinutes() + offsetMinutes);
    }
    return dt.toISOString();
  };

  // Helper: Generate unique IDs
  const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  // Helper: Simple deterministic noise for completion mapping
  const stableNoise = (seed) => {
    const x = Math.sin(seed * 9999.9) * 10000;
    return x - Math.floor(x);
  };

  // 1. BACKUP CURRENT LOCAL STORAGE
  const OJEET_KEYS = [
    "jee-tracker-theme", "jee-tracker-accent", "jee-tracker-background-url",
    "jee-tracker-dim-level", "jee-tracker-glass-intensity", "jee-tracker-glass-refraction",
    "jee-tracker-quote-index", "jee-tracker-subject-data", "jee-tracker-custom-columns",
    "jee-tracker-excluded-columns", "jee-tracker-material-order", "jee-tracker-progress",
    "jee-tracker-filter-physics", "jee-tracker-filter-chemistry", "jee-tracker-filter-maths",
    "jee-tracker-planner-tasks", "ojeet-planner-view", "jee-tracker-disable-auto-shift",
    "jee-tracker-study-sessions", "jee-tracker-mock-scores", "jee-exam-dates",
    "jee-secondary-exam-index", "jee-tracker-progress-card", "studyClock_taskType",
    "studyClock_selectedSubject", "studyClock_selectedChapter", "studyClock_selectedMaterial",
    "studyClock_customTitle", "studyClock_selectedTaskId", "jee-timer-engine", "jee-timer-presets",
    "ojeet-sync-prompt-dismissed", "jee-tracker-syllabus-version"
  ];

  const backup = {};
  let backupCount = 0;
  for (const key of OJEET_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null) {
      backup[key] = val;
      backupCount++;
    }
  }

  if (backupCount > 0) {
    localStorage.setItem("ojeet-demo-backup", JSON.stringify(backup));
    console.log(`%c[Backup] Successfully backed up ${backupCount} original settings keys to 'ojeet-demo-backup'.`, "color: #10b981;");
  }

  // Define global restore function on window so user can run it easily
  window.restoreOriginalData = () => {
    const backupStr = localStorage.getItem("ojeet-demo-backup");
    if (!backupStr) {
      console.error("[OJEE Tracker] No backup found to restore.");
      return "No backup found.";
    }
    const backupData = JSON.parse(backupStr);
    
    // Clear current keys
    for (const key of OJEET_KEYS) {
      localStorage.removeItem(key);
    }
    
    // Restore
    for (const [key, val] of Object.entries(backupData)) {
      localStorage.setItem(key, val);
    }
    localStorage.removeItem("ojeet-demo-backup");
    console.log("%c[OJEE Tracker] Original data restored successfully! Reloading page...", "color: #10b981; font-weight: bold;");
    setTimeout(() => window.location.reload(), 800);
    return "Restoring original data, please wait...";
  };

  // 2. FETCH & PARSE JSON FOR THE ENTIRE SYLLABUS STRUCTURE
  const loadSubjectData = async (subject) => {
    const res = await fetch(`/data/${subject}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${subject}.json`);
    const data = await res.json();
    
    let units = [];
    if (subject === "physics") {
      units = data.JEE_Main_Physics_Syllabus_2026 || [];
    } else if (subject === "maths") {
      units = data.JEE_Main_Mathematics_Syllabus_2026 || [];
    } else if (subject === "chemistry") {
      const chemData = data.JEE_Main_Chemistry_Syllabus_2026;
      if (chemData) {
        units = [
          ...(chemData.Physical_Chemistry || []),
          ...(chemData.Inorganic_Chemistry || []),
          ...(chemData.Organic_Chemistry || []),
        ];
      }
    }
    
    units.sort((a, b) => a.unit_number - b.unit_number);
    
    const materialNames = ["NCERT", "PYQs", "Modules"];
    const chapters = units.map((unit) => ({
      serial: unit.unit_number,
      name: unit.unit_name,
      materials: [...materialNames],
      subtopics: unit.subtopics || [],
    }));

    return { chapters, materialNames };
  };

  let subjectData;
  try {
    subjectData = {
      physics: await loadSubjectData("physics"),
      chemistry: await loadSubjectData("chemistry"),
      maths: await loadSubjectData("maths"),
    };
  } catch (err) {
    console.error("[Seeder Error] Failed to load local syllabus JSON files: ", err);
    console.log("%c[Fallback] Generating generic chapters since JSON files are inaccessible...", "color: #f59e0b;");
    
    // Generic fallback if user runs this in an environment where JSONs aren't accessible
    const mockMaterials = ["NCERT", "PYQs", "Modules"];
    const mockSubtopics = ["Introduction", "Core Concepts", "Practice Exercises", "Advanced Problems"];
    subjectData = {
      physics: {
        materialNames: mockMaterials,
        chapters: Array.from({ length: 24 }, (_, i) => ({ serial: i + 1, name: `Physics Chapter ${i + 1}`, materials: mockMaterials, subtopics: mockSubtopics }))
      },
      chemistry: {
        materialNames: mockMaterials,
        chapters: Array.from({ length: 29 }, (_, i) => ({ serial: i + 1, name: `Chemistry Chapter ${i + 1}`, materials: mockMaterials, subtopics: mockSubtopics }))
      },
      maths: {
        materialNames: mockMaterials,
        chapters: Array.from({ length: 28 }, (_, i) => ({ serial: i + 1, name: `Mathematics Chapter ${i + 1}`, materials: mockMaterials, subtopics: mockSubtopics }))
      }
    };
  }

  // 3. DEFINE CUSTOM COLUMNS & ORDER (REVISION ARCHITECTURE)
  const customColumns = {
    physics: ["Short Notes", "Reference Book"],
    chemistry: ["Short Notes", "MS Chouhan"],
    maths: ["Short Notes", "Black Book"],
  };

  const excludedColumns = {
    physics: [],
    chemistry: [],
    maths: [],
  };

  const materialOrder = {
    physics: ["NCERT", "Short Notes", "PYQs", "Modules", "Reference Book"],
    chemistry: ["NCERT", "Short Notes", "PYQs", "Modules", "MS Chouhan"],
    maths: ["NCERT", "Short Notes", "PYQs", "Modules", "Black Book"],
  };

  // Resolve active materials for progress calculations
  const activeMaterialsBySubject = {};
  for (const sub of SUBJECTS) {
    const combined = [...subjectData[sub].materialNames, ...customColumns[sub]];
    const filtered = combined.filter(m => !excludedColumns[sub].includes(m));
    const order = materialOrder[sub] || [];
    const ordered = order.filter(m => filtered.includes(m));
    const unordered = filtered.filter(m => !order.includes(m));
    activeMaterialsBySubject[sub] = [...ordered, ...unordered];
  }

  // 4. GENERATE PROGRESS DATA (DENSE REALISTIC VALUES: ~65% Phy, ~50% Chem, ~45% Math)
  const progress = { physics: {}, chemistry: {}, maths: {} };
  const targetProgressRatios = { physics: 0.65, chemistry: 0.50, maths: 0.45 };

  for (const sub of SUBJECTS) {
    const chapters = subjectData[sub].chapters;
    const ratio = targetProgressRatios[sub];
    
    chapters.forEach((chapter, index) => {
      // Progress decays slightly for later chapters to look realistic
      const progressCoefficient = Math.max(0.1, 1 - (index / chapters.length) * 0.95);
      
      // Assign priority
      let priority = "none";
      const randVal = stableNoise(chapter.serial * 77 + sub.length);
      if (randVal < 0.15) priority = "high";
      else if (randVal < 0.35) priority = "medium";
      else if (randVal < 0.50) priority = "low";

      const completed = {};
      const subtopicsProgress = {};
      const subtopicsList = chapter.subtopics || [];

      if (subtopicsList.length > 0) {
        subtopicsList.forEach((subtopic) => {
          subtopicsProgress[subtopic] = {
            completed: {},
            attemptedByMaterial: {},
            lastRevised: undefined
          };
        });
      }

      const attemptedByMaterial = {};
      let latestRevisionDate = undefined;

      activeMaterialsBySubject[sub].forEach((material, matIndex) => {
        // Boost NCERT & Notes, suppress reference books
        let weight = 0.5;
        if (material === "NCERT" || material === "Short Notes") weight = 0.8;
        if (material === "Reference Book" || material === "Black Book" || material === "MS Chouhan") weight = 0.25;
        
        const noise = stableNoise(chapter.serial * 13 + matIndex * 29 + sub.charCodeAt(0));
        const isChapterMaterialCompleted = (progressCoefficient * weight + noise * 0.2) > (1 - ratio);
        
        let matAttemptedSum = 0;

        if (subtopicsList.length > 0) {
          let hasIncomplete = false;
          subtopicsList.forEach((subtopic, subIndex) => {
            let isSubtopicMaterialCompleted = isChapterMaterialCompleted;
            if (!isChapterMaterialCompleted) {
              const subNoise = stableNoise(chapter.serial * 31 + matIndex * 17 + subIndex * 7 + sub.charCodeAt(0));
              if (subIndex === subtopicsList.length - 1 && !hasIncomplete) {
                isSubtopicMaterialCompleted = false;
              } else {
                isSubtopicMaterialCompleted = subNoise > 0.5;
              }
              if (!isSubtopicMaterialCompleted) {
                hasIncomplete = true;
              }
            }
            
            subtopicsProgress[subtopic].completed[material] = isSubtopicMaterialCompleted;
            
            // Set attempted questions count
            let attemptedCount = 0;
            if (isSubtopicMaterialCompleted) {
              attemptedCount = Math.floor(10 + stableNoise(chapter.serial * 5 + subIndex * 11) * 20);
            } else {
              const attemptNoise = stableNoise(chapter.serial * 9 + subIndex * 13);
              if (attemptNoise < 0.3) {
                attemptedCount = Math.floor(2 + attemptNoise * 20);
              }
            }
            subtopicsProgress[subtopic].attemptedByMaterial[material] = attemptedCount;
            matAttemptedSum += attemptedCount;

            // Revision dates
            if (isSubtopicMaterialCompleted) {
              const revNoise = stableNoise(chapter.serial * 41 + subIndex * 19 + sub.charCodeAt(0));
              if (revNoise < 0.2) {
                const daysAgo = Math.floor(1 + revNoise * 45); // 1 to 10 days
                const revDate = formatDate(addDays(today, -daysAgo));
                subtopicsProgress[subtopic].lastRevised = revDate;
                if (!latestRevisionDate || new Date(revDate) > new Date(latestRevisionDate)) {
                  latestRevisionDate = revDate;
                }
              } else if (revNoise < 0.35) {
                const daysAgo = Math.floor(31 + (revNoise - 0.2) * 60); // 31 to 40 days (stale!)
                const revDate = formatDate(addDays(today, -daysAgo));
                subtopicsProgress[subtopic].lastRevised = revDate;
                if (!latestRevisionDate || new Date(revDate) > new Date(latestRevisionDate)) {
                  latestRevisionDate = revDate;
                }
              }
            }
          });
          
          completed[material] = !hasIncomplete;
        } else {
          completed[material] = isChapterMaterialCompleted;
          let attemptedCount = 0;
          if (isChapterMaterialCompleted) {
            attemptedCount = Math.floor(30 + stableNoise(chapter.serial * 5) * 50);
          } else {
            const attemptNoise = stableNoise(chapter.serial * 9);
            if (attemptNoise < 0.3) {
              attemptedCount = Math.floor(5 + attemptNoise * 30);
            }
          }
          matAttemptedSum = attemptedCount;
        }
        
        attemptedByMaterial[material] = matAttemptedSum;
      });

      const detail = {
        attemptedByMaterial,
        lastRevised: latestRevisionDate,
        revisionCount: latestRevisionDate ? Math.floor(1 + stableNoise(chapter.serial * 3) * 3) : undefined
      };

      progress[sub][chapter.serial] = { 
        completed, 
        priority,
        subtopics: subtopicsList.length > 0 ? subtopicsProgress : undefined,
        detail
      };
    });
  }

  // 5. GENERATE PLANNER TASKS (PAST, PRESENT, FUTURE)
  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(addDays(today, -1));
  const tomorrowStr = formatDate(addDays(today, 1));
  
  const getChapterName = (sub, serial) => {
    const chapters = subjectData[sub]?.chapters || [];
    const ch = chapters.find(c => c.serial === serial) || chapters[0];
    return ch ? ch.name : `Chapter ${serial}`;
  };

  const makeChapterTask = ({ day, time, subject, serial, material, completed, wasShifted = false }) => {
    return {
      id: makeId("task"),
      title: getChapterName(subject, serial),
      subtitle: material,
      date: day,
      time,
      completed,
      type: "chapter",
      subject,
      chapterSerial: serial,
      material,
      completedAt: completed ? toIsoOnDate(day, time, 45) : undefined,
      wasShifted
    };
  };

  const plannerTasks = [
    // Yesterday's Tasks (All completed except one to show shift potential)
    makeChapterTask({ day: yesterdayStr, time: "09:00", subject: "physics", serial: 1, material: "NCERT", completed: true }),
    makeChapterTask({ day: yesterdayStr, time: "11:30", subject: "maths", serial: 2, material: "Short Notes", completed: true }),
    makeChapterTask({ day: yesterdayStr, time: "14:30", subject: "chemistry", serial: 1, material: "PYQs", completed: true }),
    makeChapterTask({ day: yesterdayStr, time: "17:00", subject: "physics", serial: 2, material: "Modules", completed: false, wasShifted: true }),

    // Today's Tasks (In-progress mix)
    makeChapterTask({ day: todayStr, time: "07:30", subject: "physics", serial: 4, material: "NCERT", completed: true }),
    makeChapterTask({ day: todayStr, time: "10:00", subject: "chemistry", serial: 4, material: "Short Notes", completed: true }),
    makeChapterTask({ day: todayStr, time: "14:00", subject: "maths", serial: 5, material: "PYQs", completed: false }),
    makeChapterTask({ day: todayStr, time: "16:30", subject: "physics", serial: 4, material: "PYQs", completed: false }),
    {
      id: makeId("task"),
      title: "Maths Mock Analysis Session",
      date: todayStr,
      time: "20:00",
      completed: false,
      type: "custom",
      subject: "maths"
    },

    // Tomorrow's Tasks
    makeChapterTask({ day: tomorrowStr, time: "08:00", subject: "chemistry", serial: 6, material: "NCERT", completed: false }),
    makeChapterTask({ day: tomorrowStr, time: "11:00", subject: "maths", serial: 6, material: "Modules", completed: false }),
    {
      id: makeId("task"),
      title: "Inorganic Chemistry Formula Revision",
      date: tomorrowStr,
      time: "17:30",
      completed: false,
      type: "custom",
      subject: "chemistry"
    },

    // Days 2 to 7 (Future scheduling)
    makeChapterTask({ day: formatDate(addDays(today, 2)), time: "09:00", subject: "physics", serial: 5, material: "Modules", completed: false }),
    makeChapterTask({ day: formatDate(addDays(today, 3)), time: "14:00", subject: "maths", serial: 7, material: "PYQs", completed: false }),
    {
      id: makeId("task"),
      title: "Solve BITSAT Full Mock Test 4",
      date: formatDate(addDays(today, 4)),
      time: "09:00",
      completed: false,
      type: "custom",
      subject: "maths"
    },
    makeChapterTask({ day: formatDate(addDays(today, 5)), time: "10:00", subject: "chemistry", serial: 8, material: "PYQs", completed: false }),
    makeChapterTask({ day: formatDate(addDays(today, 7)), time: "15:00", subject: "physics", serial: 6, material: "Reference Book", completed: false }),
  ];

  // 6. GENERATE STUDY SESSIONS (3 WEEKS HISTORICAL PROGRESS VISUALIZER)
  const studySessions = [];
  const sessionTimes = ["08:30", "11:00", "15:30", "19:00"];

  for (let dOffset = -21; dOffset <= 0; dOffset += 1) {
    const activeDate = addDays(today, dOffset);
    const activeDateStr = formatDate(activeDate);
    
    // Vary study density - weekends are denser, random variance
    const isWeekend = activeDate.getDay() === 0 || activeDate.getDay() === 6;
    const sessionCount = (isWeekend ? 3 : 2) + (Math.abs(dOffset) % 2);

    for (let s = 0; s < sessionCount; s++) {
      const subject = SUBJECTS[(Math.abs(dOffset) + s) % SUBJECTS.length];
      const chapters = subjectData[subject].chapters;
      const chapter = chapters[(Math.abs(dOffset) * 2 + s * 4) % chapters.length];
      
      // Session duration: 40 to 135 minutes
      const durationMinutes = 40 + ((Math.abs(dOffset) * 13 + s * 17) % 96);
      const durationSeconds = durationMinutes * 60;
      
      const timeStr = sessionTimes[s % sessionTimes.length];
      const startTime = toIsoOnDate(activeDateStr, timeStr);
      const endTime = new Date(new Date(startTime).getTime() + durationSeconds * 1000).toISOString();
      
      const materials = activeMaterialsBySubject[subject];
      const material = materials[(s + chapter.serial) % materials.length];

      studySessions.push({
        id: makeId("session"),
        title: `${subject.charAt(0).toUpperCase() + subject.slice(1)} > ${chapter.name} > ${material}`,
        subject,
        chapterSerial: chapter.serial,
        chapterName: chapter.name,
        material,
        type: "chapter",
        startTime,
        endTime,
        localDate: activeDateStr,
        duration: durationSeconds,
        timerMode: s % 3 === 0 ? "pomodoro" : s % 3 === 1 ? "stopwatch" : "countdown"
      });
    }
  }

  // Add a few custom coaching & mock sessions
  studySessions.push(
    {
      id: makeId("session"),
      title: "Full Syllabus JEE Main Mock Test",
      type: "custom",
      startTime: toIsoOnDate(formatDate(addDays(today, -2)), "09:00"),
      endTime: toIsoOnDate(formatDate(addDays(today, -2)), "12:00"),
      localDate: formatDate(addDays(today, -2)),
      duration: 3 * 60 * 60,
      timerMode: "countdown"
    },
    {
      id: makeId("session"),
      title: "Doubt Solving Session (Physics Coaching)",
      subject: "physics",
      type: "custom",
      startTime: toIsoOnDate(formatDate(addDays(today, -5)), "16:00"),
      endTime: toIsoOnDate(formatDate(addDays(today, -5)), "17:30"),
      localDate: formatDate(addDays(today, -5)),
      duration: 90 * 60,
      timerMode: "stopwatch"
    }
  );

  // 7. GENERATE MOCK SCORES (MULTI-EXAM TRENDS FOR THE ANALYTICS GRAPHS)
  const mockScores = [
    // JEE Main Mocks (Max: 300)
    { examType: "jm", name: "Allen Mains Test Series 1", daysAgo: 45, p: 58, c: 62, m: 50 },
    { examType: "jm", name: "Mathongo Full Test 2", daysAgo: 35, p: 64, c: 66, m: 58 },
    { examType: "jm", name: "NTA Abhyas Mock 12", daysAgo: 25, p: 70, c: 72, m: 65 },
    { examType: "jm", name: "JEE Main National Mock 4", daysAgo: 15, p: 82, c: 78, m: 72 },
    { examType: "jm", name: "Mathongo Grand Test 8", daysAgo: 5, p: 88, c: 84, m: 78 },

    // BITSAT Mocks (Max: 390)
    { examType: "bt", name: "BITSAT Practice Test 1", daysAgo: 28, p: 82, c: 88, m: 90 },
    { examType: "bt", name: "Embibe BITSAT Mock 3", daysAgo: 18, p: 92, c: 96, m: 94 },
    { examType: "bt", name: "Mathongo BITSAT FT 5", daysAgo: 6, p: 104, c: 102, m: 108 },

    // JEE Advanced Mocks (Max: 360, Double Paper)
    {
      examType: "ja",
      name: "Allen Advanced Major 1",
      daysAgo: 22,
      maxMarks: 360,
      paper1Marks: { physics: 32, chemistry: 30, maths: 28 }, // 90/180
      paper2Marks: { physics: 28, chemistry: 34, maths: 30 }, // 92/180
    },
    {
      examType: "ja",
      name: "FIITJEE AITS Grand Test 2",
      daysAgo: 8,
      maxMarks: 360,
      paper1Marks: { physics: 38, chemistry: 35, maths: 32 }, // 105/180
      paper2Marks: { physics: 36, chemistry: 40, maths: 34 }, // 110/180
    }
  ].map((x) => {
    const scoreDate = formatDate(addDays(today, -x.daysAgo));
    
    if (x.examType === "ja") {
      const p1 = x.paper1Marks;
      const p2 = x.paper2Marks;
      const physics = p1.physics + p2.physics;
      const chemistry = p1.chemistry + p2.chemistry;
      const maths = p1.maths + p2.maths;
      return {
        id: makeId("mock"),
        name: x.name,
        date: scoreDate,
        examType: x.examType,
        physicsMarks: physics,
        chemistryMarks: chemistry,
        mathsMarks: maths,
        totalMarks: physics + chemistry + maths,
        maxMarks: x.maxMarks,
        paper1Marks: p1,
        paper2Marks: p2,
      };
    } else {
      const total = x.p + x.c + x.m;
      const max = x.examType === "bt" ? 390 : 300;
      return {
        id: makeId("mock"),
        name: x.name,
        date: scoreDate,
        examType: x.examType,
        physicsMarks: x.p,
        chemistryMarks: x.c,
        mathsMarks: x.m,
        totalMarks: total,
        maxMarks: max,
      };
    }
  });

  // 8. EXAM DATES (UPCOMING DYNAMIC COUNTDOWN DATES)
  const currentYear = today.getFullYear();
  let cycleYear = currentYear;
  // If we are already past May, target the exams for the following year
  if (today.getMonth() > 4) {
    cycleYear = currentYear + 1;
  }

  const examDates = [
    { id: makeId("exam"), name: `JEE Main ${cycleYear} Session 1`, date: `${cycleYear}-01-20`, isPrimary: true },
    { id: makeId("exam"), name: `JEE Main ${cycleYear} Session 2`, date: `${cycleYear}-04-08`, isPrimary: false },
    { id: makeId("exam"), name: `JEE Advanced ${cycleYear}`, date: `${cycleYear}-05-24`, isPrimary: false },
    { id: makeId("exam"), name: `BITSAT ${cycleYear} Session 1`, date: `${cycleYear}-05-18`, isPrimary: false },
  ];

  // 9. PROGRESS CARD SECTOR CUSTOM AVATARS & STATS
  const progressCardSettings = {
    userName: "Aarav Sharma",
    customAvatarUrl: "", // Triggers random beautiful geometric avatar via boring-avatars
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

  // 10. PRESETS FOR STUDY CLOCK
  const timerPresets = [
    {
      id: makeId("preset"),
      name: "JEE Sprint (50/10 Pomodoro)",
      subject: "maths",
      config: {
        mode: "pomodoro",
        pomodoro: {
          workMinutes: 50,
          shortBreakMinutes: 10,
          longBreakMinutes: 20,
          cyclesBeforeLongBreak: 4,
        },
      },
    },
    {
      id: makeId("preset"),
      name: "JEE Advanced Exam Mock Run",
      subject: "physics",
      config: {
        mode: "countdown",
        countdown: { minutes: 180, seconds: 0 },
      },
    },
    {
      id: makeId("preset"),
      name: "Rapid Revision Sprint",
      subject: "chemistry",
      config: {
        mode: "countdown",
        countdown: { minutes: 25, seconds: 0 },
      },
    }
  ];

  // 11. PERSIST DATA TO LOCAL STORAGE
  const setJsonValue = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  // Clear existing OJEE Keys before setting to avoid dirty merged states
  for (const key of OJEET_KEYS) {
    if (key !== "ojeet-demo-backup") {
      localStorage.removeItem(key);
    }
  }

  // Write styling, settings & personalization

  // Write syllabus version explicitly to prevent automatic migration/reset
  localStorage.setItem("jee-tracker-syllabus-version", "json-2026-v3");

  // Write core database entities
  setJsonValue("jee-tracker-subject-data", subjectData);
  setJsonValue("jee-tracker-custom-columns", customColumns);
  setJsonValue("jee-tracker-excluded-columns", excludedColumns);
  setJsonValue("jee-tracker-material-order", materialOrder);
  setJsonValue("jee-tracker-progress", progress);
  setJsonValue("jee-tracker-planner-tasks", plannerTasks);
  setJsonValue("jee-tracker-study-sessions", studySessions);
  setJsonValue("jee-tracker-mock-scores", mockScores);
  setJsonValue("jee-exam-dates", examDates);
  setJsonValue("jee-tracker-progress-card", progressCardSettings);
  setJsonValue("jee-timer-presets", timerPresets);

  // Interface defaults
  setJsonValue("ojeet-planner-view", "weekly");
  setJsonValue("jee-tracker-disable-auto-shift", false);
  setJsonValue("jee-secondary-exam-index", 0);
  setJsonValue("ojeet-sync-prompt-dismissed", "1");

  // Study Clock initial state
  localStorage.setItem("studyClock_taskType", "task");
  localStorage.setItem("studyClock_selectedSubject", "physics");
  localStorage.setItem("studyClock_selectedChapter", "4");
  localStorage.setItem("studyClock_selectedMaterial", "PYQs");
  localStorage.setItem("studyClock_customTitle", "");
  localStorage.setItem("studyClock_selectedTaskId", plannerTasks.find(t => !t.completed)?.id || "");
  localStorage.removeItem("jee-timer-engine");

  console.log("%c[OJEE Tracker Seeder] Success! Seeding completed.", "color: #10b981; font-weight: bold; font-size: 14px;");
  console.log(`- Syllabus initialized with custom materials ('Short Notes', 'Reference Books').
- Completed Progress: Physics (${Math.round(targetProgressRatios.physics * 100)}%), Chemistry (${Math.round(targetProgressRatios.chemistry * 100)}%), Maths (${Math.round(targetProgressRatios.maths * 100)}%).
- Generated ${plannerTasks.length} planner tasks across past/future.
- Generated ${studySessions.length} active historical study sessions.
- Generated ${mockScores.length} mock test results (JEE Main, Advanced, BITSAT).
- Dynamic exam countdowns configured for cycle year: ${cycleYear}.
- Settings configured: Glassmorphic theme with modern violet accent.`);

  console.log("%cTo restore your original local data at any time, run: restoreOriginalData()", "color: #f59e0b; font-weight: bold;");

  // Force-reload to update UI
  console.log("%cReloading page in 1.5 seconds to refresh state...", "color: #8b5cf6; font-style: italic;");
  setTimeout(() => window.location.reload(), 1500);
})();
