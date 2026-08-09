import { useEffect, useState } from "react";
import type { MindwtrMigrationStatus } from "@shared/types";
import { Button } from "@/components/ui/button";

type MindwtrMigrationBannerProps = {
  onMigrated: () => Promise<void>;
};

export const MindwtrMigrationBanner = ({
  onMigrated,
}: MindwtrMigrationBannerProps): React.JSX.Element | null => {
  const [status, setStatus] = useState<MindwtrMigrationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void window.mentide.migration
      .getStatus()
      .then((next) => {
        if (!cancelled) {
          setStatus(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.available || done) {
    return null;
  }

  const startMigration = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await window.mentide.migration.run();
      if (!result.migrated) {
        setError(
          result.reason === "target-has-content"
            ? "Mentide already has notes or links, so the old database was left untouched."
            : "Could not copy the old mindwtr database."
        );
        const next = await window.mentide.migration.getStatus();
        setStatus(next);
        return;
      }
      setDone(true);
      await onMigrated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-sand-300/50 bg-sand-100/80 px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
            Previous data found
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-800">
            Mentide found a mindwtr database from before the rename. Start
            migration to copy that journal into this app.
          </p>
          {error ? (
            <p className="mt-2 text-sm text-amber-800">{error}</p>
          ) : null}
        </div>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void startMigration()}
        >
          {busy ? "Migrating…" : "Start migration"}
        </Button>
      </div>
    </div>
  );
};
