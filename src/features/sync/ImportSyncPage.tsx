import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { StudySession, Subject } from '../../shared/types';

interface OjeetSyncPayload {
    source: 'ojeet-study';
    timestamp: string;
    sessions: Array<{
        title: string;
        durationSeconds: number;
        date: string;
        subject?: string; // e.g. "physics", "chemistry", "maths", or absent
    }>;
}

interface ImportSyncPageProps {
    onAddSession: (session: StudySession) => void;
}

const IMPORT_HISTORY_KEY = 'ojeet-import-history';

const VALID_SUBJECTS: readonly string[] = ['physics', 'chemistry', 'maths'];

/** Map an incoming subject string to the native Subject type, or undefined if unrecognized. */
function resolveSubject(raw?: string): Subject | undefined {
    if (!raw) return undefined;
    const normalized = raw.trim().toLowerCase();
    if (VALID_SUBJECTS.includes(normalized)) return normalized as Subject;
    return undefined;
}

export function ImportSyncPage({ onAddSession }: ImportSyncPageProps) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'duplicate' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [importedCount, setImportedCount] = useState(0);
    const [importedMinutes, setImportedMinutes] = useState(0);
    const processedRef = useRef<string | null>(null);

    useEffect(() => {
        const payload = searchParams.get('payload');

        if (!payload) {
            setStatus('error');
            setErrorMessage('No sync payload found in URL.');
            return;
        }

        // Prevent React 18 Strict Mode from double-executing the import logic
        if (processedRef.current === payload) {
            return;
        }
        processedRef.current = payload;

        try {
            // 1. Decode Base64 payload
            const data: OjeetSyncPayload = JSON.parse(decodeURIComponent(atob(payload)));

            // 2. Validate source identifier
            if (data.source !== 'ojeet-study') {
                throw new Error('Invalid data source. Expected ojeet-study.');
            }

            // 3. Deduplication guard — check if this export timestamp was already imported
            const importHistory: string[] = JSON.parse(
                localStorage.getItem(IMPORT_HISTORY_KEY) || '[]'
            );
            if (importHistory.includes(data.timestamp)) {
                setStatus('duplicate');
                return;
            }

            // 4. Map incoming sessions to the native StudySession shape and persist
            let totalSeconds = 0;
            data.sessions.forEach((session) => {
                const startTime = new Date(`${session.date}T09:00:00`).toISOString();
                const endTime = new Date(
                    new Date(startTime).getTime() + session.durationSeconds * 1000
                ).toISOString();

                const resolvedSubject = resolveSubject(session.subject);

                const studySession: StudySession = {
                    id: `ojeet-study-${data.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                    title: `${session.title}`,
                    type: resolvedSubject ? 'chapter' : 'custom',
                    subject: resolvedSubject,
                    startTime,
                    endTime,
                    duration: session.durationSeconds,
                    timerMode: 'video',
                };

                onAddSession(studySession);
                totalSeconds += session.durationSeconds;
            });

            // 5. Record this import timestamp to prevent re-imports
            localStorage.setItem(
                IMPORT_HISTORY_KEY,
                JSON.stringify([...importHistory, data.timestamp])
            );

            setImportedCount(data.sessions.length);
            setImportedMinutes(Math.floor(totalSeconds / 60));
            setStatus('success');
        } catch (err: unknown) {
            console.error('Import failed:', err);
            setStatus('error');
            setErrorMessage(
                err instanceof Error ? err.message : 'Failed to parse sync data.'
            );
        }
    }, [searchParams, onAddSession]);

    return (
        <div className="import-sync-page">
            <div className="import-sync-card glass-panel">
                {status === 'loading' && (
                    <div className="import-sync-content">
                        <Loader2 size={48} className="import-sync-spinner" />
                        <h2>Syncing Study Data…</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="import-sync-content">
                        <CheckCircle2 size={48} className="import-sync-icon-success" />
                        <h2>Sync Complete!</h2>
                        <p>
                            Imported <strong>{importedCount} sessions</strong> ({importedMinutes} min)
                            from OJEET-STUDY into your study history.
                        </p>
                        <button className="primary-btn" onClick={() => navigate('/')}>
                            Return to Dashboard
                        </button>
                    </div>
                )}

                {status === 'duplicate' && (
                    <div className="import-sync-content">
                        <CheckCircle2 size={48} className="import-sync-icon-accent" />
                        <h2>Already Imported</h2>
                        <p>This sync payload has already been applied to your tracker.</p>
                        <button className="secondary-btn" onClick={() => navigate('/')}>
                            Return to Dashboard
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="import-sync-content">
                        <AlertCircle size={48} className="import-sync-icon-error" />
                        <h2>Sync Failed</h2>
                        <p>{errorMessage}</p>
                        <button className="secondary-btn" onClick={() => navigate('/')}>
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
