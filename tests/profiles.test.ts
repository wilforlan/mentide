import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDatabase } from "@electron/db/open-database";
import { createProfileRepository } from "@electron/db/repositories/profiles";

describe("Profile repository", () => {
  let db: Database.Database;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mentide-"));
    db = openDatabase(join(dir, "test.sqlite"));
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates a profile and lists it among active profiles", () => {
    const profiles = createProfileRepository(db);

    const created = profiles.create("Alice");

    expect(created.name).toBe("Alice");
    expect(created.deletedAt).toBeNull();
    expect(profiles.listActive()).toEqual([created]);
  });

  it("soft-deletes a profile so it leaves the active list and appears archived", () => {
    const profiles = createProfileRepository(db);
    const created = profiles.create("Bob");

    const archived = profiles.softDelete(created.id);

    expect(archived.deletedAt).not.toBeNull();
    expect(profiles.listActive()).toEqual([]);
    expect(profiles.listArchived()).toEqual([archived]);
  });

  it("restores an archived profile back to the active list", () => {
    const profiles = createProfileRepository(db);
    const created = profiles.create("Carol");
    profiles.softDelete(created.id);

    const restored = profiles.restore(created.id);

    expect(restored.deletedAt).toBeNull();
    expect(profiles.listActive()).toEqual([restored]);
    expect(profiles.listArchived()).toEqual([]);
  });
});
