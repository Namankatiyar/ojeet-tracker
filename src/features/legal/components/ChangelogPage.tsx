import { Link } from 'react-router-dom';
import { CHANGELOG_ENTRIES } from '../changelogEntries';

export function ChangelogPage() {
  return (
    <section className="legal-page">
      <div className="legal-card glass-panel">
        <div className="legal-header">
          <h1>Changelog</h1>
          <p>Current version: {__APP_VERSION__}</p>
        </div>

        <div className="legal-content changelog-content">
          {CHANGELOG_ENTRIES.map((entry) => (
            <article key={entry.version} className="changelog-entry">
              <h2>
                {entry.version} · {entry.title}
              </h2>
              <p>{entry.date}</p>
              <ul>
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </article>
          ))}
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
