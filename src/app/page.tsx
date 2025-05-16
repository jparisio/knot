import PortfolioChart from "@/components/charts/PortfolioChart";
import StartButton from "@/components/ui/StartButton";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <h1 className="text-4xl font-bold mb-6 text-center">Welcome to Knot</h1>
      <p className="text-gray-400 mb-8 text-center">
        Your quantitative investment dashboard.
      </p>

      <div className="w-full bg-gray-900 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">
          Sample Portfolio Growth
        </h2>
        <PortfolioChart />
      </div>
      <div>
        <StartButton />
      </div>
    </main>
  );
}
