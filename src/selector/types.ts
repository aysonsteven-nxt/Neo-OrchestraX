import type { PackMetadata } from "../packs/types.js";
import type { ProjectProfile } from "../analyzer/types.js";

export interface PackRecommendation {
  pack: PackMetadata;
  score: number;
  matchedCapabilities: string[];
  evidence: string[];
}

export interface SelectionResult {
  profile: ProjectProfile;
  recommendations: PackRecommendation[];
}
