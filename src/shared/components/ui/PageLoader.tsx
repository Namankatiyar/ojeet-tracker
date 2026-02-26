import { Atom } from 'lucide-react';

export function PageLoader() {
    return (
        <div className="page-loader-container">
            <div className="loader-spinner">
                <Atom size={48} className="spin-icon" />
            </div>
            <p>Loading...</p>
        </div>
    );
}
