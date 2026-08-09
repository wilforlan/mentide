import { format } from "date-fns";
import {
  CalendarDays,
  Crosshair,
  GitFork,
  History,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Note, Profile } from "@shared/types";
import { Button } from "@/components/ui/button";
import { NoteEditor } from "@/features/editor/note-editor";
import { FocusView } from "@/features/focus/focus-view";
import {
  pickContinueNote,
  shouldBootToFocus,
} from "@/features/focus/focus-model";
import { GraphView } from "@/features/graph/graph-view";
import { HistoryView } from "@/features/history/history-view";
import { ItemHubView } from "@/features/items/item-hub-view";
import { MindwtrMigrationBanner } from "@/features/migration/mindwtr-migration-banner";
import { NotesList } from "@/features/notes/notes-list";
import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";
import { ProfileSwitcher } from "@/features/profiles/profile-switcher";
import { shouldAcceptSavedNote } from "@/features/editor/date-scroll";
import { cn } from "@/lib/utils";

type View = "today" | "focus" | "notes" | "graph" | "history" | "item";

export const App = (): React.JSX.Element => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [archivedProfiles, setArchivedProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [view, setView] = useState<View>("today");
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeItemTitle, setActiveItemTitle] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [previousView, setPreviousView] = useState<View>("today");

  const refreshProfiles = useCallback(async () => {
    const [active, archived] = await Promise.all([
      window.mentide.profiles.list(),
      window.mentide.profiles.listArchived(),
    ]);
    setProfiles(active);
    setArchivedProfiles(archived);
    return active;
  }, []);

  const openToday = useCallback(async (profileId: string) => {
    const note = await window.mentide.notes.getToday(profileId);
    setActiveNote(note);
    setView("today");
  }, []);

  const openInitialView = useCallback(async (profileId: string) => {
    const [pins, recent] = await Promise.all([
      window.mentide.pins.list(profileId),
      window.mentide.notes.listRecent(profileId, 40),
    ]);
    const continueNote = pickContinueNote(recent);
    if (shouldBootToFocus({ pinCount: pins.length, continueNote })) {
      setActiveProfileId(profileId);
      setActiveNote(null);
      setView("focus");
      return;
    }
    setActiveProfileId(profileId);
    await openToday(profileId);
  }, [openToday]);

  useEffect(() => {
    void (async () => {
      const active = await refreshProfiles();
      if (active.length > 0) {
        await openInitialView(active[0].id);
      }
      setBootstrapped(true);
    })();
  }, [openInitialView, refreshProfiles]);

  const handleCreateProfile = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const profile = await window.mentide.profiles.create(trimmed);
    await refreshProfiles();
    setActiveProfileId(profile.id);
    await openToday(profile.id);
  };

  const handleSelectProfile = async (profileId: string): Promise<void> => {
    setActiveProfileId(profileId);
    await openToday(profileId);
  };

  const handleMigrationComplete = async (): Promise<void> => {
    const active = await refreshProfiles();
    if (active[0]) {
      setActiveProfileId(active[0].id);
      await openToday(active[0].id);
      return;
    }
    setActiveProfileId(null);
    setActiveNote(null);
  };

  const handleOpenNote = async (noteId: string): Promise<void> => {
    const note = await window.mentide.notes.getById(noteId);
    if (!note) {
      return;
    }
    setActiveNote(note);
    setActiveItemTitle(null);
    setView(note.kind === "daily" ? "today" : "notes");
  };

  const handleOpenItem = (title: string): void => {
    setPreviousView(view === "item" ? previousView : view);
    setActiveItemTitle(title);
    setView("item");
  };

  if (!bootstrapped) {
    return (
      <div className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-2xl text-ink-700">
        Mentide
      </div>
    );
  }

  if (!activeProfileId) {
    return (
      <OnboardingScreen
        onCreateProfile={(name) => handleCreateProfile(name)}
      />
    );
  }

  const navItems: {
    id: Exclude<View, "item">;
    label: string;
    icon: LucideIcon;
  }[] = [
    { id: "today", label: "Today", icon: CalendarDays },
    { id: "focus", label: "Focus", icon: Crosshair },
    { id: "notes", label: "Notes", icon: NotebookPen },
    { id: "graph", label: "Graph", icon: GitFork },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="flex h-full gap-3 p-3">
      <aside className="glass-panel flex w-60 shrink-0 flex-col rounded-3xl p-4">
        <div className="font-[family-name:var(--font-display)] text-2xl text-ink-900">
          Mentide
        </div>
        <p className="mt-1 text-xs text-ink-700/60">
          {format(new Date(), "EEEE, MMM d")}
        </p>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={view === item.id ? "soft" : "ghost"}
                className={cn(
                  "justify-start gap-2.5",
                  view === item.id && "shadow-sm"
                )}
                onClick={() => {
                  setActiveItemTitle(null);
                  setView(item.id);
                  if (item.id === "today" && activeProfileId) {
                    void openToday(activeProfileId);
                  }
                  if (item.id === "notes") {
                    setActiveNote(null);
                  }
                }}
              >
                <Icon
                  className="size-4 shrink-0 opacity-70"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {item.label}
              </Button>
            );
          })}
        </nav>
        <div className="mt-auto pt-4">
          <ProfileSwitcher
            profiles={profiles}
            archivedProfiles={archivedProfiles}
            activeProfileId={activeProfileId}
            onSelect={(id) => void handleSelectProfile(id)}
            onCreate={(name) => {
              void handleCreateProfile(name);
            }}
            onArchive={async (id) => {
              await window.mentide.profiles.softDelete(id);
              const active = await refreshProfiles();
              if (activeProfileId === id) {
                if (active[0]) {
                  setActiveProfileId(active[0].id);
                  await openToday(active[0].id);
                } else {
                  setActiveProfileId(null);
                  setActiveNote(null);
                }
              }
            }}
            onRestore={async (id) => {
              await window.mentide.profiles.restore(id);
              await refreshProfiles();
            }}
          />
        </div>
      </aside>

      <main className="glass-panel min-w-0 flex-1 overflow-hidden rounded-3xl">
        {view === "item" && activeItemTitle ? (
          <ItemHubView
            profileId={activeProfileId}
            title={activeItemTitle}
            onBack={() => {
              setActiveItemTitle(null);
              setView(previousView === "item" ? "today" : previousView);
            }}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onOpenItem={handleOpenItem}
            onPromote={async (nodeId) => {
              const result = await window.mentide.nodes.promote(nodeId);
              setActiveNote(result.note);
              setActiveItemTitle(null);
              setView("notes");
            }}
          />
        ) : null}
        {view === "focus" ? (
          <FocusView
            profileId={activeProfileId}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onOpenToday={() => {
              void openToday(activeProfileId);
            }}
            onOpenItem={handleOpenItem}
          />
        ) : null}
        {view === "graph" ? (
          <GraphView
            profileId={activeProfileId}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onOpenItem={handleOpenItem}
            onPromoteNode={async (nodeId) => {
              const result = await window.mentide.nodes.promote(nodeId);
              setActiveNote(result.note);
              setView("notes");
            }}
          />
        ) : null}
        {view === "history" ? (
          <HistoryView
            profileId={activeProfileId}
            activeNote={activeNote}
            onOpenDate={async (date) => {
              const note = await window.mentide.notes.getByDate(
                activeProfileId,
                date
              );
              setActiveNote(note);
              setView("today");
            }}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onRestored={(note) => setActiveNote(note)}
          />
        ) : null}
        {view === "notes" && !activeNote ? (
          <NotesList
            profileId={activeProfileId}
            onOpenNote={(noteId) => void handleOpenNote(noteId)}
            onCreate={async (title) => {
              const note = await window.mentide.notes.createFreeform(
                activeProfileId,
                title
              );
              setActiveNote(note);
            }}
          />
        ) : null}
        {(view === "today" || (view === "notes" && activeNote)) &&
        activeNote ? (
          <div className="flex h-full min-h-0 flex-col">
            {view === "today" ? (
              <MindwtrMigrationBanner
                onMigrated={() => handleMigrationComplete()}
              />
            ) : null}
            <div className="min-h-0 flex-1">
              <NoteEditor
                note={activeNote}
                profileId={activeProfileId}
                onChange={async ({ noteId, contentJson }) => {
                  const updated = await window.mentide.notes.updateContent(
                    noteId,
                    contentJson
                  );
                  setActiveNote((current) => {
                    if (
                      !current ||
                      !shouldAcceptSavedNote({
                        activeNoteId: current.id,
                        savedNoteId: noteId,
                      })
                    ) {
                      return current;
                    }
                    return updated;
                  });
                }}
                onWikiLink={async (title) => {
                  const result = await window.mentide.nodes.createFromWikiLink({
                    profileId: activeProfileId,
                    sourceNoteId: activeNote.id,
                    title,
                  });
                  return result.node;
                }}
                onOpenItem={handleOpenItem}
                onNavigateDate={
                  activeNote.kind === "daily"
                    ? (date) => {
                        void (async () => {
                          const note = await window.mentide.notes.getByDate(
                            activeProfileId,
                            date
                          );
                          setActiveNote(note);
                          setView("today");
                        })();
                      }
                    : undefined
                }
                onBackToNotes={
                  activeNote.kind === "freeform"
                    ? () => {
                        setActiveNote(null);
                        setView("notes");
                      }
                    : undefined
                }
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};
