import type { GraphData, GraphNode, Note } from "@shared/types";
import { countNodeAppearances } from "@/features/graph/build-flow-graph";
import { extractPlainText } from "@/features/notes/note-preview";

export type RankedHub = {
  node: GraphNode;
  linkCount: number;
};

export const isEmptyNoteContent = (contentJson: string): boolean => {
  return extractPlainText(contentJson).length === 0;
};

export const pickContinueNote = (notes: Note[]): Note | null => {
  const nonEmpty = notes.filter(
    (note) => note.deletedAt === null && !isEmptyNoteContent(note.contentJson)
  );
  if (nonEmpty.length === 0) {
    return null;
  }
  return nonEmpty.reduce((latest, note) =>
    note.updatedAt > latest.updatedAt ? note : latest
  );
};

export const rankHubsByLinkCount = (
  data: GraphData,
  limit: number
): RankedHub[] => {
  const counts = countNodeAppearances(data);
  return [...data.nodes]
    .filter((node) => node.deletedAt === null)
    .map((node) => ({
      node,
      linkCount: counts.get(node.id) ?? 0,
    }))
    .sort((left, right) => {
      if (right.linkCount !== left.linkCount) {
        return right.linkCount - left.linkCount;
      }
      return left.node.title.localeCompare(right.node.title);
    })
    .slice(0, limit);
};

export const shouldBootToFocus = (options: {
  pinCount: number;
  continueNote: Note | null;
}): boolean => {
  return options.pinCount > 0 || options.continueNote !== null;
};
