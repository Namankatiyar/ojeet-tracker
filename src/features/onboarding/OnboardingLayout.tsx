import React from 'react';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="ob-root">
      <div className="ob-image-pane">
        <img
          src="/onboardingImage.jpg"
          alt=""
          draggable={false}
        />
      </div>
      <div className="ob-form-pane">
        <div className="ob-form-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
