import { useEffect, useState } from "react";
import onboardingPanel from "@/assets/onboarding-panel.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  canAdvanceOnboardingStep,
  isLastOnboardingStep,
  ONBOARDING_STEPS,
  type OnboardingAnswers,
  type OnboardingIntention,
} from "./onboarding-steps";

type OnboardingScreenProps = {
  onCreateProfile: (name: string) => Promise<void>;
};

const INTENTIONS: { id: OnboardingIntention; label: string; hint: string }[] = [
  {
    id: "journal",
    label: "Daily journaling",
    hint: "Show up for today, gently.",
  },
  {
    id: "think",
    label: "Thinking & linking",
    hint: "Grow ideas into a graph.",
  },
  {
    id: "both",
    label: "Both, equally",
    hint: "Journal home, notes and graph first-class.",
  },
];

export const OnboardingScreen = ({
  onCreateProfile,
}: OnboardingScreenProps): React.JSX.Element => {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    name: "",
    intention: null,
    offlineAcknowledged: false,
  });

  const step = ONBOARDING_STEPS[stepIndex];
  const canAdvance = canAdvanceOnboardingStep({ stepIndex, answers });

  useEffect(() => {
    setAnimKey((value) => value + 1);
  }, [stepIndex]);

  const goNext = async (): Promise<void> => {
    if (!canAdvance || !step) {
      return;
    }
    if (isLastOnboardingStep(stepIndex)) {
      setSubmitting(true);
      try {
        await onCreateProfile(answers.name.trim());
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setDirection("forward");
    setStepIndex((value) => value + 1);
  };

  const goBack = (): void => {
    if (stepIndex === 0) {
      return;
    }
    setDirection("back");
    setStepIndex((value) => value - 1);
  };

  return (
    <div className="onboarding-root grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
      <section className="relative flex min-h-0 flex-col justify-between px-8 py-10 sm:px-12 lg:px-16">
        <div>
          <p className="onboarding-brand font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink-900">
            Mentide
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink-700/70">
            A calm place to journal and think — only on this device.
          </p>
        </div>

        <div className="my-10 min-h-[280px] flex-1">
          <div className="mb-6 flex gap-2" aria-hidden>
            {ONBOARDING_STEPS.map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  index <= stepIndex ? "bg-amber-500" : "bg-sand-300/80"
                )}
              />
            ))}
          </div>

          <div
            key={animKey}
            className={cn(
              "onboarding-step max-w-md",
              direction === "forward"
                ? "onboarding-enter-forward"
                : "onboarding-enter-back"
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
              Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-ink-900 sm:text-4xl">
              {step?.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-700/75">
              {step?.description}
            </p>

            <div className="mt-8 space-y-4">
              {step?.id === "name" ? (
                <Input
                  autoFocus
                  value={answers.name}
                  placeholder="Your name or a nickname"
                  className="h-12 rounded-2xl border-sand-300/70 bg-sand-50/90 text-base"
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void goNext();
                    }
                  }}
                />
              ) : null}

              {step?.id === "intention" ? (
                <div className="grid gap-3">
                  {INTENTIONS.map((intention) => (
                    <button
                      key={intention.id}
                      type="button"
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left transition-all duration-300",
                        answers.intention === intention.id
                          ? "border-amber-500/50 bg-sand-100 shadow-sm"
                          : "border-sand-300/70 bg-sand-50/50 hover:border-sand-300 hover:bg-sand-100/80"
                      )}
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          intention: intention.id,
                        }))
                      }
                    >
                      <div className="font-medium text-ink-900">
                        {intention.label}
                      </div>
                      <div className="mt-0.5 text-sm text-ink-700/65">
                        {intention.hint}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {step?.id === "offline" ? (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sand-300/70 bg-sand-50/60 px-4 py-4 transition hover:bg-sand-100/70">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-amber-500"
                    checked={answers.offlineAcknowledged}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        offlineAcknowledged: event.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm leading-relaxed text-ink-700">
                    I understand Mentide keeps my notes offline on this computer
                    only — nothing is uploaded, synced, or tied to an account.
                  </span>
                </label>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className={cn(stepIndex === 0 && "invisible")}
            onClick={goBack}
            disabled={stepIndex === 0 || submitting}
          >
            Back
          </Button>
          <Button
            className="ml-auto min-w-36"
            onClick={() => void goNext()}
            disabled={!canAdvance || submitting}
          >
            {isLastOnboardingStep(stepIndex)
              ? submitting
                ? "Creating…"
                : "Enter Mentide"
              : "Continue"}
          </Button>
        </div>
      </section>

      <aside className="relative hidden min-h-0 overflow-hidden lg:block">
        <img
          src={onboardingPanel}
          alt=""
          className="onboarding-photo absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/35 to-sand-200/20" />
        <div className="absolute inset-0 bg-amber-500/10 mix-blend-soft-light" />

        <div className="onboarding-copy relative z-10 flex h-full flex-col justify-end p-12 xl:p-16">
          <p className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-sand-50 xl:text-6xl">
            Write quietly.
            <br />
            Think clearly.
          </p>
          <p className="mt-6 max-w-md text-base leading-relaxed text-sand-50/85 xl:text-lg">
            Mentide exists for the moments between noise — morning pages, linked
            ideas, and a graph of what you’re becoming. Your data never leaves
            this machine.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.2em] text-sand-50/65">
            <span>Offline by design</span>
            <span>No accounts</span>
            <span>Local SQLite</span>
          </div>
        </div>
      </aside>
    </div>
  );
};
