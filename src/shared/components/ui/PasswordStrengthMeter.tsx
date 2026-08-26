import type { FC } from 'react';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';

export interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export const PasswordStrengthMeter: FC<PasswordStrengthMeterProps> = ({
  password,
  className = '',
}) => {
  const { score, label } = usePasswordStrength(password);

  if (password.length === 0) {
    return null;
  }

  const containerClassName = ['ob-strength-container', className].filter(Boolean).join(' ');

  return (
    <div className={containerClassName} data-score={score}>
      <div className="ob-strength-bar">
        {[0, 1, 2, 3].map((index) => {
          const isFilled = index < score;
          return (
            <div
              key={index}
              className={`ob-strength-segment ${isFilled ? 'filled' : ''}`}
            />
          );
        })}
      </div>
      <span className="ob-strength-label">{label}</span>
    </div>
  );
};
