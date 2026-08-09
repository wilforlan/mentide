import { describe, expect, it } from "vitest";
import { emptyDocJson, type GraphData, type Note } from "@shared/types";
import {
  isEmptyNoteContent,
  pickContinueNote,
  rankHubsByLinkCount,
  shouldBootToFocus,
} from "@/features/focus/focus-model";

const getMockNote = (overrides?: Partial<Note>): Note => ({
  id: "11111111-1111-4111-8111-111111111111",
  profileId: "22222222-2222-4222-8222-222222222222",
  kind: "freeform",
  title: "Note",
  date: null,
  contentJson: emptyDocJson,
  createdAt: "2026-07-30T10:00:00.000Z",
  updatedAt: "2026-07-30T10:00:00.000Z",
  deletedAt: null,
  ...overrides,
});

const withText = (text: string): string =>
  JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  });

describe("Focus model", () => {
  it("treats emptyDocJson and whitespace-only docs as empty", () => {
    expect(isEmptyNoteContent(emptyDocJson)).toBe(true);
    expect(
      isEmptyNoteContent(
        JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "   " }],
            },
          ],
        })
      )
    ).toBe(true);
    expect(isEmptyNoteContent(withText("hello"))).toBe(false);
  });

  it("picks the most recently updated non-empty note as continue", () => {
    const older = getMockNote({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Older",
      contentJson: withText("older thought"),
      updatedAt: "2026-07-29T10:00:00.000Z",
    });
    const emptyNewer = getMockNote({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "Empty newer",
      contentJson: emptyDocJson,
      updatedAt: "2026-07-31T10:00:00.000Z",
    });
    const continueNote = getMockNote({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      title: "Continue",
      contentJson: withText("keep going"),
      updatedAt: "2026-07-30T12:00:00.000Z",
    });

    expect(pickContinueNote([emptyNewer, older, continueNote])).toEqual(
      continueNote
    );
  });

  it("ranks hubs by link appearance count", () => {
    const data: GraphData = {
      nodes: [
        {
          id: "n1",
          profileId: "p1",
          title: "Hub",
          noteId: null,
          createdAt: "2026-07-30T10:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "n2",
          profileId: "p1",
          title: "Leaf",
          noteId: null,
          createdAt: "2026-07-30T10:00:00.000Z",
          deletedAt: null,
        },
      ],
      links: [
        {
          id: "l1",
          profileId: "p1",
          sourceNoteId: "s1",
          targetNodeId: "n1",
          label: "Hub",
          createdAt: "2026-07-30T10:00:00.000Z",
        },
        {
          id: "l2",
          profileId: "p1",
          sourceNoteId: "s2",
          targetNodeId: "n1",
          label: "Hub",
          createdAt: "2026-07-30T10:00:00.000Z",
        },
        {
          id: "l3",
          profileId: "p1",
          sourceNoteId: "s1",
          targetNodeId: "n2",
          label: "Leaf",
          createdAt: "2026-07-30T10:00:00.000Z",
        },
      ],
    };

    expect(rankHubsByLinkCount(data, 1).map((hub) => hub.node.title)).toEqual([
      "Hub",
    ]);
  });

  it("boots to Focus when pins or a continue note exist", () => {
    expect(shouldBootToFocus({ pinCount: 0, continueNote: null })).toBe(false);
    expect(
      shouldBootToFocus({
        pinCount: 1,
        continueNote: null,
      })
    ).toBe(true);
    expect(
      shouldBootToFocus({
        pinCount: 0,
        continueNote: getMockNote({ contentJson: withText("x") }),
      })
    ).toBe(true);
  });
});
