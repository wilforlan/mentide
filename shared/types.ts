import { z } from "zod";

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const NoteKindSchema = z.enum(["daily", "freeform"]);
export type NoteKind = z.infer<typeof NoteKindSchema>;

export const NoteSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  kind: NoteKindSchema,
  title: z.string(),
  date: z.string().nullable(),
  contentJson: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Note = z.infer<typeof NoteSchema>;

export const NodeSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  title: z.string().min(1),
  noteId: z.string().uuid().nullable(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type GraphNode = z.infer<typeof NodeSchema>;

export const LinkSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  sourceNoteId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  label: z.string(),
  createdAt: z.string(),
});

export type GraphLink = z.infer<typeof LinkSchema>;

export const NoteVersionSchema = z.object({
  id: z.string().uuid(),
  noteId: z.string().uuid(),
  contentJson: z.string(),
  createdAt: z.string(),
});

export type NoteVersion = z.infer<typeof NoteVersionSchema>;

export const emptyDocJson = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type MentionBookmark = {
  noteId: string;
  noteTitle: string;
  noteKind: NoteKind;
  noteDate: string | null;
  noteUpdatedAt: string;
  snippet: string;
};

export type RelatedItem = {
  node: GraphNode;
  coOccurrenceCount: number;
};

export type ItemHub = {
  node: GraphNode;
  mentions: MentionBookmark[];
  related: RelatedItem[];
};

export type MentideApi = {
  profiles: {
    list: () => Promise<Profile[]>;
    listArchived: () => Promise<Profile[]>;
    create: (name: string) => Promise<Profile>;
    softDelete: (id: string) => Promise<Profile>;
    restore: (id: string) => Promise<Profile>;
  };
  notes: {
    getToday: (profileId: string) => Promise<Note>;
    getByDate: (profileId: string, date: string) => Promise<Note>;
    listFreeform: (profileId: string) => Promise<Note[]>;
    getById: (id: string) => Promise<Note | null>;
    createFreeform: (profileId: string, title: string) => Promise<Note>;
    updateContent: (id: string, contentJson: string) => Promise<Note>;
    softDelete: (id: string) => Promise<Note>;
    restore: (id: string) => Promise<Note>;
    listArchived: (profileId: string) => Promise<Note[]>;
  };
  nodes: {
    createFromWikiLink: (options: {
      profileId: string;
      sourceNoteId: string;
      title: string;
    }) => Promise<{ node: GraphNode; link: GraphLink }>;
    promote: (nodeId: string) => Promise<{ node: GraphNode; note: Note }>;
    getById: (id: string) => Promise<GraphNode | null>;
    getHub: (options: {
      profileId: string;
      title?: string;
      nodeId?: string;
    }) => Promise<ItemHub>;
    search: (options: {
      profileId: string;
      query: string;
      limit?: number;
    }) => Promise<GraphNode[]>;
  };
  graph: {
    get: (profileId: string) => Promise<GraphData>;
  };
  history: {
    listVersions: (noteId: string) => Promise<NoteVersion[]>;
    saveVersion: (noteId: string) => Promise<NoteVersion>;
    restoreVersion: (versionId: string) => Promise<Note>;
  };
};
