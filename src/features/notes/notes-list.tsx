import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import type { Note } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewFromContent } from "@/features/notes/note-preview";

type NotesListProps = {
  profileId: string;
  onOpenNote: (noteId: string) => void;
  onCreate: (title: string) => Promise<void>;
};

export const NotesList = ({
  profileId,
  onOpenNote,
  onCreate,
}: NotesListProps): React.JSX.Element => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void window.mentide.notes.listFreeform(profileId).then(setNotes);
  }, [profileId]);

  const createNote = async (): Promise<void> => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }
    await onCreate(nextTitle);
    setTitle("");
    setCreating(false);
    setNotes(await window.mentide.notes.listFreeform(profileId));
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(232,168,124,0.18),_transparent_55%)]" />

      <header className="relative z-10 flex items-end justify-between gap-6 border-b border-sand-300/40 px-8 pb-6 pt-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-500">
            Library
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-ink-900">
            Notes
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-700/65">
            Freeform pages that grow from ideas, promoted nodes, and everything
            between daily entries.
          </p>
        </div>
        <div className="text-right">
          <div className="font-[family-name:var(--font-display)] text-3xl text-ink-900">
            {notes.length}
          </div>
          <div className="text-xs uppercase tracking-[0.16em] text-ink-700/50">
            open pages
          </div>
        </div>
      </header>

      <div className="relative z-10 border-b border-sand-300/30 px-8 py-4">
        {creating ? (
          <div className="flex max-w-xl items-center gap-2">
            <Input
              autoFocus
              value={title}
              placeholder="Title this thought…"
              className="h-11 rounded-2xl border-sand-300/60 bg-sand-50/90 text-base"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void createNote();
                }
                if (event.key === "Escape") {
                  setCreating(false);
                  setTitle("");
                }
              }}
            />
            <Button className="h-11 px-5" onClick={() => void createNote()}>
              Create
            </Button>
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => {
                setCreating(false);
                setTitle("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="soft"
            className="h-11 rounded-2xl px-5"
            onClick={() => setCreating(true)}
          >
            New note
          </Button>
        )}
      </div>

      <div className="relative z-10 flex-1 overflow-auto px-8 py-6">
        {notes.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-start justify-center">
            <p className="font-[family-name:var(--font-display)] text-3xl text-ink-900">
              Your library is quiet.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-700/65">
              Start a freeform note, or promote a graph node when an idea wants
              room to grow.
            </p>
            <Button className="mt-6" onClick={() => setCreating(true)}>
              Write the first one
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {notes.map((note, index) => (
              <button
                key={note.id}
                type="button"
                className="group flex min-h-48 flex-col rounded-[1.75rem] border border-sand-300/50 bg-sand-50/70 p-5 text-left shadow-[0_10px_40px_rgba(61,47,40,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-500/35 hover:bg-sand-50 hover:shadow-[0_18px_50px_rgba(61,47,40,0.08)]"
                style={{ animationDelay: `${index * 40}ms` }}
                onClick={() => onOpenNote(note.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-[family-name:var(--font-display)] text-xl leading-snug text-ink-900 transition group-hover:text-amber-500">
                    {note.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-sand-200/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-700/55">
                    note
                  </span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-700/70">
                  {previewFromContent(note.contentJson)}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-sand-300/40 pt-3 text-xs text-ink-700/45">
                  <span>
                    {formatDistanceToNow(new Date(note.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span>{format(new Date(note.updatedAt), "MMM d")}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
