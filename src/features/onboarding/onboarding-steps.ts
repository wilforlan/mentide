export type OnboardingIntention = "journal" | "think" | "both";

export type OnboardingAnswers = {
  name: string;
  intention: OnboardingIntention | null;
  offlineAcknowledged: boolean;
};

export type OnboardingStepId = "name" | "intention" | "offline";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "name",
    title: "What should we call this space?",
    description: "A local profile keeps your notes private to this device.",
  },
  {
    id: "intention",
    title: "What brings you here?",
    description: "We’ll open on today’s page either way — this just sets the tone.",
  },
  {
    id: "offline",
    title: "Your words stay here",
    description:
      "Mentide saves everything offline in SQLite on this machine. No accounts. No cloud.",
  },
];

export const getOnboardingStep = (stepIndex: number): OnboardingStep => {
  const step = ONBOARDING_STEPS[stepIndex];
  if (!step) {
    throw new Error(`Unknown onboarding step: ${stepIndex}`);
  }
  return step;
};

type CanAdvanceOptions = {
  stepIndex: number;
  answers: OnboardingAnswers;
};

export const canAdvanceOnboardingStep = (
  options: CanAdvanceOptions
): boolean => {
  const step = getOnboardingStep(options.stepIndex);
  if (step.id === "name") {
    return options.answers.name.trim().length > 0;
  }
  if (step.id === "intention") {
    return options.answers.intention !== null;
  }
  return options.answers.offlineAcknowledged;
};

export const isLastOnboardingStep = (stepIndex: number): boolean => {
  return stepIndex >= ONBOARDING_STEPS.length - 1;
};
