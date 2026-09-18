import type { Region } from "./types";
import { CATEGORY_LABELS, colorFor } from "./categoryColors";

interface InfoPanelProps {
  region: Region | null;
  regionsById: Map<string, Region>;
  hasMesh: boolean;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

function breadcrumb(region: Region, regionsById: Map<string, Region>): Region[] {
  const chain: Region[] = [];
  let current: Region | undefined = region;
  while (current) {
    chain.unshift(current);
    current = current.parent_id ? regionsById.get(current.parent_id) : undefined;
  }
  return chain;
}

export function InfoPanel({ region, regionsById, hasMesh, onSelect, onClose }: InfoPanelProps) {
  if (!region) {
    return (
      <aside className="info-panel info-panel--empty">
        <p>Bir bölgeyi seçmek için 3D modelde üzerine tıklayın ya da sol taraftaki listeden arayın.</p>
      </aside>
    );
  }

  const crumbs = breadcrumb(region, regionsById);
  const children = Array.from(regionsById.values()).filter((r) => r.parent_id === region.id);

  return (
    <aside className="info-panel">
      <button className="info-panel__close" onClick={onClose} aria-label="Kapat">
        ✕
      </button>

      <nav className="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.id}>
            {i > 0 && <span className="breadcrumb__sep">›</span>}
            <button className="breadcrumb__item" onClick={() => onSelect(c.id)}>
              {c.name_tr}
            </button>
          </span>
        ))}
      </nav>

      <div className="info-panel__badge" style={{ background: colorFor(region.category) }}>
        {CATEGORY_LABELS[region.category] ?? region.category}
      </div>

      <h2>{region.name_tr}</h2>
      <p className="info-panel__latin">{region.name_en}</p>

      {!hasMesh && (
        <p className="info-panel__notice">
          Bu bölge için henüz 3D modelde ayrı bir yapı yok (grup etiketi ya da yakında eklenecek).
        </p>
      )}

      {region.description_short && (
        <p className="info-panel__short">{region.description_short}</p>
      )}

      {region.description_long && (
        <p className="info-panel__long">{region.description_long}</p>
      )}

      {children.length > 0 && (
        <div className="info-panel__children">
          <h3>Alt bölgeler</h3>
          <ul>
            {children.map((c) => (
              <li key={c.id}>
                <button onClick={() => onSelect(c.id)}>{c.name_tr}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
