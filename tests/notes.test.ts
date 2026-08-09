import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "@electron/db/open-database";
import { createNoteRepository } from "@electron/db/repositories/notes";
import { createProfileRepository } from "@electron/db/repositories/profiles";
import { emptyDocJson } from "@shared/types";

describe("Note repository", () => {
  let db: Database.Database;
  let dir: string;
  let profileId: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mentide-"));
    db = openDatabase(join(dir, "test.sqlite"));
    profileId = createProfileRepository(db).create("Writer").id;
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates today's daily note when missing and returns the same note on repeat", () => {
    const notes = createNoteRepository(db);

    const first = notes.getOrCreateDaily(profileId, "2026-07-30");
    const second = notes.getOrCreateDaily(profileId, "2026-07-30");

    expect(first.kind).toBe("daily");
    expect(first.date).toBe("2026-07-30");
    expect(second.id).toBe(first.id);
  });

  it("creates freeform notes and lists them for a profile", () => {
    const notes = createNoteRepository(db);

    const note = notes.createFreeform(profileId, "Ideas");

    expect(note.kind).toBe("freeform");
    expect(note.title).toBe("Ideas");
    expect(notes.listFreeform(profileId)).toEqual([note]);
  });

  it("persists content updates across reads", () => {
    const notes = createNoteRepository(db);
    const note = notes.getOrCreateDaily(profileId, "2026-07-30");
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello canvas" }],
        },
      ],
    });

    const updated = notes.updateContent(note.id, content);

    expect(updated.contentJson).toBe(content);
    expect(notes.getById(note.id)?.contentJson).toBe(content);
  });

  it("soft-deletes a daily note and allows recreating that date later", () => {
    const notes = createNoteRepository(db);
    const note = notes.getOrCreateDaily(profileId, "2026-07-30");

    const archived = notes.softDelete(note.id);
    expect(archived.deletedAt).not.toBeNull();
    expect(notes.listArchived(profileId).map((n) => n.id)).toContain(note.id);

    const recreated = notes.getOrCreateDaily(profileId, "2026-07-30");
    expect(recreated.id).not.toBe(note.id);
    expect(recreated.deletedAt).toBeNull();
    expect(recreated.contentJson).toBe(emptyDocJson);
  });

  it("restores an archived note", () => {
    const notes = createNoteRepository(db);
    const note = notes.createFreeform(profileId, "Archive me");
    notes.softDelete(note.id);

    const restored = notes.restore(note.id);

    expect(restored.deletedAt).toBeNull();
    expect(notes.listFreeform(profileId).map((n) => n.id)).toContain(note.id);
  });
});
