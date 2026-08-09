import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { GraphNode } from "@shared/types";
import { extractOpenWikiQuery } from "@shared/wiki-link";
import { cn } from "@/lib/utils";

export type WikiSuggestionChoice = {
  title: string;
  from: number;
  to: number;
};

type WikiSuggestionMenuProps = {
  editor: Editor | null;
  profileId: string;
  onSelect: (choice: WikiSuggestionChoice) => void;
};

type MenuState = {
  query: string;
  from: number;
  to: number;
  left: number;
  top: number;
  results: GraphNode[];
  selectedIndex: number;
};

export const WikiSuggestionMenu = ({
  editor,
  profileId,
  onSelect,
}: WikiSuggestionMenuProps): React.JSX.Element | null => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<MenuState | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    menuRef.current = menu;
  }, [menu]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    let cancelled = false;
    let requestId = 0;

    const refresh = (): void => {
      const { state, view } = editor;
      const { from } = state.selection;
      const $from = state.selection.$from;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\n");
      const open = extractOpenWikiQuery(textBefore);

      if (!open) {
        setMenu(null);
        return;
      }

      const absoluteFrom = from - (textBefore.length - open.fromOffset);
      const coords = view.coordsAtPos(from);
      const currentRequest = ++requestId;

      void window.mentide.nodes
        .search({ profileId, query: open.query, limit: 8 })
        .then((results) => {
          if (cancelled || currentRequest !== requestId) {
            return;
          }
          setMenu((current) => ({
            query: open.query,
            from: absoluteFrom,
            to: from,
            left: coords.left,
            top: coords.bottom + 6,
            results,
            selectedIndex: current?.query === open.query ? current.selectedIndex : 0,
          }));
        })
        .catch(() => {
          if (!cancelled && currentRequest === requestId) {
            setMenu(null);
          }
        });
    };

    const optionCountFor = (current: MenuState): number => {
      const createOption =
        current.query.trim().length > 0 &&
        !current.results.some(
          (node) =>
            node.title.toLowerCase() === current.query.trim().toLowerCase()
        );
      return current.results.length + (createOption ? 1 : 0);
    };

    const resolveTitle = (current: MenuState): string | null => {
      if (current.selectedIndex < current.results.length) {
        return current.results[current.selectedIndex]?.title ?? null;
      }
      const trimmed = current.query.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const current = menuRef.current;
      if (!current) {
        return;
      }

      const optionCount = optionCountFor(current);
      if (optionCount === 0 && event.key !== "Escape") {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setMenu({
          ...current,
          selectedIndex: (current.selectedIndex + 1) % Math.max(optionCount, 1),
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setMenu({
          ...current,
          selectedIndex:
            (current.selectedIndex - 1 + Math.max(optionCount, 1)) %
            Math.max(optionCount, 1),
        });
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setMenu(null);
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        const title = resolveTitle(current);
        if (!title) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onSelectRef.current({
          title,
          from: current.from,
          to: current.to,
        });
        setMenu(null);
      }
    };

    editor.on("selectionUpdate", refresh);
    editor.on("update", refresh);
    editor.view.dom.addEventListener("keydown", onKeyDown, true);
    refresh();

    return () => {
      cancelled = true;
      editor.off("selectionUpdate", refresh);
      editor.off("update", refresh);
      editor.view.dom.removeEventListener("keydown", onKeyDown, true);
    };
  }, [editor, profileId]);

  if (!menu) {
    return null;
  }

  const trimmedQuery = menu.query.trim();
  const exactMatch = menu.results.some(
    (node) => node.title.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCreate = trimmedQuery.length > 0 && !exactMatch;
  const options: { key: string; label: string; title: string; hint: string }[] =
    [
      ...menu.results.map((node) => ({
        key: node.id,
        label: node.title,
        title: node.title,
        hint: node.noteId ? "note" : "node",
      })),
      ...(showCreate
        ? [
            {
              key: `create-${trimmedQuery}`,
              label: trimmedQuery,
              title: trimmedQuery,
              hint: "create",
            },
          ]
        : []),
    ];

  if (options.length === 0) {
    return (
      <div
        className="wiki-suggest fixed z-50 min-w-56 rounded-2xl border border-sand-300/70 bg-sand-50/95 px-3 py-2 text-sm text-ink-700/70 shadow-lg backdrop-blur"
        style={{ left: menu.left, top: menu.top }}
      >
        Keep typing to create a new item…
      </div>
    );
  }

  return (
    <div
      className="wiki-suggest fixed z-50 min-w-56 overflow-hidden rounded-2xl border border-sand-300/70 bg-sand-50/95 shadow-lg backdrop-blur"
      style={{ left: menu.left, top: menu.top }}
      role="listbox"
      aria-label="Wiki link suggestions"
    >
      {options.map((option, index) => (
        <button
          key={option.key}
          type="button"
          role="option"
          aria-selected={index === menu.selectedIndex}
          className={cn(
            "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition",
            index === menu.selectedIndex
              ? "bg-amber-500/15 text-ink-900"
              : "text-ink-700 hover:bg-sand-200/60"
          )}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect({
              title: option.title,
              from: menu.from,
              to: menu.to,
            });
          }}
        >
          <span className="font-medium">{option.label}</span>
          <span className="text-xs uppercase tracking-wide text-ink-700/45">
            {option.hint}
          </span>
        </button>
      ))}
    </div>
  );
};
