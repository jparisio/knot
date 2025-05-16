import { ApiResponse } from "@/types";

const BASE_URL = "https://www.alphavantage.co/query";

export async function fetchStockQuote(
  symbol: string,
  functionName: string = "TIME_SERIES_DAILY"
): Promise<ApiResponse<any>> {
  try {
    const res = await fetch(
      `${BASE_URL}?function=${functionName}&symbol=${symbol}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await res.json();

    return {
      data: data["Time Series (Daily)"],
    };
  } catch (error) {
    return {
      data: null,
      error:
        (error as Error).message ||
        "An error occurred while fetching the stock quote.",
    };
  }
}
