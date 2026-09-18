import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Region } from "./types";
import { colorFor } from "./categoryColors";

interface BrainModelProps {
  regionsById: Map<string, Region>;
  leafIds: Set<string>;
  hoveredId: string | null;
  selectedId: string | null;
  isolate: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

interface MeshEntry {
  name: string;
  regionId: string;
  geometry: THREE.BufferGeometry;
}

// Blender may split a joined object into multiple glTF primitives when the
// source parts carried different original materials; Three.js then names
// them "id", "id_1", "id_2"... Strip that suffix so every primitive that
// belongs to one region is treated as a single interactive unit.
export function toRegionId(meshName: string): string {
  return meshName.replace(/_\d+$/, "");
}

export function BrainModel({
  regionsById,
  leafIds,
  hoveredId,
  selectedId,
  isolate,
  onHover,
  onSelect,
}: BrainModelProps) {
  const { nodes } = useGLTF("/models/beyin-bolgeleri.glb") as unknown as {
    nodes: Record<string, THREE.Object3D>;
  };

  const meshEntries: MeshEntry[] = useMemo(() => {
    const entries: MeshEntry[] = [];
    for (const [name, obj] of Object.entries(nodes)) {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        entries.push({ name, regionId: toRegionId(name), geometry: mesh.geometry });
      }
    }
    return entries;
  }, [nodes]);

  const center = useMemo(() => {
    const box = new THREE.Box3();
    // frame on the core brain only; long cranial nerves trailing into the
    // neck/body, and the ventricular system (which can dip further down than
    // the visible brain surface), would otherwise pull the center away from
    // the brain itself
    const EXCLUDE_IDS = new Set(["kraniyal-sinirler", "ventrikuler-sistem"]);
    const EXCLUDE_CATEGORIES = new Set(["kraniyal-sinir", "bosluk"]);
    const coreEntries = meshEntries.filter((e) => {
      if (EXCLUDE_IDS.has(e.regionId)) return false;
      const category = regionsById.get(e.regionId)?.category;
      return !category || !EXCLUDE_CATEGORIES.has(category);
    });
    const source = coreEntries.length > 0 ? coreEntries : meshEntries;
    for (const entry of source) {
      entry.geometry.computeBoundingBox();
      if (entry.geometry.boundingBox) box.union(entry.geometry.boundingBox);
    }
    const c = new THREE.Vector3();
    box.getCenter(c);
    return c;
  }, [meshEntries, regionsById]);

  return (
    <group position={[-center.x, -center.y, -center.z]}>
      {meshEntries.map((entry) => (
        <RegionMesh
          key={entry.name}
          regionId={entry.regionId}
          geometry={entry.geometry}
          region={regionsById.get(entry.regionId)}
          isLeaf={leafIds.has(entry.regionId)}
          isHovered={hoveredId === entry.regionId}
          isSelected={selectedId === entry.regionId}
          nothingSelected={selectedId === null}
          isolate={isolate}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

interface RegionMeshProps {
  regionId: string;
  geometry: THREE.BufferGeometry;
  region: Region | undefined;
  isLeaf: boolean;
  isHovered: boolean;
  isSelected: boolean;
  nothingSelected: boolean;
  isolate: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

function RegionMesh({
  regionId,
  geometry,
  region,
  isLeaf,
  isHovered,
  isSelected,
  nothingSelected,
  isolate,
  onHover,
  onSelect,
}: RegionMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseColor = colorFor(region?.category ?? "", regionId);

  // Every "whole category" node (Serebrum, Frontal Lob, ...) now carries its
  // own merged mesh so it can be selected as a single unit, but that mesh
  // occupies exactly the same space as its children's meshes. Showing both
  // at once would z-fight and look eroded/patchy, so by default (nothing
  // selected) only leaf regions are shown; a parent's merged shape only
  // appears once the user actually selects it.
  let opacity: number;
  if (nothingSelected) {
    opacity = isLeaf ? 1 : 0;
  } else if (isSelected) {
    opacity = 1;
  } else {
    opacity = isolate ? 0.06 : 1;
  }

  const color = isSelected ? "#ffb020" : baseColor;
  const emissive = isSelected ? "#ffb020" : isHovered ? baseColor : "#000000";
  const emissiveIntensity = isSelected ? 0.5 : isHovered ? 0.35 : 0;
  const visible = opacity > 0.001;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      visible={visible}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(regionId);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isSelected ? null : regionId);
      }}
    >
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.55}
        metalness={0.05}
        transparent
        opacity={opacity}
        depthWrite={opacity > 0.5}
      />
    </mesh>
  );
}

useGLTF.preload("/models/beyin-bolgeleri.glb");
