import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
    return (
        <section className="legal-page">
            <div className="legal-card glass-panel">
                <div className="legal-header">
                    <h1>Privacy Policy</h1>
                    <p>Last updated: March 8, 2026</p>
                </div>

                <div className="legal-content">
                    <h2>Overview</h2>
                    <p>
                        OJEE Tracker is an offline-first app with optional cloud sync. Your study progress, planner data, and
                        personal settings are stored locally in your browser, and can also be synced when you sign in.
                    </p>

                    <h2>Data We Store</h2>
                    <p>
                        The app stores your subject progress, tasks, study sessions, mock scores, exam dates, visual preferences,
                        and optional profile settings in localStorage on your device. If you use Google Sign-In, the app only
                        requests your name and email address for account identity.
                    </p>

                    <h2>Cloud Sync and Access</h2>
                    <p>
                        After signing in with Google, your tracker data can be stored in the cloud so you can access it across
                        multiple devices using the same account.
                    </p>

                    <h2>Data Sharing</h2>
                    <p>
                        We do not share or sell your personal data to any organization. Your data is only used to operate sync
                        and app functionality.
                    </p>

                    <h2>Backups and Imports</h2>
                    <p>
                        Backup files may contain personal study information. Keep exported files secure and import only trusted
                        backups.
                    </p>

                    <h2>Your Control</h2>
                    <p>
                        You can modify or remove your data at any time by editing entries in the app, importing another backup,
                        or clearing browser storage.
                    </p>

                    <h2>Contact</h2>
                    <p>
                        For policy-related questions, please contact the app maintainer through the project repository.
                    </p>
                </div>

                <div className="legal-actions">
                    <Link className="action-btn outline small" to="/">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </section>
    );
}
