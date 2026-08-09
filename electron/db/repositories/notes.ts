import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import {
  emptyDocJson,
  NoteSchema,
  type Note,
  type NoteKind,
} from "../../../shared/types";

type NoteRow = {
  id: string;
  profile_id: string;
  kind: NoteKind;
  title: string;
  date: string | null;
  content_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const mapNote = (row: NoteRow): Note =>
  NoteSchema.parse({
    id: row.id,
    profileId: row.profile_id,
    kind: row.kind,
    title: row.title,
    date: row.date,
    contentJson: row.content_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

export const createNoteRepository = (db: Database.Database) => {
  const getById = (id: string): Note | null => {
    const row = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes WHERE id = ?`
      )
      .get(id) as NoteRow | undefined;
    return row ? mapNote(row) : null;
  };

  const getOrCreateDaily = (profileId: string, date: string): Note => {
    const existing = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes
         WHERE profile_id = ? AND kind = 'daily' AND date = ? AND deleted_at IS NULL`
      )
      .get(profileId, date) as NoteRow | undefined;
    if (existing) {
      return mapNote(existing);
    }

    const now = new Date().toISOString();
    const note: Note = {
      id: uuid(),
      profileId,
      kind: "daily",
      title: date,
      date,
      contentJson: emptyDocJson,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    db.prepare(
      `INSERT INTO notes
       (id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at)
       VALUES (@id, @profileId, @kind, @title, @date, @contentJson, @createdAt, @updatedAt, @deletedAt)`
    ).run(note);
    return note;
  };

  const createFreeform = (profileId: string, title: string): Note => {
    const now = new Date().toISOString();
    const note: Note = {
      id: uuid(),
      profileId,
      kind: "freeform",
      title: title.trim() || "Untitled",
      date: null,
      contentJson: emptyDocJson,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    db.prepare(
      `INSERT INTO notes
       (id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at)
       VALUES (@id, @profileId, @kind, @title, @date, @contentJson, @createdAt, @updatedAt, @deletedAt)`
    ).run(note);
    return note;
  };

  const listFreeform = (profileId: string): Note[] => {
    const rows = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes
         WHERE profile_id = ? AND kind = 'freeform' AND deleted_at IS NULL
         ORDER BY updated_at DESC`
      )
      .all(profileId) as NoteRow[];
    return rows.map(mapNote);
  };

  const listRecent = (profileId: string, limit: number): Note[] => {
    const rows = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes
         WHERE profile_id = ? AND deleted_at IS NULL
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(profileId, limit) as NoteRow[];
    return rows.map(mapNote);
  };

  const listArchived = (profileId: string): Note[] => {
    const rows = db
      .prepare(
        `SELECT id, profile_id, kind, title, date, content_json, created_at, updated_at, deleted_at
         FROM notes
         WHERE profile_id = ? AND deleted_at IS NOT NULL
         ORDER BY deleted_at DESC`
      )
      .all(profileId) as NoteRow[];
    return rows.map(mapNote);
  };

  const updateContent = (id: string, contentJson: string): Note => {
    const updatedAt = new Date().toISOString();
    db.prepare(
      `UPDATE notes SET content_json = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`
    ).run(contentJson, updatedAt, id);
    const note = getById(id);
    if (!note || note.deletedAt) {
      throw new Error(`Note not found: ${id}`);
    }
    return note;
  };

  const softDelete = (id: string): Note => {
    const deletedAt = new Date().toISOString();
    db.prepare(
      `UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`
    ).run(deletedAt, deletedAt, id);
    const note = getById(id);
    if (!note) {
      throw new Error(`Note not found: ${id}`);
    }
    return note;
  };

  const restore = (id: string): Note => {
    const updatedAt = new Date().toISOString();
    db.prepare(
      `UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL`
    ).run(updatedAt, id);
    const note = getById(id);
    if (!note) {
      throw new Error(`Note not found: ${id}`);
    }
    return note;
  };

  return {
    getById,
    getOrCreateDaily,
    createFreeform,
    listFreeform,
    listRecent,
    listArchived,
    updateContent,
    softDelete,
    restore,
  };
};

export type NoteRepository = ReturnType<typeof createNoteRepository>;
