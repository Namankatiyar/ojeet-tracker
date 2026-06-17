import { Link } from 'react-router-dom';
import { DiscordIcon } from '../ui/DiscordInviteModal';
import { LayoutDashboard, Calendar, Clock, Lock, FileText, History } from 'lucide-react';

export function Footer() {
    return (
        <footer className="footer glass-panel">
            <div className="footer-content">
                <div className="footer-brand-section">
                    <div className="footer-logo">
                        <span className="logo-text">OJEE Tracker</span>
                    </div>
                    <p className="footer-description">
                        A high-performance, offline-first progress tracking application optimized for academic competitive exam preparation.
                    </p>
                </div>

                <div className="footer-links-section">
                    <div className="footer-links-column">
                        <h4>Navigation</h4>
                        <nav className="footer-nav">
                            <Link to="/jee-syllabus-tracker" className="footer-link">
                                <LayoutDashboard size={14} />
                                <span>Dashboard</span>
                            </Link>
                            <Link to="/jee-study-planner" className="footer-link">
                                <Calendar size={14} />
                                <span>Planner</span>
                            </Link>
                            <Link to="/jee-study-timer" className="footer-link">
                                <Clock size={14} />
                                <span>Study Clock</span>
                            </Link>
                        </nav>
                    </div>

                    <div className="footer-links-column">
                        <h4>Legal & Info</h4>
                        <nav className="footer-nav">
                            <Link to="/privacy-policy" className="footer-link">
                                <Lock size={14} />
                                <span>Privacy Policy</span>
                            </Link>
                            <Link to="/terms-of-service" className="footer-link">
                                <FileText size={14} />
                                <span>Terms of Service</span>
                            </Link>
                            <Link to="/changelog" className="footer-link">
                                <History size={14} />
                                <span>Changelog</span>
                            </Link>
                        </nav>
                    </div>
                </div>

                <div className="footer-cta-section">
                    <h4>Community</h4>
                    <p className="footer-cta-text">Join other aspirants and prepare together.</p>
                    <a 
                        href="https://discord.gg/6dKrbVQU8W" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="footer-discord-btn"
                        title="Join Discord Server"
                    >
                        <DiscordIcon size={18} />
                        <span>Join Discord</span>
                    </a>
                </div>
            </div>

            <div className="footer-bottom">
                <p className="copyright-text">
                    &copy; {new Date().getFullYear()} OJEE Tracker. All rights reserved.
                </p>
                <p className="attribution-text">
                    Created for and by a JEE Aspirant.
                </p>
            </div>
        </footer>
    );
}
