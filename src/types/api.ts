export interface ApiResponse<T> {
  data: T;
  error?: string;
}

import { Rule } from "./strategy";

export interface CreateStrategyRequest {
  name: string;
  rules: Rule[];
}
