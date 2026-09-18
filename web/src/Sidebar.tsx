import { useEffect, useMemo, useState } from "react";
import type { Region } from "./types";

interface SidebarProps {
  regions: Region[];
  regionsById: Map<string, Region>;
  meshNames: Set<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function ancestorsOf(id: string, regionsById: Map<string, Region>): string[] {
  const chain: string[] = [];
  let current = regionsById.get(id);
  while (current?.parent_id) {
    chain.push(current.parent_id);
    current = regionsById.get(current.parent_id);
  }
  return chain;
}

export function Sidebar({ regions, regionsById, meshNames, selectedId, onSelect }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Region[]>();
    for (const r of regions) {
      const list = map.get(r.parent_id) ?? [];
      list.push(r);
      map.set(r.parent_id, list);
    }
    return map;
  }, [regions]);

  // when a region gets selected (3D click, search, breadcrumb) reveal it in the tree
  useEffect(() => {
    if (!selectedId) return;
    const ancestors = ancestorsOf(selectedId, regionsById);
    if (ancestors.length === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ancestors) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedId, regionsById]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return null;
    return regions.filter(
      (r) =>
        r.name_tr.toLocaleLowerCase("tr").includes(q) ||
        r.name_en.toLocaleLowerCase("tr").includes(q)
    );
  }, [query, regions]);

  const topLevel = childrenByParent.get(null) ?? [];

  return (
    <aside className="sidebar">
      <h1 className="sidebar__title">Beyin3D</h1>
      <p className="sidebar__subtitle">Etkileşimli beyin atlası</p>

      <input
        className="sidebar__search"
        type="search"
        placeholder="Beyin bölgesi ara…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="sidebar__scroll">
        {searchResults ? (
          <ul className="sidebar__results">
            {searchResults.length === 0 && <li className="sidebar__empty">Sonuç yok.</li>}
            {searchResults.map((r) => (
              <RegionRow
                key={r.id}
                region={r}
                hasMesh={meshNames.has(r.id)}
                selected={selectedId === r.id}
                onSelect={onSelect}
              />
            ))}
          </ul>
        ) : (
          <TreeNode
            nodes={topLevel}
            childrenByParent={childrenByParent}
            meshNames={meshNames}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={toggle}
            onSelect={onSelect}
            depth={0}
          />
        )}
      </div>
    </aside>
  );
}

interface TreeNodeProps {
  nodes: Region[];
  childrenByParent: Map<string | null, Region[]>;
  meshNames: Set<string>;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string | null) => void;
  depth: number;
}

function TreeNode({
  nodes,
  childrenByParent,
  meshNames,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  depth,
}: TreeNodeProps) {
  return (
    <ul className="tree" style={{ paddingLeft: depth === 0 ? 0 : 14 }}>
      {nodes.map((r) => {
        const kids = childrenByParent.get(r.id) ?? [];
        const isOpen = expanded.has(r.id);
        return (
          <li key={r.id}>
            <div className="tree-row">
              {kids.length > 0 ? (
                <button
                  className={`tree-toggle${isOpen ? " tree-toggle--open" : ""}`}
                  onClick={() => onToggle(r.id)}
                  aria-label={isOpen ? "Daralt" : "Genişlet"}
                >
                  ▸
                </button>
              ) : (
                <span className="tree-toggle tree-toggle--spacer" />
              )}
              <RegionRow region={r} hasMesh={meshNames.has(r.id)} selected={selectedId === r.id} onSelect={onSelect} />
            </div>
            {kids.length > 0 && isOpen && (
              <TreeNode
                nodes={kids}
                childrenByParent={childrenByParent}
                meshNames={meshNames}
                selectedId={selectedId}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RegionRow({
  region,
  hasMesh,
  selected,
  onSelect,
}: {
  region: Region;
  hasMesh: boolean;
  selected: boolean;
  onSelect: (id: string | null) => void;
}) {
  return (
    <button
      className={`region-row${selected ? " region-row--selected" : ""}${!hasMesh ? " region-row--nomesh" : ""}`}
      onClick={() => onSelect(selected ? null : region.id)}
      title={hasMesh ? undefined : "3D modelde henüz ayrı bir yapı yok, ama bilgi metni mevcut"}
    >
      {region.name_tr}
      {!hasMesh && <span className="region-row__tag">metin</span>}
    </button>
  );
}
