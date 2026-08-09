import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "@electron/db/open-database";
import { createHistoryRepository } from "@electron/db/repositories/history";
import { createNoteRepository } from "@electron/db/repositories/notes";
import { createProfileRepository } from "@electron/db/repositories/profiles";

describe("Note history versions", () => {
  let db: Database.Database;
  let dir: string;
  let noteId: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mentide-"));
    db = openDatabase(join(dir, "test.sqlite"));
    const profileId = createProfileRepository(db).create("Historian").id;
    noteId = createNoteRepository(db).getOrCreateDaily(
      profileId,
      "2026-07-30"
    ).id;
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("saves a version snapshot of the current note content", () => {
    const notes = createNoteRepository(db);
    const history = createHistoryRepository(db);
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Snapshot A" }],
        },
      ],
    });
    notes.updateContent(noteId, content);

    const version = history.saveVersion(noteId);

    expect(version.contentJson).toBe(content);
    expect(history.listVersions(noteId)).toEqual([version]);
  });

  it("restores a version by writing it back and keeping a snapshot of the prior content", () => {
    const notes = createNoteRepository(db);
    const history = createHistoryRepository(db);
    const firstContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First" }],
        },
      ],
    });
    const secondContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second" }],
        },
      ],
    });
    notes.updateContent(noteId, firstContent);
    const version = history.saveVersion(noteId);
    notes.updateContent(noteId, secondContent);

    const restored = history.restoreVersion(version.id);

    expect(restored.contentJson).toBe(firstContent);
    expect(history.listVersions(noteId).length).toBeGreaterThanOrEqual(2);
  });
});
