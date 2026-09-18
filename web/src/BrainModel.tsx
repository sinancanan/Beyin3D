import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Region } from "./types";
import { colorFor } from "./categoryColors";

interface BrainModelProps {
  regionsById: Map<string, Region>;
  defaultVisibleIds: Set<string>;
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
  defaultVisibleIds,
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
    // A bounding-box midpoint is misleading here: the brainstem/cerebellum
    // form a narrow protrusion well below the cerebrum, so the box's center
    // sits lower than where the visually dominant mass (the cortex) actually
    // is, pushing the whole model toward the top of the view. Average actual
    // vertex positions of the cortical surface instead - that tracks where
    // the brain visually "is" much better than any bounding box math.
    const cortexEntries = meshEntries.filter(
      (e) => regionsById.get(e.regionId)?.category === "korteks-alani"
    );
    const source = cortexEntries.length > 0 ? cortexEntries : meshEntries;

    const sum = new THREE.Vector3();
    let count = 0;
    const v = new THREE.Vector3();
    for (const entry of source) {
      const pos = entry.geometry.attributes.position;
      if (!pos) continue;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        sum.add(v);
        count++;
      }
    }
    if (count === 0) return new THREE.Vector3();
    return sum.divideScalar(count);
  }, [meshEntries, regionsById]);

  return (
    <group position={[-center.x, -center.y, -center.z]}>
      {meshEntries.map((entry) => (
        <RegionMesh
          key={entry.name}
          regionId={entry.regionId}
          geometry={entry.geometry}
          region={regionsById.get(entry.regionId)}
          hasOwnContent={defaultVisibleIds.has(entry.regionId)}
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
  hasOwnContent: boolean;
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
  hasOwnContent,
  isHovered,
  isSelected,
  nothingSelected,
  isolate,
  onHover,
  onSelect,
}: RegionMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseColor = colorFor(region?.category ?? "", regionId);

  // Some "whole category" nodes (Serebrum, Frontal Lob, ...) only exist
  // because we merged their children's geometry for them - that merged shape
  // occupies exactly the same space as the children and would z-fight/look
  // eroded if both rendered at once. Regions with their own directly
  // assigned geometry (hasOwnContent) always show by default; pure
  // auto-merged group shells only appear once the user selects them.
  let opacity: number;
  if (nothingSelected) {
    opacity = hasOwnContent ? 1 : 0;
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
