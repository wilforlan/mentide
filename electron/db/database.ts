import type Database from "better-sqlite3";
import { app } from "electron";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  getMindwtrMigrationStatus,
  migrateFromMindwtrIfNeeded,
  resolveMigrationPaths,
  type MigrateFromMindwtrResult,
  type MindwtrMigrationStatus,
} from "./migrate-from-mindwtr";
import { openDatabase } from "./open-database";

let dbInstance: Database.Database | null = null;

export const getDatabasePath = (): string => {
  const userDataPath = app.getPath("userData");
  mkdirSync(userDataPath, { recursive: true });
  return join(userDataPath, "mentide.sqlite");
};

const migrationOptions = () =>
  resolveMigrationPaths({
    userDataPath: app.getPath("userData"),
    appDataPath: app.getPath("appData"),
  });

const runMindwtrMigration = (): void => {
  try {
    const result = migrateFromMindwtrIfNeeded(migrationOptions());
    if (result.migrated) {
      console.info("[mentide] Migrated database from mindwtr userData");
    }
  } catch (error) {
    console.error("[mentide] mindwtr database migration failed", error);
  }
};

export const getDb = (): Database.Database => {
  if (dbInstance) {
    return dbInstance;
  }
  runMindwtrMigration();
  dbInstance = openDatabase(getDatabasePath());
  return dbInstance;
};

export const closeDb = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

export const getMindwtrMigrationAvailability = (): MindwtrMigrationStatus => {
  return getMindwtrMigrationStatus(migrationOptions());
};

export const runMindwtrMigrationFromUi = (): MigrateFromMindwtrResult => {
  const options = migrationOptions();
  const status = getMindwtrMigrationStatus(options);
  if (!status.available) {
    return {
      migrated: false,
      reason: status.alreadyMigrated
        ? "marker-present"
        : status.targetHasMeaningfulContent
          ? "target-has-content"
          : "source-missing",
    };
  }

  closeDb();
  try {
    const result = migrateFromMindwtrIfNeeded(options);
    getDb();
    return result;
  } catch (error) {
    getDb();
    throw error;
  }
};
