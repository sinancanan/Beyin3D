import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Region } from "./types";
import { colorFor } from "./categoryColors";

interface BrainModelProps {
  regionsById: Map<string, Region>;
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
    // neck/body would otherwise pull the center far away from the brain itself
    const coreEntries = meshEntries.filter(
      (e) => regionsById.get(e.regionId)?.category !== "kraniyal-sinir"
    );
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
          isHovered={hoveredId === entry.regionId}
          isSelected={selectedId === entry.regionId}
          dim={isolate && selectedId !== null && selectedId !== entry.regionId}
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
  isHovered: boolean;
  isSelected: boolean;
  dim: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

function RegionMesh({
  regionId,
  geometry,
  region,
  isHovered,
  isSelected,
  dim,
  onHover,
  onSelect,
}: RegionMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseColor = colorFor(region?.category ?? "");

  const color = isSelected ? "#ffb020" : baseColor;
  const emissive = isSelected ? "#ffb020" : isHovered ? baseColor : "#000000";
  const emissiveIntensity = isSelected ? 0.5 : isHovered ? 0.35 : 0;
  const opacity = dim ? 0.06 : 1;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
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
        depthWrite={!dim}
      />
    </mesh>
  );
}

useGLTF.preload("/models/beyin-bolgeleri.glb");
