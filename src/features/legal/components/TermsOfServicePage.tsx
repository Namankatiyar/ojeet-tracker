import { Link } from 'react-router-dom';

export function TermsOfServicePage() {
    return (
        <section className="legal-page">
            <div className="legal-card glass-panel">
                <div className="legal-header">
                    <h1>Terms of Service</h1>
                    <p>Last updated: March 8, 2026</p>
                </div>

                <div className="legal-content">
                    <h2>Acceptance</h2>
                    <p>
                        By using OJEE Tracker, you agree to these terms and accept responsibility for how you use the app and
                        manage your local data.
                    </p>

                    <h2>Google Sign-In and Cloud Sync</h2>
                    <p>
                        The app supports Google Sign-In so you can store data in the cloud and access it from multiple devices.
                        Sign-in requests only your name and email address. No additional personal data is requested by this
                        app for authentication.
                    </p>

                    <h2>Intended Use</h2>
                    <p>
                        This tool is intended for personal academic planning and progress tracking. You are responsible for the
                        accuracy of entered data and any scheduling decisions based on it.
                    </p>

                    <h2>Local Data Responsibility</h2>
                    <p>
                        Since data is primarily stored in your browser, you are responsible for backups and device security.
                        Clearing browser storage may permanently remove your data.
                    </p>

                    <h2>No Warranty</h2>
                    <p>
                        The software is provided as-is, without guarantees of uninterrupted availability, error-free operation,
                        or fitness for a specific purpose.
                    </p>

                    <h2>Limitation of Liability</h2>
                    <p>
                        The maintainers are not liable for data loss, missed deadlines, or indirect damages resulting from use
                        of the application.
                    </p>

                    <h2>Data Commercialization</h2>
                    <p>
                        Your data is not shared with or sold to any organization for commercial purposes.
                    </p>

                    <h2>Changes to Terms</h2>
                    <p>
                        These terms may be updated over time. Continued use after updates indicates acceptance of revised terms.
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
