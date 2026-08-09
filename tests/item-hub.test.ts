import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "@electron/db/open-database";
import { createItemRepository } from "@electron/db/repositories/items";
import { createNodeRepository } from "@electron/db/repositories/nodes";
import { createNoteRepository } from "@electron/db/repositories/notes";
import { createProfileRepository } from "@electron/db/repositories/profiles";

describe("Item hub", () => {
  let db: Database.Database;
  let dir: string;
  let profileId: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mentide-"));
    db = openDatabase(join(dir, "test.sqlite"));
    profileId = createProfileRepository(db).create("Reader").id;
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns mention bookmarks and related co-occurring items for a node", () => {
    const notes = createNoteRepository(db);
    const nodes = createNodeRepository(db);
    const items = createItemRepository(db);

    const daily = notes.getOrCreateDaily(profileId, "2026-07-31");
    const ideas = notes.createFreeform(profileId, "Ideas");

    notes.updateContent(
      daily.id,
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Protect " },
              {
                type: "text",
                text: "Focus",
                marks: [{ type: "wikiLink", attrs: { title: "Focus" } }],
              },
              { type: "text", text: " and " },
              {
                type: "text",
                text: "Sleep",
                marks: [{ type: "wikiLink", attrs: { title: "Sleep" } }],
              },
              { type: "text", text: "." },
            ],
          },
        ],
      })
    );
    notes.updateContent(
      ideas.id,
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "[[Focus]] needs [[Sleep]]." }],
          },
        ],
      })
    );

    nodes.createFromWikiLink({
      profileId,
      sourceNoteId: daily.id,
      title: "Focus",
    });
    nodes.createFromWikiLink({
      profileId,
      sourceNoteId: daily.id,
      title: "Sleep",
    });
    nodes.createFromWikiLink({
      profileId,
      sourceNoteId: ideas.id,
      title: "Focus",
    });
    nodes.createFromWikiLink({
      profileId,
      sourceNoteId: ideas.id,
      title: "Sleep",
    });

    const hub = items.getHub({ profileId, title: "Focus" });

    expect(hub.node.title).toBe("Focus");
    expect(hub.mentions).toHaveLength(2);
    expect(hub.mentions.map((m) => m.snippet)).toEqual(
      expect.arrayContaining([
        "Protect Focus and Sleep.",
        "[[Focus]] needs [[Sleep]].",
      ])
    );
    expect(hub.related[0]?.node.title).toBe("Sleep");
    expect(hub.related[0]?.coOccurrenceCount).toBe(2);
  });
});
