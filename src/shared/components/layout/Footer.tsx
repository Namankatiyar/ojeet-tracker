import { Link } from 'react-router-dom';
import { DiscordIcon } from '../ui/DiscordInviteModal';
import { Github, WifiOff, Code2, ShieldCheck } from 'lucide-react';

export function Footer() {
    return (
        <footer className="footer" itemScope itemType="https://schema.org/WPFooter">
            <div className="footer-content">
                {/* Left Section: Brand, Trust Badges, & Version Meta */}
                <div 
                    className="footer-brand-section" 
                    itemScope 
                    itemType="https://schema.org/Organization"
                >
                    <Link 
                        to="/" 
                        className="footer-logo" 
                        title="OJEE Tracker - Study Companion for JEE Prep"
                        itemProp="url"
                    >
                        <span className="logo-text" itemProp="name">OJEE Tracker</span>
                    </Link>
                    <p className="footer-description" itemProp="description">
                        A high-performance, offline-first study companion optimized for competitive exam preparation.
                    </p>
                    
                    <div className="footer-trust-indicators">
                        <div className="trust-badge">
                            <WifiOff size={14} className="trust-icon" />
                            <span>Offline First</span>
                        </div>
                        <div className="trust-badge">
                            <Code2 size={14} className="trust-icon" />
                            <span>Open Source</span>
                        </div>
                        <div className="trust-badge">
                            <ShieldCheck size={14} className="trust-icon" />
                            <span>Privacy Friendly</span>
                        </div>
                    </div>
                    
                    <div className="footer-meta-badges">
                        <span className="meta-badge roadmap-badge">
                            <span className="badge-pulse"></span>
                            Version 1.0.6
                        </span>
                        <a 
                            href="https://github.com/Namankatiyar/ojeet-tracker" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="meta-badge github-badge"
                            title="View source code on GitHub"
                        >
                            <Github size={14} />
                            <span>GitHub Repo</span>
                        </a>
                    </div>
                </div>

                {/* Right Section: Premium Interactive Discord Card */}
                <div className="footer-discord-card">
                    <div className="discord-card-glow"></div>
                    <div className="discord-card-content">
                        <div className="discord-header">
                            <DiscordIcon size={24} />
                            <h4>Join Other Aspirants</h4>
                        </div>
                        <p className="discord-card-text">
                            Discuss preparation strategies, share reference resources, and stay accountable with other aspirants.
                        </p>
                        <a 
                            href="https://discord.gg/6dKrbVQU8W" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="discord-card-btn"
                            title="Join Discord Server"
                        >
                            <span>Join Discord Server</span>
                            <span className="btn-arrow">→</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Links Grid & Copyright Metas */}
            <div className="footer-bottom-grid">
                <nav 
                    className="footer-bottom-links" 
                    aria-label="Footer Navigation" 
                    itemScope 
                    itemType="https://schema.org/SiteNavigationElement"
                >
                    <div className="bottom-links-group">
                        <h3 className="group-title">Product</h3>
                        <ul>
                            <li><Link to="/jee-syllabus-tracker" className="bottom-link" itemProp="url">Dashboard</Link></li>
                            <li><Link to="/jee-study-planner" className="bottom-link" itemProp="url">Planner</Link></li>
                            <li><Link to="/jee-study-timer" className="bottom-link" itemProp="url">Study Clock</Link></li>
                        </ul>
                    </div>
                    <div className="bottom-links-group">
                        <h3 className="group-title">Resources</h3>
                        <ul>
                            <li><Link to="/changelog" className="bottom-link" itemProp="url">Changelog</Link></li>
                            <li><a href="https://github.com/Namankatiyar/ojeet-tracker/issues" target="_blank" rel="noopener noreferrer" className="bottom-link" itemProp="url" title="Submit feedback or report an issue on GitHub">Feedback</a></li>
                        </ul>
                    </div>
                    <div className="bottom-links-group">
                        <h3 className="group-title">Legal</h3>
                        <ul>
                            <li><Link to="/privacy-policy" className="bottom-link" itemProp="url">Privacy Policy</Link></li>
                            <li><Link to="/terms-of-service" className="bottom-link" itemProp="url">Terms of Service</Link></li>
                        </ul>
                    </div>
                </nav>

                <div className="footer-bottom-meta">
                    <p className="copyright-text">
                        &copy; {new Date().getFullYear()} OJEE Tracker. All rights reserved.
                    </p>
                    <p className="attribution-text">
                        Made for and by a JEE Aspirant with <span className="heart-span">❤</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
