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
import { riskForDependency, SEVERITY_COLORS } from "@/lib/risk";

const MAX_NODES = 80;

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

function layoutNodes(
  deps: Dependency[],
  findings: Finding[],
): { nodes: Node[]; edges: Edge[] } {
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
      const color = risk ? SEVERITY_COLORS[risk] : SEVERITY_COLORS.none;
      nodes.push({
        id: dep.id,
        position: { x: i * 200, y: depth * 110 },
        data: {
          label: `${dep.name}${dep.version ? `@${dep.version}` : ""}`,
          riskColor: color,
        },
        style: {
          background: "#0f1c2e",
          color: "#e8eef7",
          border: `2px solid ${color}`,
          borderRadius: 8,
          fontSize: 11,
          padding: 8,
          width: 170,
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
      style: { stroke: "rgba(148,163,184,0.45)" },
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
    return <p className="text-sm text-slate-400">No dependencies to graph.</p>;
  }

  if (!mounted) {
    return (
      <p className="flex h-[420px] items-center justify-center rounded-md border border-white/10 text-sm text-slate-400">
        Loading graph…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Border color = highest finding severity on that package
        {subset.length < dependencies.length
          ? ` · showing ${subset.length} of ${dependencies.length} nodes`
          : null}
        . Drag / scroll to explore.
      </p>
      <div className="h-[420px] overflow-hidden rounded-md border border-white/10 bg-ink/40">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(148,163,184,0.25)" gap={18} />
          <Controls />
          <MiniMap
            nodeColor={(n) =>
              String((n.data as { riskColor?: string })?.riskColor ?? SEVERITY_COLORS.none)
            }
            maskColor="rgba(7,17,31,0.7)"
            style={{ background: "#0f1c2e" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
