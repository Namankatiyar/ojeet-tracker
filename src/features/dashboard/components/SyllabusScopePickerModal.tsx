import { useState, useMemo } from 'react';
import { X, Search, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { ExamEntry, ExamSyllabus, Subject, SubjectData } from '../../../shared/types';

interface SyllabusScopePickerModalProps {
  exam: ExamEntry;
  subjectData: Record<Subject, SubjectData | null>;
  onSave: (syllabus: ExamSyllabus) => void;
  onClose: () => void;
}

const SUBJECT_TABS: { key: Subject; label: string; colorClass: string }[] = [
  { key: 'physics', label: 'Physics', colorClass: 'text-physics' },
  { key: 'chemistry', label: 'Chemistry', colorClass: 'text-chemistry' },
  { key: 'maths', label: 'Maths', colorClass: 'text-maths' },
];

export function SyllabusScopePickerModal({
  exam,
  subjectData,
  onSave,
  onClose,
}: SyllabusScopePickerModalProps) {
  const [activeTab, setActiveTab] = useState<Subject>('physics');
  const [searchQuery, setSearchQuery] = useState('');

  const initialSelection = useMemo(() => {
    const selection: Record<Subject, Set<number>> = {
      physics: new Set(),
      chemistry: new Set(),
      maths: new Set(),
      biology: new Set(),
    };

    (['physics', 'chemistry', 'maths'] as Subject[]).forEach((subject) => {
      const data = subjectData[subject];
      if (!data) return;
      const existing = exam.syllabus?.[subject as 'physics' | 'chemistry' | 'maths'];
      if (existing !== undefined) {
        selection[subject] = new Set(existing);
      } else {
        selection[subject] = new Set(data.chapters.map((c) => c.serial));
      }
    });

    return selection;
  }, [exam, subjectData]);

  const [selected, setSelected] = useState<Record<Subject, Set<number>>>(initialSelection);

  const currentChapters = useMemo(() => {
    const data = subjectData[activeTab];
    if (!data) return [];
    if (!searchQuery.trim()) return data.chapters;
    const query = searchQuery.toLowerCase();
    return data.chapters.filter((c) => c.name.toLowerCase().includes(query));
  }, [subjectData, activeTab, searchQuery]);

  const handleToggleChapter = (serial: number) => {
    setSelected((prev) => {
      const nextSet = new Set(prev[activeTab]);
      if (nextSet.has(serial)) {
        nextSet.delete(serial);
      } else {
        nextSet.add(serial);
      }
      return { ...prev, [activeTab]: nextSet };
    });
  };

  const handleSelectAllCurrent = () => {
    const data = subjectData[activeTab];
    if (!data) return;
    const allSerials = data.chapters.map((c) => c.serial);
    setSelected((prev) => ({
      ...prev,
      [activeTab]: new Set(allSerials),
    }));
  };

  const handleClearCurrent = () => {
    setSelected((prev) => ({
      ...prev,
      [activeTab]: new Set(),
    }));
  };

  const handleResetFullSyllabus = () => {
    const full: Record<Subject, Set<number>> = {
      physics: new Set(subjectData.physics?.chapters.map((c) => c.serial) || []),
      chemistry: new Set(subjectData.chemistry?.chapters.map((c) => c.serial) || []),
      maths: new Set(subjectData.maths?.chapters.map((c) => c.serial) || []),
      biology: new Set(),
    };
    setSelected(full);
  };

  const handleSave = () => {
    const result: ExamSyllabus = {};
    let allFull = true;

    (['physics', 'chemistry', 'maths'] as const).forEach((subject) => {
      const data = subjectData[subject];
      if (!data) return;
      const serials = Array.from(selected[subject]);
      if (serials.length !== data.chapters.length) {
        allFull = false;
      }
      result[subject] = serials;
    });

    if (allFull) {
      onSave({});
    } else {
      onSave(result);
    }
  };

  return (
    <motion.div
      className="modal-overlay syllabus-picker-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="exam-modal syllabus-picker-modal glass-panel"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
        transition={{ type: 'spring' as const, duration: 0.5, bounce: 0 }}
      >
        <div className="exam-modal-header">
          <div>
            <h3>Scope Syllabus: {exam.name}</h3>
            <span className="exam-modal-subtitle">Select chapters to track in dashboard for this exam</span>
          </div>
          <button className="close-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="syllabus-picker-tabs">
          {SUBJECT_TABS.map((tab) => {
            const data = subjectData[tab.key];
            const count = selected[tab.key].size;
            const total = data?.chapters.length || 0;
            return (
              <button
                key={tab.key}
                type="button"
                className={`syllabus-tab-btn ${activeTab === tab.key ? 'active' : ''} ${tab.colorClass}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchQuery('');
                }}
              >
                <span>{tab.label}</span>
                <span className="syllabus-tab-badge">{`${count}/${total}`}</span>
              </button>
            );
          })}
        </div>

        <div className="syllabus-picker-controls">
          <div className="syllabus-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder={`Search ${activeTab} chapters...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="syllabus-quick-actions">
            <button type="button" className="quick-action-btn" onClick={handleSelectAllCurrent}>
              Select All
            </button>
            <button type="button" className="quick-action-btn" onClick={handleClearCurrent}>
              Clear
            </button>
            <button
              type="button"
              className="quick-action-btn reset-btn"
              onClick={handleResetFullSyllabus}
              title="Reset to full syllabus across all subjects"
            >
              <RotateCcw size={13} />
              Full Syllabus
            </button>
          </div>
        </div>

        <div className="syllabus-chapter-list">
          {currentChapters.length === 0 ? (
            <div className="exam-empty-state">
              <p>No chapters found matching "{searchQuery}"</p>
            </div>
          ) : (
            currentChapters.map((chapter) => {
              const isChecked = selected[activeTab].has(chapter.serial);
              return (
                <div
                  key={chapter.serial}
                  className={`syllabus-chapter-item ${isChecked ? 'checked' : ''}`}
                  onClick={() => handleToggleChapter(chapter.serial)}
                >
                  <label className="checkbox-container" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleChapter(chapter.serial)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="checkmark" />
                  </label>
                  <span className="chapter-serial">{`#${chapter.serial}`}</span>
                  <span className="chapter-name">{chapter.name}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="syllabus-picker-footer">
          <button type="button" className="action-btn outline small" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="action-btn primary small" onClick={handleSave}>
            Save Syllabus Scope
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
