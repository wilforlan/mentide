import type Database from "better-sqlite3";
import { app } from "electron";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { openDatabase } from "./open-database";

let dbInstance: Database.Database | null = null;

export const getDatabasePath = (): string => {
  const userDataPath = app.getPath("userData");
  mkdirSync(userDataPath, { recursive: true });
  return join(userDataPath, "mentide.sqlite");
};

export const getDb = (): Database.Database => {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = openDatabase(getDatabasePath());
  return dbInstance;
};

export const closeDb = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};
