export type ModelInfo = { id: string; name: string; available: boolean; note: string };
export type ModelCatalog = { default_model_id: string; models: ModelInfo[]; notice: string };
export type Guidance = { route: "special" | "local" | "compost" | "reuse" | "trash"; headline: string; instructions: string[]; reuse: string[]; finder: string | null; caution: string; source_url: string };
export type Prediction = { label: string; score: number };
export type Classification = {
  model_id: string; material: string; category: string; review_required: boolean;
  top_predictions: Prediction[]; guidance: Guidance; notice: string;
};
