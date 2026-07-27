"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Dependency, Finding } from "@/lib/api";
import { riskForDependency } from "@/lib/risk";

const MAX_NODES = 80;

const QUAY_COLORS: Record<string, string> = {
  critical: "#F87171",
  high: "#FB923C",
  medium: "#F0A93F",
  low: "#7C8CA6",
  info: "#7C8CA6",
  none: "#34D399",
};

type Props = {
  dependencies: Dependency[];
  findings: Finding[];
};

function pickGraphDeps(deps: Dependency[], findings: Finding[]): Dependency[] {
  if (deps.length <= MAX_NODES) return deps;
  const keep = new Set<string>();
  for (const d of deps) {
    if (d.is_direct || d.depth <= 1) keep.add(d.id);
  }
  for (const f of findings) {
    if (f.dependency_id) keep.add(f.dependency_id);
  }
  const byId = new Map(deps.map((d) => [d.id, d]));
  for (const id of [...keep]) {
    let cur = byId.get(id);
    while (cur?.parent_dependency_id) {
      keep.add(cur.parent_dependency_id);
      cur = byId.get(cur.parent_dependency_id);
    }
  }
  const selected = deps.filter((d) => keep.has(d.id));
  if (selected.length <= MAX_NODES) return selected;
  return selected
    .sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name))
    .slice(0, MAX_NODES);
}

function layoutNodes(deps: Dependency[], findings: Finding[]): { nodes: Node[]; edges: Edge[] } {
  const byDepth = new Map<number, Dependency[]>();
  for (const d of deps) {
    const list = byDepth.get(d.depth) ?? [];
    list.push(d);
    byDepth.set(d.depth, list);
  }

  const nodes: Node[] = [];
  for (const [depth, list] of byDepth) {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((dep, i) => {
      const risk = riskForDependency(dep.id, findings);
      const color = risk ? QUAY_COLORS[risk] : QUAY_COLORS.none;
      nodes.push({
        id: dep.id,
        position: { x: i * 190, y: depth * 100 },
        data: {
          label: `${dep.name}${dep.version ? `@${dep.version}` : ""}`,
          riskColor: color,
        },
        style: {
          background: "#0B1420",
          color: "#E8E2D0",
          border: `2px solid ${color}`,
          borderRadius: 2,
          fontSize: 10,
          fontFamily: "var(--font-plex-mono)",
          padding: 8,
          width: 160,
        },
      });
    });
  }

  const idSet = new Set(deps.map((d) => d.id));
  const edges: Edge[] = deps
    .filter((d) => d.parent_dependency_id && idSet.has(d.parent_dependency_id))
    .map((d) => ({
      id: `${d.parent_dependency_id}->${d.id}`,
      source: d.parent_dependency_id as string,
      target: d.id,
      style: { stroke: "rgba(45,212,191,0.35)" },
    }));

  return { nodes, edges };
}

export function DependencyGraph({ dependencies, findings }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const subset = useMemo(
    () => pickGraphDeps(dependencies, findings),
    [dependencies, findings],
  );
  const { nodes, edges } = useMemo(
    () => layoutNodes(subset, findings),
    [subset, findings],
  );

  if (dependencies.length === 0) {
    return <p className="font-mono text-sm text-stamp-slate">No dependencies to graph.</p>;
  }
  if (!mounted) {
    return (
      <p className="flex h-[380px] items-center justify-center border border-manifest-200/10 font-mono text-sm text-stamp-slate">
        Loading graph…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] text-stamp-slate">
        Node border = highest stamp severity
        {subset.length < dependencies.length
          ? ` · ${subset.length}/${dependencies.length} nodes`
          : null}
      </p>
      <div className="h-[380px] overflow-hidden border border-manifest-200/15 bg-ink-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(45,212,191,0.12)" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(n) =>
              String((n.data as { riskColor?: string })?.riskColor ?? QUAY_COLORS.none)
            }
            maskColor="rgba(11,20,32,0.75)"
            style={{ background: "#0B1420" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
