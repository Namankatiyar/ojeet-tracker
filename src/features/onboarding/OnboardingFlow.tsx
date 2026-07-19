import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserProgress } from '../../core/context/UserProgressContext';
import { useRemoteAuth } from '../../core/context/RemoteAuthContext';
import { OnboardingLayout } from './OnboardingLayout';
import { OnboardingProgress } from './OnboardingProgress';
import { StepName } from './steps/StepName';
import { StepResetTime } from './steps/StepResetTime';
import { StepPersonalize } from './steps/StepPersonalize';
import { StepDiscord } from './steps/StepDiscord';
import { StepAuth } from './steps/StepAuth';
import { StepExamSelect } from './steps/StepExamSelect';

interface OnboardingData {
  name: string;
  examMode: 'jee' | 'neet';
  resetTime: string;
  aiAssistantEnabled: boolean;
  musicPlayerEnabled: boolean;
  discordJoined: boolean;
}

const TOTAL_STEPS = 6;

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
    filter: 'blur(4px)',
  }),
};

const stepTransition = {
  type: 'spring' as const,
  duration: 0.5,
  bounce: 0,
};

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const {
    progressCardSettings,
    setProgressCardSettings,
    dailyResetHour,
    setDailyResetHour,
    enableAIAgent,
    setEnableAIAgent,
    enableMusicPlayer,
    setEnableMusicPlayer,
    examMode,
    setExamMode,
  } = useUserProgress();

  const { user, signInWithGoogle } = useRemoteAuth();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<OnboardingData>(() => ({
    name: progressCardSettings.userName || '',
    examMode: examMode || 'jee',
    resetTime: `${String(dailyResetHour).padStart(2, '0')}:00`,
    aiAssistantEnabled: enableAIAgent,
    musicPlayerEnabled: enableMusicPlayer,
    discordJoined: false,
  }));

  const updateData = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  useEffect(() => {
    if (user && !data.name) {
      const googleName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      if (googleName) {
        updateData('name', googleName);
      }
    }
  }, [user, data.name, updateData]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleComplete = useCallback(
    async () => {
      // Set the selected examMode
      setExamMode(data.examMode);

      // Determine targetExam value based on the chosen examMode
      const targetExam = data.examMode === 'neet' ? 'NEET 2026' : 'JEE 2026';

      // Write collected settings to existing localStorage hooks
      setProgressCardSettings((prev) => ({
        ...prev,
        userName: data.name,
        targetExam,
      }));

      const hour = parseInt(data.resetTime.split(':')[0], 10);
      setDailyResetHour(isNaN(hour) ? 0 : hour);
      setEnableAIAgent(data.aiAssistantEnabled);
      setEnableMusicPlayer(data.musicPlayerEnabled);

      // Set onboarding complete flag
      localStorage.setItem('jee-tracker-onboarding-complete', 'true');

      // Suppress the Discord popup since user saw it in onboarding
      localStorage.setItem('ojee_discord_dismissed', 'true');

      onComplete();
    },
    [
      data,
      setExamMode,
      setProgressCardSettings,
      setDailyResetHour,
      setEnableAIAgent,
      setEnableMusicPlayer,
      onComplete,
    ]
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepAuth
            isSignedIn={!!user}
            userEmail={user?.email}
            onGoogle={signInWithGoogle}
            onOffline={goNext}
            onNext={goNext}
          />
        );
      case 2:
        return (
          <StepExamSelect
            value={data.examMode}
            onChange={(v) => updateData('examMode', v)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 3:
        return (
          <StepName
            value={data.name}
            onChange={(v) => updateData('name', v)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 4:
        return (
          <StepResetTime
            value={data.resetTime}
            onChange={(v) => updateData('resetTime', v)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 5:
        return (
          <StepPersonalize
            aiEnabled={data.aiAssistantEnabled}
            musicEnabled={data.musicPlayerEnabled}
            onAIChange={(v) => updateData('aiAssistantEnabled', v)}
            onMusicChange={(v) => updateData('musicPlayerEnabled', v)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 6:
        return (
          <StepDiscord
            onJoin={() => {
              updateData('discordJoined', true);
              handleComplete();
            }}
            onSkip={handleComplete}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout>
      <OnboardingProgress current={step} total={TOTAL_STEPS} />
      <div className="ob-step-wrapper">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
            className="ob-step-content"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </OnboardingLayout>
  );
}
