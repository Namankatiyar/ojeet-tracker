interface OnboardingToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

export function OnboardingToggle({ checked, onChange, id }: OnboardingToggleProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      className={`ob-toggle-track ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="ob-toggle-thumb" />
    </button>
  );
}
