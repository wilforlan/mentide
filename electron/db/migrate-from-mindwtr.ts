import Database from "better-sqlite3";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { emptyDocJson } from "../../shared/types";

export type MigrateFromMindwtrOptions = {
  mentideUserDataPath: string;
  mentideDbPath: string;
  mindwtrDbPath: string;
};

export type MigrateFromMindwtrResult = {
  migrated: boolean;
  reason?: string;
};

export type MindwtrMigrationStatus = {
  available: boolean;
  sourcePresent: boolean;
  sourceHasContent: boolean;
  targetHasMeaningfulContent: boolean;
  alreadyMigrated: boolean;
};

const MIGRATION_MARKER = "migrated-from-mindwtr.json";

const tableExists = (db: Database.Database, table: string): boolean => {
  const row = db
    .prepare(
      "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(table) as { ok: number } | undefined;
  return row !== undefined;
};

const countRows = (db: Database.Database, sql: string): number => {
  const row = db.prepare(sql).get() as { count: number };
  return row.count;
};

const databaseHasSourceContent = (dbPath: string): boolean => {
  if (!existsSync(dbPath)) {
    return false;
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    if (tableExists(db, "profiles") && countRows(db, "SELECT COUNT(*) AS count FROM profiles") > 0) {
      return true;
    }
    if (tableExists(db, "notes") && countRows(db, "SELECT COUNT(*) AS count FROM notes") > 0) {
      return true;
    }
    if (tableExists(db, "nodes") && countRows(db, "SELECT COUNT(*) AS count FROM nodes") > 0) {
      return true;
    }
    return false;
  } finally {
    db.close();
  }
};

const noteContentIsMeaningful = (contentJson: string): boolean => {
  if (contentJson !== emptyDocJson) {
    try {
      const doc = JSON.parse(contentJson) as {
        content?: Array<{
          content?: Array<{ text?: string }>;
        }>;
      };
      const parts: string[] = [];
      for (const block of doc.content ?? []) {
        for (const child of block.content ?? []) {
          if (child.text) {
            parts.push(child.text);
          }
        }
      }
      return parts.join(" ").replace(/\s+/g, " ").trim().length > 0;
    } catch {
      return contentJson.trim().length > 0;
    }
  }
  return false;
};

const databaseHasMeaningfulMentideContent = (dbPath: string): boolean => {
  if (!existsSync(dbPath)) {
    return false;
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    if (
      tableExists(db, "nodes") &&
      countRows(db, "SELECT COUNT(*) AS count FROM nodes WHERE deleted_at IS NULL") > 0
    ) {
      return true;
    }
    if (tableExists(db, "links") && countRows(db, "SELECT COUNT(*) AS count FROM links") > 0) {
      return true;
    }
    if (
      tableExists(db, "notes") &&
      countRows(
        db,
        "SELECT COUNT(*) AS count FROM notes WHERE deleted_at IS NULL AND kind = 'freeform'"
      ) > 0
    ) {
      return true;
    }
    if (tableExists(db, "notes")) {
      const rows = db
        .prepare(
          `SELECT content_json FROM notes WHERE deleted_at IS NULL`
        )
        .all() as Array<{ content_json: string }>;
      if (rows.some((row) => noteContentIsMeaningful(row.content_json))) {
        return true;
      }
    }
    return false;
  } finally {
    db.close();
  }
};

const readAlreadyMigrated = (markerPath: string): boolean => {
  if (!existsSync(markerPath)) {
    return false;
  }
  try {
    const raw = JSON.parse(readFileSync(markerPath, "utf8")) as {
      source?: string;
      skipped?: string;
    };
    return typeof raw.source === "string" && !raw.skipped;
  } catch {
    return true;
  }
};

const copySidecar = (
  sourceDbPath: string,
  targetDbPath: string,
  suffix: string
): void => {
  const source = `${sourceDbPath}${suffix}`;
  const target = `${targetDbPath}${suffix}`;
  if (existsSync(source)) {
    copyFileSync(source, target);
  } else if (existsSync(target)) {
    unlinkSync(target);
  }
};

export const copySqliteWithSidecars = (options: {
  sourceDbPath: string;
  targetDbPath: string;
}): void => {
  mkdirSync(dirname(options.targetDbPath), { recursive: true });
  copyFileSync(options.sourceDbPath, options.targetDbPath);
  copySidecar(options.sourceDbPath, options.targetDbPath, "-wal");
  copySidecar(options.sourceDbPath, options.targetDbPath, "-shm");
};

export const getMindwtrMigrationStatus = (
  options: MigrateFromMindwtrOptions
): MindwtrMigrationStatus => {
  const { mentideUserDataPath, mentideDbPath, mindwtrDbPath } = options;
  const markerPath = join(mentideUserDataPath, MIGRATION_MARKER);
  const sourcePresent = existsSync(mindwtrDbPath);
  const sourceHasContent = sourcePresent && databaseHasSourceContent(mindwtrDbPath);
  const targetHasMeaningfulContent =
    databaseHasMeaningfulMentideContent(mentideDbPath);
  const alreadyMigrated = readAlreadyMigrated(markerPath);

  return {
    available:
      sourceHasContent && !alreadyMigrated && !targetHasMeaningfulContent,
    sourcePresent,
    sourceHasContent,
    targetHasMeaningfulContent,
    alreadyMigrated,
  };
};

export const migrateFromMindwtrIfNeeded = (
  options: MigrateFromMindwtrOptions
): MigrateFromMindwtrResult => {
  const { mentideUserDataPath, mentideDbPath, mindwtrDbPath } = options;
  const markerPath = join(mentideUserDataPath, MIGRATION_MARKER);

  mkdirSync(mentideUserDataPath, { recursive: true });

  const status = getMindwtrMigrationStatus(options);
  if (!status.available) {
    if (status.alreadyMigrated) {
      return { migrated: false, reason: "marker-present" };
    }
    if (!status.sourcePresent || !status.sourceHasContent) {
      return { migrated: false, reason: "source-missing" };
    }
    if (status.targetHasMeaningfulContent) {
      return { migrated: false, reason: "target-has-content" };
    }
    return { migrated: false, reason: "unavailable" };
  }

  copySqliteWithSidecars({
    sourceDbPath: mindwtrDbPath,
    targetDbPath: mentideDbPath,
  });

  writeFileSync(
    markerPath,
    JSON.stringify({
      migratedAt: new Date().toISOString(),
      source: mindwtrDbPath,
    })
  );

  return { migrated: true };
};

export const resolveDefaultMindwtrDbPath = (appDataPath: string): string => {
  return join(appDataPath, "mindwtr", "mindwtr.sqlite");
};

export const resolveMigrationPaths = (options: {
  userDataPath: string;
  appDataPath: string;
}): MigrateFromMindwtrOptions => {
  return {
    mentideUserDataPath: options.userDataPath,
    mentideDbPath: join(options.userDataPath, "mentide.sqlite"),
    mindwtrDbPath: resolveDefaultMindwtrDbPath(options.appDataPath),
  };
};
