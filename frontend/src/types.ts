export type VisionModel = { id: string; name: string };
export type StatusResponse = {
  configured: boolean;
  default_model: string;
  models: VisionModel[];
  privacy_notice: string;
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
  cautions: string[];
  follow_up_question: string;
  location_helpful: boolean;
  collection_search_term: string;
};
export type VisionResponse = {
  model_id: string;
  analysis: ItemAnalysis;
  local_facilities_verified: false;
};
