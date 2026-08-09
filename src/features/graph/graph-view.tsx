import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import type { GraphData } from "@shared/types";
import { Button } from "@/components/ui/button";
import { buildFlowGraph } from "@/features/graph/build-flow-graph";
import { OvalNode } from "@/features/graph/oval-node";

type GraphViewProps = {
  profileId: string;
  onOpenNote: (noteId: string) => void;
  onOpenItem: (title: string) => void;
  onPromoteNode: (nodeId: string) => Promise<void>;
};

const nodeTypes = {
  oval: OvalNode,
};

export const GraphView = ({
  profileId,
  onOpenNote,
  onOpenItem,
  onPromoteNode,
}: GraphViewProps): React.JSX.Element => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void window.mentide.graph.get(profileId).then(setData);
  }, [profileId]);

  const flowGraph = useMemo(() => buildFlowGraph({ data }), [data]);

  const selected = data.nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-sand-300/50 px-6 py-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-ink-900">
          Graph
        </h2>
        {selected ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-700">{selected.title}</span>
            <Button
              size="sm"
              variant="soft"
              onClick={() => onOpenItem(selected.title)}
            >
              Mentions
            </Button>
            {selected.noteId ? (
              <Button
                size="sm"
                onClick={() => {
                  if (selected.noteId) {
                    onOpenNote(selected.noteId);
                  }
                }}
              >
                Open note
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => void onPromoteNode(selected.id)}
              >
                Promote to note
              </Button>
            )}
          </div>
        ) : null}
      </header>
      <div className="flex-1">
        {flowGraph.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-ink-700/70">
            Create links with [[idea]] in a note to grow this graph.
          </div>
        ) : (
          <ReactFlow
            nodes={flowGraph.nodes}
            edges={flowGraph.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.35, maxZoom: 0.72, minZoom: 0.2 }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.55 }}
            minZoom={0.15}
            maxZoom={1.4}
            nodesDraggable
            onNodeClick={(_event, node) => {
              if (data.nodes.some((n) => n.id === node.id)) {
                setSelectedId(node.id);
              }
            }}
            onNodeDoubleClick={(_event, node) => {
              const graphNode = data.nodes.find((n) => n.id === node.id);
              if (graphNode) {
                onOpenItem(graphNode.title);
              }
            }}
          >
            <Background color="#e2c9b3" gap={28} size={1} />
            <MiniMap
              pannable
              zoomable
              style={{ width: 140, height: 90 }}
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};
