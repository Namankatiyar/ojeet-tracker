import React from 'react';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="ob-root">
      <div className="ob-image-pane">
        <img className="ob-background-image"
          src="/onboardingImage.jpg"
          alt=""
          draggable={false}
        />
        <div className="ob-branding">
        <img src="/logo.png" alt="" className="ob-branding-logo" />
        <div className="ob-branding-divider" />
        <span className="ob-branding-text">OJEE Tracker</span>
        </div>
      </div>
      <div className="ob-form-pane">
        <div className="ob-form-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
