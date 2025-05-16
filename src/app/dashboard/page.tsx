import OrdersSummary from "@/components/dashboard/OrdersSummary";
import WatchlistChart from "@/components/dashboard/WatchlistChart";
import StockDetails from "@/components/dashboard/StockDetails";
import FundOverview from "@/components/dashboard/FundOverview";
import InvestmentReturns from "@/components/dashboard/InvestmentReturns";
import Riskometer from "@/components/dashboard/Riskometer";
import { fetchStockQuote } from "@/lib/api/alphaVantage";

export default async function Dashboard() {
  // Fetch stock data for S&P 500
  const { data: stockData, error } = await fetchStockQuote("SPY");
  if (error) {
    console.error("Error fetching stock data:", error);
    return <div>Error fetching stock data</div>;
  } else {
    // const dates = Object.keys(stockData);
    // const newestDate = dates[0];
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-black">Dashboard</h1>

      {/* Top Summary Cards */}
      <OrdersSummary />

      {/* Chart + Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <WatchlistChart />
          <FundOverview />
        </div>
        <div className="space-y-6">
          <StockDetails
            name="S&P 500"
            price={4500.48}
            previousClose={4500.5}
            dayRange="4388 - 4515"
            yearRange="4200 - 5300"
            marketCap="$90.3T USD"
            volume={3825862}
            pveRatio={51.05}
            exchange="INDEX"
          />

          <InvestmentReturns />
          <Riskometer />
        </div>
      </div>
    </main>
  );
}
