export type VisionModel = { id: string; name: string };
export type StatusResponse = {
  configured: boolean;
  default_model: string;
  models: VisionModel[];
  privacy_notice: string;
};
export type ReuseProject = {
  title: string;
  outcome: string;
  materials_needed: string[];
  steps: string[];
  difficulty: "Easy" | "Moderate" | "Advanced";
  minutes_estimate: number;
  safety_note: string;
};

export type ItemAnalysis = {
  item_name: string;
  visual_description: string;
  material_guess: string;
  identification: "likely" | "uncertain" | "multiple_items";
  route: "reuse_first" | "check_recycling" | "check_compost" | "special_dropoff" | "general_trash_check" | "needs_identification";
  route_title: string;
  disposal_steps: string[];
  reuse_ideas: string[];
  reuse_projects?: ReuseProject[];
  cautions: string[];
  follow_up_question: string;
  location_helpful: boolean;
  collection_search_term: string;
};
export type VisionResponse = {
  model_id: string;
  analysis: ItemAnalysis;
  local_facilities_verified: false;
  scan_id: number | null;
};

export type SessionUser = { id: number; name: string; email: string; role: "user" | "admin" };
export type SavedScan = {
  id: number; item_name: string; model_id: string; analysis: ItemAnalysis;
  zip_code: string | null; feedback: "yes" | "no" | null; correction: string; created_at: string;
};
export type AdminOverview = { users: number; scans: number; yes: number; no: number };
export type AdminUser = SessionUser & { created_at: string; scan_count: number };
export type AdminFeedback = {
  id: number; item_name: string; feedback: "yes" | "no"; correction: string;
  created_at: string; user_id: number; user_name: string; user_email: string;
};
export type Facility = {
  id: string; name: string; address: string; latitude: number; longitude: number;
  distance_miles: number; tagged_materials: string[];
  kind: "center" | "drop_off"; phone: string;
  verified_acceptance: false; note: string;
};
export type FacilitySearchResponse = {
  zip_code: string; location_label: string;
  center: { latitude: number; longitude: number };
  facilities: Facility[];
  provider: string; acceptance_verified: false; notice: string;
  listing_status: "ok" | "no_results" | "unavailable";
  radius_miles: number;
};
