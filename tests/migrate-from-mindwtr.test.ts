import Database from "better-sqlite3";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@electron/db/open-database";
import {
  copySqliteWithSidecars,
  getMindwtrMigrationStatus,
  migrateFromMindwtrIfNeeded,
} from "@electron/db/migrate-from-mindwtr";
import { createNoteRepository } from "@electron/db/repositories/notes";
import { createProfileRepository } from "@electron/db/repositories/profiles";

describe("mindwtr → Mentide database migration", () => {
  let root: string;
  let mentideUserData: string;
  let mindwtrUserData: string;
  let mentideDbPath: string;
  let mindwtrDbPath: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mentide-migrate-"));
    mentideUserData = join(root, "Mentide");
    mindwtrUserData = join(root, "mindwtr");
    mentideDbPath = join(mentideUserData, "mentide.sqlite");
    mindwtrDbPath = join(mindwtrUserData, "mindwtr.sqlite");
    mkdirSync(mentideUserData, { recursive: true });
    mkdirSync(mindwtrUserData, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const options = () => ({
    mentideUserDataPath: mentideUserData,
    mentideDbPath,
    mindwtrDbPath,
  });

  const seedOldDb = (name: string): void => {
    const db = openDatabase(mindwtrDbPath);
    createProfileRepository(db).create(name);
    db.close();
  };

  it("copies the old mindwtr database into mentide when mentide has no content", () => {
    seedOldDb("Legacy Writer");

    const result = migrateFromMindwtrIfNeeded(options());

    expect(result.migrated).toBe(true);
    expect(existsSync(mentideDbPath)).toBe(true);
    expect(existsSync(join(mentideUserData, "migrated-from-mindwtr.json"))).toBe(
      true
    );

    const db = openDatabase(mentideDbPath);
    const profiles = createProfileRepository(db).listActive();
    expect(profiles.map((p) => p.name)).toEqual(["Legacy Writer"]);
    db.close();
  });

  it("copies wal and shm sidecars when present", () => {
    writeFileSync(mindwtrDbPath, Buffer.from("main-db"));
    writeFileSync(`${mindwtrDbPath}-wal`, Buffer.from("wal-bytes"));
    writeFileSync(`${mindwtrDbPath}-shm`, Buffer.from("shm-bytes"));

    copySqliteWithSidecars({
      sourceDbPath: mindwtrDbPath,
      targetDbPath: mentideDbPath,
    });

    expect(readFileSync(mentideDbPath)).toEqual(Buffer.from("main-db"));
    expect(readFileSync(`${mentideDbPath}-wal`)).toEqual(
      Buffer.from("wal-bytes")
    );
    expect(readFileSync(`${mentideDbPath}-shm`)).toEqual(
      Buffer.from("shm-bytes")
    );
  });

  it("does not overwrite a Mentide database that already has written notes", () => {
    seedOldDb("Legacy Writer");
    const mentideDb = openDatabase(mentideDbPath);
    const profileId = createProfileRepository(mentideDb).create(
      "Existing Mentide"
    ).id;
    const notes = createNoteRepository(mentideDb);
    const daily = notes.getOrCreateDaily(profileId, "2026-07-30");
    notes.updateContent(
      daily.id,
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Keep this" }],
          },
        ],
      })
    );
    mentideDb.close();

    const result = migrateFromMindwtrIfNeeded(options());

    expect(result.migrated).toBe(false);
    const db = openDatabase(mentideDbPath);
    expect(
      createProfileRepository(db)
        .listActive()
        .map((p) => p.name)
    ).toEqual(["Existing Mentide"]);
    db.close();
  });

  it("migrates over a Mentide profile that only has an empty today page", () => {
    seedOldDb("Legacy Writer");
    const mentideDb = openDatabase(mentideDbPath);
    const profileId = createProfileRepository(mentideDb).create("Fresh").id;
    createNoteRepository(mentideDb).getOrCreateDaily(profileId, "2026-08-09");
    mentideDb.close();

    const result = migrateFromMindwtrIfNeeded(options());

    expect(result.migrated).toBe(true);
    const db = openDatabase(mentideDbPath);
    expect(
      createProfileRepository(db)
        .listActive()
        .map((p) => p.name)
    ).toEqual(["Legacy Writer"]);
    db.close();
  });

  it("skips when a successful migration marker is already present", () => {
    seedOldDb("Legacy Writer");
    writeFileSync(
      join(mentideUserData, "migrated-from-mindwtr.json"),
      JSON.stringify({
        migratedAt: "2026-01-01T00:00:00.000Z",
        source: mindwtrDbPath,
      })
    );

    const result = migrateFromMindwtrIfNeeded(options());

    expect(result.migrated).toBe(false);
    expect(existsSync(mentideDbPath)).toBe(false);
  });

  it("skips when the old mindwtr database is missing", () => {
    const result = migrateFromMindwtrIfNeeded(options());

    expect(result.migrated).toBe(false);
    expect(existsSync(mentideDbPath)).toBe(false);
  });

  it("migrates when mentide.sqlite exists but has no profiles or notes", () => {
    seedOldDb("Legacy Writer");
    const empty = new Database(mentideDbPath);
    empty.exec(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE TABLE notes (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        date TEXT,
        content_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
    `);
    empty.close();

    const before = readFileSync(mindwtrDbPath);
    const result = migrateFromMindwtrIfNeeded(options());

    expect(result.migrated).toBe(true);
    expect(readFileSync(mentideDbPath)).toEqual(before);
  });

  it("reports migration available when old data exists and Mentide is empty", () => {
    seedOldDb("Legacy Writer");
    const mentideDb = openDatabase(mentideDbPath);
    createProfileRepository(mentideDb).create("Fresh");
    mentideDb.close();

    const status = getMindwtrMigrationStatus(options());

    expect(status.available).toBe(true);
    expect(status.sourceHasContent).toBe(true);
    expect(status.targetHasMeaningfulContent).toBe(false);
    expect(status.alreadyMigrated).toBe(false);
  });

  it("reports migration unavailable after a successful migrate", () => {
    seedOldDb("Legacy Writer");
    migrateFromMindwtrIfNeeded(options());

    const status = getMindwtrMigrationStatus(options());

    expect(status.available).toBe(false);
    expect(status.alreadyMigrated).toBe(true);
  });
});
