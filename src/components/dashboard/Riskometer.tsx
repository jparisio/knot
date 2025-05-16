export default function Riskometer() {
  return (
    <div className="bg-gray-900 p-6 rounded-xl text-white">
      <h2 className="text-lg font-semibold mb-2">Scheme Riskometer</h2>
      <p className="text-sm text-gray-400 mb-4">
        Moderate to Moderately Aggressive
      </p>
      <div className="w-full h-4 bg-gray-700 rounded-full">
        <div className="h-full bg-yellow-400 w-1/2 rounded-full" />
      </div>
    </div>
  );
}
