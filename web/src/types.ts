export interface Region {
  id: string;
  name_tr: string;
  name_en: string;
  parent_id: string | null;
  category: string;
  description_short: string | null;
  description_long: string | null;
}

export interface RegionsFile {
  version: string;
  regions: Region[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  origin_form: string;
  origin_language: string;
  category: string;
  definition: string;
}

export interface GlossaryFile {
  version: string;
  categories: Record<string, string>;
  terms: GlossaryTerm[];
}
