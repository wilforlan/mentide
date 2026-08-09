import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "@electron/db/open-database";
import { createGraphRepository } from "@electron/db/repositories/graph";
import { createNodeRepository } from "@electron/db/repositories/nodes";
import { createNoteRepository } from "@electron/db/repositories/notes";
import { createProfileRepository } from "@electron/db/repositories/profiles";

describe("Wiki-link nodes", () => {
  let db: Database.Database;
  let dir: string;
  let profileId: string;
  let sourceNoteId: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mentide-"));
    db = openDatabase(join(dir, "test.sqlite"));
    profileId = createProfileRepository(db).create("Linker").id;
    sourceNoteId = createNoteRepository(db).getOrCreateDaily(
      profileId,
      "2026-07-30"
    ).id;
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates a stub node and link from a wiki title without a note yet", () => {
    const nodes = createNodeRepository(db);

    const result = nodes.createFromWikiLink({
      profileId,
      sourceNoteId,
      title: "Focus",
    });

    expect(result.node.title).toBe("Focus");
    expect(result.node.noteId).toBeNull();
    expect(result.link.sourceNoteId).toBe(sourceNoteId);
    expect(result.link.targetNodeId).toBe(result.node.id);
    expect(result.link.label).toBe("Focus");
  });

  it("reuses an existing node when the wiki title matches case-insensitively", () => {
    const nodes = createNodeRepository(db);
    const first = nodes.createFromWikiLink({
      profileId,
      sourceNoteId,
      title: "Focus",
    });

    const second = nodes.createFromWikiLink({
      profileId,
      sourceNoteId,
      title: "focus",
    });

    expect(second.node.id).toBe(first.node.id);
  });

  it("promotes a stub node into a freeform note", () => {
    const nodes = createNodeRepository(db);
    const { node } = nodes.createFromWikiLink({
      profileId,
      sourceNoteId,
      title: "Focus",
    });

    const promoted = nodes.promote(node.id);

    expect(promoted.note.kind).toBe("freeform");
    expect(promoted.note.title).toBe("Focus");
    expect(promoted.node.noteId).toBe(promoted.note.id);
  });

  it("exposes nodes and links for the graph view", () => {
    const nodes = createNodeRepository(db);
    nodes.createFromWikiLink({
      profileId,
      sourceNoteId,
      title: "Focus",
    });

    const graph = createGraphRepository(db).get(profileId);

    expect(graph.nodes).toHaveLength(1);
    expect(graph.links).toHaveLength(1);
    expect(graph.nodes[0]?.title).toBe("Focus");
  });
});
