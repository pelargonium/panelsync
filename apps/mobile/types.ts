export interface Universe {
  id: string;
  name: string;
  seriesCount: number;
  lastEdited: string;
}

export interface Character {
  id: string;
  name: string;
  role?: string;
  description?: string;
  appearance?: string;
  backstory?: string;
  notes?: string;
}

export type RootStackParamList = {
  Universes: undefined;
  Universe: { universe: Universe };
};
