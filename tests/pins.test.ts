import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "@electron/db/open-database";
import { createNodeRepository } from "@electron/db/repositories/nodes";
import { createNoteRepository } from "@electron/db/repositories/notes";
import { createPinRepository } from "@electron/db/repositories/pins";
import { createProfileRepository } from "@electron/db/repositories/profiles";

describe("Pin repository", () => {
  let db: Database.Database;
  let dir: string;
  let profileId: string;
  let sourceNoteId: string;

  const createNode = (title: string): string => {
    return createNodeRepository(db).createFromWikiLink({
      profileId,
      sourceNoteId,
      title,
    }).node.id;
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mentide-pins-"));
    db = openDatabase(join(dir, "test.sqlite"));
    profileId = createProfileRepository(db).create("Pinner").id;
    sourceNoteId = createNoteRepository(db).getOrCreateDaily(
      profileId,
      "2026-07-30"
    ).id;
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("pins wiki nodes in rank order and lists them for a profile", () => {
    const pins = createPinRepository(db);
    const alpha = createNode("Alpha");
    const beta = createNode("Beta");

    const first = pins.add({ profileId, nodeId: alpha });
    const second = pins.add({ profileId, nodeId: beta });

    expect(first.rank).toBe(0);
    expect(second.rank).toBe(1);
    expect(pins.list(profileId).map((pin) => pin.node.title)).toEqual([
      "Alpha",
      "Beta",
    ]);
  });

  it("rejects a sixth pin for the same profile", () => {
    const pins = createPinRepository(db);
    for (let index = 0; index < 5; index += 1) {
      pins.add({ profileId, nodeId: createNode(`Node ${index}`) });
    }

    expect(() =>
      pins.add({ profileId, nodeId: createNode("Overflow") })
    ).toThrow(/maximum of 5/i);
    expect(pins.list(profileId)).toHaveLength(5);
  });

  it("removes a pin and ignores soft-deleted nodes on list", () => {
    const pins = createPinRepository(db);
    const nodes = createNodeRepository(db);
    const keepId = createNode("Keep");
    const dropId = createNode("Drop");
    pins.add({ profileId, nodeId: keepId });
    pins.add({ profileId, nodeId: dropId });

    pins.remove({ profileId, nodeId: dropId });
    expect(pins.list(profileId).map((pin) => pin.node.id)).toEqual([keepId]);

    const ghostId = createNode("Ghost");
    pins.add({ profileId, nodeId: ghostId });
    db.prepare(`UPDATE nodes SET deleted_at = ? WHERE id = ?`).run(
      new Date().toISOString(),
      ghostId
    );
    expect(pins.list(profileId).map((pin) => pin.node.id)).toEqual([keepId]);
    expect(nodes.getById(ghostId)?.deletedAt).not.toBeNull();
  });

  it("is idempotent when pinning an already pinned node", () => {
    const pins = createPinRepository(db);
    const nodeId = createNode("Same");
    const first = pins.add({ profileId, nodeId });
    const second = pins.add({ profileId, nodeId });

    expect(second.id).toBe(first.id);
    expect(pins.list(profileId)).toHaveLength(1);
  });
});
