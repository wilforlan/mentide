import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import {
  NodeSchema,
  PinSchema,
  type GraphNode,
  type Pin,
  type PinWithNode,
} from "../../../shared/types";

const MAX_PINS_PER_PROFILE = 5;

type PinRow = {
  id: string;
  profile_id: string;
  node_id: string;
  rank: number;
  created_at: string;
};

type NodeRow = {
  id: string;
  profile_id: string;
  title: string;
  note_id: string | null;
  created_at: string;
  deleted_at: string | null;
};

const mapPin = (row: PinRow): Pin =>
  PinSchema.parse({
    id: row.id,
    profileId: row.profile_id,
    nodeId: row.node_id,
    rank: row.rank,
    createdAt: row.created_at,
  });

const mapNode = (row: NodeRow): GraphNode =>
  NodeSchema.parse({
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    noteId: row.note_id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  });

export const createPinRepository = (db: Database.Database) => {
  const getByProfileAndNode = (
    profileId: string,
    nodeId: string
  ): Pin | null => {
    const row = db
      .prepare(
        `SELECT id, profile_id, node_id, rank, created_at
         FROM pins WHERE profile_id = ? AND node_id = ?`
      )
      .get(profileId, nodeId) as PinRow | undefined;
    return row ? mapPin(row) : null;
  };

  const countForProfile = (profileId: string): number => {
    const row = db
      .prepare(`SELECT COUNT(*) AS count FROM pins WHERE profile_id = ?`)
      .get(profileId) as { count: number };
    return row.count;
  };

  const list = (profileId: string): PinWithNode[] => {
    const rows = db
      .prepare(
        `SELECT
           p.id AS pin_id,
           p.profile_id AS pin_profile_id,
           p.node_id AS pin_node_id,
           p.rank AS pin_rank,
           p.created_at AS pin_created_at,
           n.id AS id,
           n.profile_id AS profile_id,
           n.title AS title,
           n.note_id AS note_id,
           n.created_at AS created_at,
           n.deleted_at AS deleted_at
         FROM pins p
         INNER JOIN nodes n ON n.id = p.node_id
         WHERE p.profile_id = ? AND n.deleted_at IS NULL
         ORDER BY p.rank ASC, p.created_at ASC`
      )
      .all(profileId) as Array<
      NodeRow & {
        pin_id: string;
        pin_profile_id: string;
        pin_node_id: string;
        pin_rank: number;
        pin_created_at: string;
      }
    >;

    return rows.map((row) => ({
      ...mapPin({
        id: row.pin_id,
        profile_id: row.pin_profile_id,
        node_id: row.pin_node_id,
        rank: row.pin_rank,
        created_at: row.pin_created_at,
      }),
      node: mapNode(row),
    }));
  };

  const add = (options: { profileId: string; nodeId: string }): Pin => {
    const existing = getByProfileAndNode(options.profileId, options.nodeId);
    if (existing) {
      return existing;
    }

    const node = db
      .prepare(
        `SELECT id FROM nodes
         WHERE id = ? AND profile_id = ? AND deleted_at IS NULL`
      )
      .get(options.nodeId, options.profileId) as { id: string } | undefined;
    if (!node) {
      throw new Error(`Node not found: ${options.nodeId}`);
    }

    if (countForProfile(options.profileId) >= MAX_PINS_PER_PROFILE) {
      throw new Error(
        `A profile can pin a maximum of ${MAX_PINS_PER_PROFILE} wiki items`
      );
    }

    const nextRankRow = db
      .prepare(
        `SELECT COALESCE(MAX(rank), -1) + 1 AS next_rank
         FROM pins WHERE profile_id = ?`
      )
      .get(options.profileId) as { next_rank: number };

    const pin: Pin = {
      id: uuid(),
      profileId: options.profileId,
      nodeId: options.nodeId,
      rank: nextRankRow.next_rank,
      createdAt: new Date().toISOString(),
    };

    db.prepare(
      `INSERT INTO pins (id, profile_id, node_id, rank, created_at)
       VALUES (@id, @profileId, @nodeId, @rank, @createdAt)`
    ).run(pin);

    return pin;
  };

  const remove = (options: { profileId: string; nodeId: string }): void => {
    db.prepare(`DELETE FROM pins WHERE profile_id = ? AND node_id = ?`).run(
      options.profileId,
      options.nodeId
    );
  };

  const isPinned = (options: { profileId: string; nodeId: string }): boolean => {
    return getByProfileAndNode(options.profileId, options.nodeId) !== null;
  };

  return {
    list,
    add,
    remove,
    isPinned,
  };
};

export type PinRepository = ReturnType<typeof createPinRepository>;
