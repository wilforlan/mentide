import { format } from "date-fns";
import { useEffect, useState } from "react";
import type { ItemHub } from "@shared/types";
import { Button } from "@/components/ui/button";

type ItemHubViewProps = {
  profileId: string;
  title?: string;
  nodeId?: string;
  onBack: () => void;
  onOpenNote: (noteId: string) => void;
  onOpenItem: (title: string) => void;
  onPromote: (nodeId: string) => Promise<void>;
};

export const ItemHubView = ({
  profileId,
  title,
  nodeId,
  onBack,
  onOpenNote,
  onOpenItem,
  onPromote,
}: ItemHubViewProps): React.JSX.Element => {
  const [hub, setHub] = useState<ItemHub | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void window.mentide.nodes
      .getHub({ profileId, title, nodeId })
      .then((result) => {
        if (!cancelled) {
          setHub(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Item not found");
          setHub(null);
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
  }, [profileId, title, nodeId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-ink-700/70">
        Gathering mentions…
      </div>
    );
  }

  if (error || !hub) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-ink-700">{error ?? "Item not found"}</p>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="flex items-center gap-3 border-b border-sand-300/50 px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
            Item
          </p>
          <h2 className="truncate font-[family-name:var(--font-display)] text-2xl text-ink-900">
            {hub.node.title}
          </h2>
        </div>
        {hub.node.noteId ? (
          <Button
            size="sm"
            onClick={() => {
              const noteId = hub.node.noteId;
              if (noteId) {
                onOpenNote(noteId);
              }
            }}
          >
            Open note
          </Button>
        ) : (
          <Button size="sm" onClick={() => void onPromote(hub.node.id)}>
            Promote to note
          </Button>
        )}
      </header>

      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">
            Mentions
          </h3>
          <p className="mt-1 text-sm text-ink-700/60">
            Bookmark-like context from every place this item appears.
          </p>
          {hub.mentions.length === 0 ? (
            <p className="mt-6 text-sm text-ink-700/60">
              No mentions yet. Link it with [[{hub.node.title}]] while writing.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {hub.mentions.map((mention, index) => (
                <button
                  key={`${mention.noteId}-${index}`}
                  type="button"
                  className="block w-full rounded-2xl border border-sand-300/60 bg-sand-50/70 px-4 py-3 text-left transition hover:bg-sand-100"
                  onClick={() => onOpenNote(mention.noteId)}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink-900">
                      {mention.noteKind === "daily" && mention.noteDate
                        ? format(
                            new Date(`${mention.noteDate}T12:00:00`),
                            "MMM d, yyyy"
                          )
                        : mention.noteTitle}
                    </span>
                    <span className="shrink-0 text-xs text-ink-700/45">
                      {format(new Date(mention.noteUpdatedAt), "PP")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700">
                    {mention.snippet}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-700/70">
            Related
          </h3>
          <p className="mt-1 text-sm text-ink-700/60">
            Often mentioned alongside this item.
          </p>
          {hub.related.length === 0 ? (
            <p className="mt-4 text-sm text-ink-700/60">No co-mentions yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {hub.related.map((item) => (
                <button
                  key={item.node.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-sand-300/60 bg-sand-50/50 px-3 py-2 text-left transition hover:bg-sand-100"
                  onClick={() => onOpenItem(item.node.title)}
                >
                  <span className="font-medium text-ink-900">
                    {item.node.title}
                  </span>
                  <span className="text-xs text-ink-700/50">
                    ×{item.coOccurrenceCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
