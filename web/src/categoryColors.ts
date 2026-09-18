export const CATEGORY_COLORS: Record<string, string> = {
  sistem: "#b9bcc4",
  lob: "#8d97e6",
  "korteks-alani": "#5b8def",
  cekirdek: "#e6595b",
  yapi: "#f0b429",
  "beyaz-cevher": "#e5e5ea",
  bosluk: "#4fd1c5",
  grup: "#9aa0a8",
  "kraniyal-sinir": "#c77dd6",
};

export const CATEGORY_LABELS: Record<string, string> = {
  sistem: "Sistem",
  lob: "Lob",
  "korteks-alani": "Korteks Alanı",
  cekirdek: "Çekirdek",
  yapi: "Yapı",
  "beyaz-cevher": "Beyaz Cevher",
  bosluk: "Boşluk",
  grup: "Grup",
  "kraniyal-sinir": "Kraniyal Sinir",
};

export function colorFor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#c9a98c";
}
