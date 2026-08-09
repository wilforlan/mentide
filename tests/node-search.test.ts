import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "@electron/db/open-database";
import { createNodeRepository } from "@electron/db/repositories/nodes";
import { createNoteRepository } from "@electron/db/repositories/notes";
import { createProfileRepository } from "@electron/db/repositories/profiles";

describe("Node search", () => {
  let db: Database.Database;
  let dir: string;
  let profileId: string;
  let noteId: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mentide-"));
    db = openDatabase(join(dir, "test.sqlite"));
    profileId = createProfileRepository(db).create("Searcher").id;
    noteId = createNoteRepository(db).getOrCreateDaily(
      profileId,
      "2026-07-31"
    ).id;
    const nodes = createNodeRepository(db);
    nodes.createFromWikiLink({ profileId, sourceNoteId: noteId, title: "Focus" });
    nodes.createFromWikiLink({
      profileId,
      sourceNoteId: noteId,
      title: "Deep Focus",
    });
    nodes.createFromWikiLink({ profileId, sourceNoteId: noteId, title: "Sleep" });
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns partial title matches for an open wiki query", () => {
    const results = createNodeRepository(db).search({
      profileId,
      query: "foc",
    });

    expect(results.map((node) => node.title)).toEqual(["Focus", "Deep Focus"]);
  });

  it("returns recent nodes when the query is empty after [[", () => {
    const results = createNodeRepository(db).search({
      profileId,
      query: "",
      limit: 2,
    });

    expect(results).toHaveLength(2);
  });
});
