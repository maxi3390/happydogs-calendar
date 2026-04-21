export interface FeatureFlag {
  id: number;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updated_at: string;
}

/** Convenience map keyed by `FeatureFlag.key` → `enabled`. */
export type FeatureFlagsMap = Record<string, boolean>;
