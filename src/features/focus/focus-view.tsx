import { format } from "date-fns";
import { useEffect, useState } from "react";
import type { Note, PinWithNode } from "@shared/types";
import { Button } from "@/components/ui/button";
import {
  isEmptyNoteContent,
  pickContinueNote,
  rankHubsByLinkCount,
  type RankedHub,
} from "@/features/focus/focus-model";
import { previewFromContent } from "@/features/notes/note-preview";

type FocusViewProps = {
  profileId: string;
  onOpenNote: (noteId: string) => void;
  onOpenToday: () => void;
  onOpenItem: (title: string) => void;
};

export const FocusView = ({
  profileId,
  onOpenNote,
  onOpenToday,
  onOpenItem,
}: FocusViewProps): React.JSX.Element => {
  const [continueNote, setContinueNote] = useState<Note | null>(null);
  const [todayNote, setTodayNote] = useState<Note | null>(null);
  const [pins, setPins] = useState<PinWithNode[]>([]);
  const [recentFreeform, setRecentFreeform] = useState<Note[]>([]);
  const [hubs, setHubs] = useState<RankedHub[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    const [recent, today, pinList, graph] = await Promise.all([
      window.mentide.notes.listRecent(profileId, 40),
      window.mentide.notes.getToday(profileId),
      window.mentide.pins.list(profileId),
      window.mentide.graph.get(profileId),
    ]);
    setContinueNote(pickContinueNote(recent));
    setTodayNote(today);
    setPins(pinList);
    setRecentFreeform(
      recent.filter((note) => note.kind === "freeform").slice(0, 5)
    );
    setHubs(rankHubsByLinkCount(graph, 5));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch(() => {
        if (!cancelled) {
          setContinueNote(null);
          setTodayNote(null);
          setPins([]);
          setRecentFreeform([]);
          setHubs([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const unpin = async (nodeId: string): Promise<void> => {
    await window.mentide.pins.remove({ profileId, nodeId });
    setPins((current) => current.filter((pin) => pin.nodeId !== nodeId));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-ink-700/70">
        Gathering focus…
      </div>
    );
  }

  const todayEmpty = todayNote ? isEmptyNoteContent(todayNote.contentJson) : true;

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="border-b border-sand-300/40 px-8 pb-6 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-500">
          Orient
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-ink-900">
          Focus
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-700/65">
          Resume where you left off, keep a few priorities close, then return to
          writing.
        </p>
      </header>

      <div className="space-y-8 px-8 py-6">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">
            Continue
          </h3>
          {continueNote ? (
            <button
              type="button"
              className="mt-3 block w-full rounded-2xl border border-sand-300/60 bg-sand-50/70 px-4 py-4 text-left transition hover:bg-sand-100"
              onClick={() => onOpenNote(continueNote.id)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-[family-name:var(--font-display)] text-xl text-ink-900">
                  {continueNote.kind === "daily" && continueNote.date
                    ? format(
                        new Date(`${continueNote.date}T12:00:00`),
                        "MMM d, yyyy"
                      )
                    : continueNote.title}
                </span>
                <span className="text-xs text-ink-700/45">
                  {format(new Date(continueNote.updatedAt), "MMM d")}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-700/70">
                {previewFromContent(continueNote.contentJson)}
              </p>
            </button>
          ) : (
            <p className="mt-3 text-sm text-ink-700/60">
              Nothing to resume yet. Start on today&apos;s page.
            </p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">
            Today
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-sand-300/50 bg-sand-50/50 px-4 py-3">
            <p className="min-w-0 flex-1 text-sm text-ink-700/75">
              {todayEmpty
                ? "Today’s page is still open and quiet."
                : previewFromContent(todayNote?.contentJson ?? "")}
            </p>
            <Button size="sm" variant="soft" onClick={onOpenToday}>
              {todayEmpty ? "Open today’s page" : "Continue today"}
            </Button>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">
            Priorities
          </h3>
          {pins.length === 0 ? (
            <p className="mt-3 text-sm text-ink-700/60">
              Pin up to five wiki items from an item hub to keep them here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pins.map((pin) => (
                <li
                  key={pin.id}
                  className="flex items-center gap-2 rounded-xl border border-sand-300/60 bg-sand-50/60 px-3 py-2"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left font-medium text-ink-900 hover:text-amber-600"
                    onClick={() => onOpenItem(pin.node.title)}
                  >
                    {pin.node.title}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void unpin(pin.nodeId)}
                  >
                    Unpin
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">
            Recent notes
          </h3>
          {recentFreeform.length === 0 ? (
            <p className="mt-3 text-sm text-ink-700/60">No freeform notes yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentFreeform.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-sand-300/50 bg-sand-50/50 px-3 py-2 text-left transition hover:bg-sand-100"
                    onClick={() => onOpenNote(note.id)}
                  >
                    <div className="font-medium text-ink-900">{note.title}</div>
                    <p className="mt-1 text-sm text-ink-700/65">
                      {previewFromContent(note.contentJson)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">
            Hubs
          </h3>
          {hubs.length === 0 ? (
            <p className="mt-3 text-sm text-ink-700/60">
              Linked wiki items will surface here as your graph grows.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {hubs.map((hub) => (
                <li key={hub.node.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-sand-300/50 bg-sand-50/50 px-3 py-2 text-left transition hover:bg-sand-100"
                    onClick={() => onOpenItem(hub.node.title)}
                  >
                    <span className="font-medium text-ink-900">
                      {hub.node.title}
                    </span>
                    <span className="text-xs text-ink-700/50">
                      ×{hub.linkCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
