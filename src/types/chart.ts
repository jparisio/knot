export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface PortfolioChartData {
  labels: string[];
  data: number[];
}
