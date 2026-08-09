import { format, subDays } from "date-fns";
import { useEffect, useState } from "react";
import type { Note, NoteVersion } from "@shared/types";
import { Button } from "@/components/ui/button";

type HistoryViewProps = {
  profileId: string;
  activeNote: Note | null;
  onOpenDate: (date: string) => Promise<void>;
  onOpenNote: (noteId: string) => void;
  onRestored: (note: Note) => void;
};

export const HistoryView = ({
  profileId,
  activeNote,
  onOpenDate,
  onOpenNote,
  onRestored,
}: HistoryViewProps): React.JSX.Element => {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const dates = Array.from({ length: 14 }, (_, index) =>
    format(subDays(new Date(), index), "yyyy-MM-dd")
  );

  useEffect(() => {
    void window.mentide.notes.listArchived(profileId).then(setArchivedNotes);
  }, [profileId]);

  useEffect(() => {
    if (!activeNote) {
      setVersions([]);
      return;
    }
    void window.mentide.history.listVersions(activeNote.id).then(setVersions);
  }, [activeNote]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-ink-900">
          History
        </h2>
        <p className="mt-1 text-sm text-ink-700/70">
          Browse by date, restore archived notes, or rewind a note’s versions.
        </p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-700/70">
          By date
        </h3>
        <div className="flex flex-wrap gap-2">
          {dates.map((date) => (
            <Button
              key={date}
              variant="outline"
              size="sm"
              onClick={() => void onOpenDate(date)}
            >
              {format(new Date(`${date}T12:00:00`), "MMM d")}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-700/70">
          Versions
          {activeNote ? ` · ${activeNote.title}` : ""}
        </h3>
        {!activeNote ? (
          <p className="text-sm text-ink-700/60">
            Open a note first to see its version history.
          </p>
        ) : (
          <div className="space-y-2">
            <Button
              size="sm"
              variant="soft"
              onClick={async () => {
                await window.mentide.history.saveVersion(activeNote.id);
                setVersions(
                  await window.mentide.history.listVersions(activeNote.id)
                );
              }}
            >
              Save version now
            </Button>
            {versions.length === 0 ? (
              <p className="text-sm text-ink-700/60">No versions yet.</p>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-2xl border border-sand-300/60 bg-sand-50/50 px-4 py-2"
                >
                  <span className="text-sm text-ink-700">
                    {format(new Date(version.createdAt), "PPp")}
                  </span>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const restored =
                        await window.mentide.history.restoreVersion(version.id);
                      onRestored(restored);
                      setVersions(
                        await window.mentide.history.listVersions(restored.id)
                      );
                    }}
                  >
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-700/70">
          Archived notes
        </h3>
        {archivedNotes.length === 0 ? (
          <p className="text-sm text-ink-700/60">Nothing archived.</p>
        ) : (
          <div className="space-y-2">
            {archivedNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between rounded-2xl border border-sand-300/60 bg-sand-50/50 px-4 py-2"
              >
                <button
                  type="button"
                  className="text-left text-sm text-ink-700 hover:underline"
                  onClick={() => onOpenNote(note.id)}
                >
                  {note.title}{" "}
                  <span className="text-ink-700/50">({note.kind})</span>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await window.mentide.notes.restore(note.id);
                    setArchivedNotes(
                      await window.mentide.notes.listArchived(profileId)
                    );
                  }}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
