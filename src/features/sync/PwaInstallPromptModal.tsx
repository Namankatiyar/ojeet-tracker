import { Download, X } from 'lucide-react';

interface PwaInstallPromptModalProps {
    isOpen: boolean;
    isBusy?: boolean;
    onClose: () => void;
    onInstall: () => void;
}

export function PwaInstallPromptModal({
    isOpen,
    isBusy = false,
    onClose,
    onInstall,
}: PwaInstallPromptModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content pwa-install-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Install OJEE Tracker</h3>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="pwa-install-modal-subtitle">
                        Install this site as an app for quicker access, app-like fullscreen, and better focus.
                    </p>
                    <p className="pwa-install-modal-note">
                        Your existing local progress stays intact after install.
                    </p>
                </div>

                <div className="modal-footer pwa-install-modal-actions">
                    <button className="modal-btn cancel" onClick={onClose} disabled={isBusy}>
                        Maybe Later
                    </button>
                    <button className="modal-btn primary pwa-install-btn" onClick={onInstall} disabled={isBusy}>
                        <Download size={16} />
                        {isBusy ? 'Opening...' : 'Install App'}
                    </button>
                </div>
            </div>
        </div>
    );
}

