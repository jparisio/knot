export interface Strategy {
  id: string;
  name: string;
  description?: string;
  rules: Rule[];
  createdAt: string;
}

export interface Rule {
  indicator: string;
  condition: ">" | "<" | "=";
  value: number;
}
