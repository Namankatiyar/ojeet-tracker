import { Link } from 'react-router-dom';
import { DiscordIcon } from '../ui/DiscordInviteModal';
import { Github, WifiOff, Code2, ShieldCheck, ArrowRight } from 'lucide-react';

export function Footer() {
    return (
        <footer className="footer" itemScope itemType="https://schema.org/WPFooter">
            <div className="footer-container">
                {/* Slim Discord Banner */}
                <a 
                    href="https://discord.gg/6dKrbVQU8W" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="footer-discord-banner"
                    title="Join Discord Server"
                >
                    <div className="discord-banner-content">
                        <DiscordIcon size={20} />
                        <span className="discord-banner-title">Join Other Aspirants</span>
                        <span className="discord-banner-text">Discuss strategies and connect with the community</span>
                    </div>
                    <ArrowRight size={16} className="discord-banner-arrow" />
                </a>

                <div className="footer-main-grid">
                    {/* Brand & Trust */}
                    <div className="footer-brand" itemScope itemType="https://schema.org/Organization">
                        <Link to="/" className="footer-logo" title="OJEE Tracker" itemProp="url">
                            <span className="logo-text" itemProp="name">OJEE Tracker</span>
                        </Link>
                        <p className="footer-description" itemProp="description">
                            A high-performance, offline-first study companion optimized for competitive exam preparation.
                        </p>
                        <div className="footer-trust-badges">
                            <span className="trust-badge"><WifiOff size={14} /> Offline First</span>
                            <span className="trust-badge"><Code2 size={14} /> Open Source</span>
                            <span className="trust-badge"><ShieldCheck size={14} /> Privacy Friendly</span>
                        </div>
                    </div>

                    {/* Nav Sections */}
                    <div className="footer-nav-group">
                        <h3 className="group-title">Product</h3>
                        <nav aria-label="Footer Product Navigation" itemScope itemType="https://schema.org/SiteNavigationElement">
                            <Link to="/jee-syllabus-tracker" className="bottom-link" itemProp="url">Dashboard</Link>
                            <Link to="/jee-study-planner" className="bottom-link" itemProp="url">Planner</Link>
                            <Link to="/jee-study-timer" className="bottom-link" itemProp="url">Study Clock</Link>
                        </nav>
                    </div>

                    <div className="footer-nav-group">
                        <h3 className="group-title">Resources</h3>
                        <nav aria-label="Footer Resources Navigation" itemScope itemType="https://schema.org/SiteNavigationElement">
                            <Link to="/changelog" className="bottom-link" itemProp="url">Changelog</Link>
                            <a href="https://github.com/Namankatiyar/ojeet-tracker/issues" target="_blank" rel="noopener noreferrer" className="bottom-link" itemProp="url">Feedback</a>
                            <a href="https://github.com/Namankatiyar/ojeet-tracker" target="_blank" rel="noopener noreferrer" className="bottom-link flex-align" itemProp="url">
                                <Github size={14} className="inline-icon" /> GitHub Repo
                            </a>
                        </nav>
                    </div>

                    <div className="footer-nav-group">
                        <h3 className="group-title">Legal</h3>
                        <nav aria-label="Footer Legal Navigation" itemScope itemType="https://schema.org/SiteNavigationElement">
                            <Link to="/privacy-policy" className="bottom-link" itemProp="url">Privacy Policy</Link>
                            <Link to="/terms-of-service" className="bottom-link" itemProp="url">Terms of Service</Link>
                        </nav>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="footer-meta">
                        <span className="meta-version roadmap-badge">
                            <span className="badge-pulse"></span> Version 1.1.0
                        </span>
                        <span className="copyright">&copy; {new Date().getFullYear()} OJEE Tracker. All rights reserved.</span>
                    </div>
                    <p className="attribution">Made for and by a JEE Aspirant with <span className="heart-span">❤</span></p>
                </div>
            </div>
        </footer>
    );
}
