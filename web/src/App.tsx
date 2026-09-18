import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import { BrainModel, toRegionId } from "./BrainModel";
import { Sidebar } from "./Sidebar";
import { InfoPanel } from "./InfoPanel";
import type { Region, RegionsFile } from "./types";
import type * as THREE from "three";
import "./App.css";

const KNOWN_MESH_NAMES = new Set<string>();

function App() {
  const [regions, setRegions] = useState<Region[] | null>(null);
  const [meshNames, setMeshNames] = useState<Set<string>>(KNOWN_MESH_NAMES);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isolate, setIsolate] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    fetch("/data/beyin-bolgeleri.json")
      .then((res) => res.json())
      .then((data: RegionsFile) => setRegions(data.regions));
  }, []);

  const regionsById = useMemo(() => {
    const map = new Map<string, Region>();
    if (regions) for (const r of regions) map.set(r.id, r);
    return map;
  }, [regions]);

  const hoveredRegion = hoveredId ? regionsById.get(hoveredId) ?? null : null;
  const selectedRegion = selectedId ? regionsById.get(selectedId) ?? null : null;

  if (!regions) {
    return (
      <div className="loading-screen">
        <p>Beyin atlası yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        regions={regions}
        regionsById={regionsById}
        meshNames={meshNames}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <main className="viewport">
        <div className="viewport__toolbar">
          <label className="toolbar__toggle">
            <input
              type="checkbox"
              checked={isolate}
              onChange={(e) => setIsolate(e.target.checked)}
            />
            Seçileni izole et
          </label>
          <label className="toolbar__toggle">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
            />
            Otomatik döndür
          </label>
          {selectedId && (
            <button className="toolbar__clear" onClick={() => setSelectedId(null)}>
              Seçimi temizle
            </button>
          )}
        </div>

        {hoveredRegion && !selectedRegion && (
          <div className="hover-tooltip">
            <strong>{hoveredRegion.name_tr}</strong>
            {hoveredRegion.description_short && <p>{hoveredRegion.description_short}</p>}
          </div>
        )}

        <Canvas camera={{ position: [0.4, 0.15, 0.4], fov: 40 }}>
          <color attach="background" args={["#f4f5f7"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[1, 1.2, 0.8]} intensity={1.4} />
          <directionalLight position={[-1, -0.5, -0.6]} intensity={0.5} />
          <Suspense
            fallback={
              <Html center>
                <div className="canvas-loading">Model yükleniyor…</div>
              </Html>
            }
          >
            <BrainModel
              regionsById={regionsById}
              hoveredId={hoveredId}
              selectedId={selectedId}
              isolate={isolate}
              onHover={setHoveredId}
              onSelect={setSelectedId}
            />
            <MeshNameReporter onNames={setMeshNames} />
          </Suspense>
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={1.2}
            enableDamping
            dampingFactor={0.08}
            minDistance={0.08}
            maxDistance={1.2}
          />
        </Canvas>
      </main>

      <InfoPanel
        region={selectedRegion}
        regionsById={regionsById}
        hasMesh={selectedId ? meshNames.has(selectedId) : false}
        onSelect={setSelectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function MeshNameReporter({ onNames }: { onNames: (names: Set<string>) => void }) {
  const { nodes } = useGLTF("/models/beyin-bolgeleri.glb") as unknown as {
    nodes: Record<string, THREE.Object3D>;
  };
  useEffect(() => {
    const names = new Set<string>();
    for (const [name, obj] of Object.entries(nodes)) {
      if ((obj as THREE.Mesh).isMesh) names.add(toRegionId(name));
    }
    onNames(names);
  }, [nodes, onNames]);
  return null;
}

export default App;
