export default function InvestmentReturns() {
  const returns = [
    { label: "1Y", value: "+23.45%" },
    { label: "3Y", value: "+48.51%" },
    { label: "5Y", value: "+95.82%" },
    { label: "10Y", value: "+162.90%" },
    { label: "Max", value: "+327.13%" },
  ];

  return (
    <div className="bg-gray-900 p-6 rounded-xl text-white">
      <h2 className="text-lg font-semibold mb-4">Investment Return</h2>
      <ul className="space-y-2">
        {returns.map((r) => (
          <li key={r.label} className="flex justify-between">
            <span className="text-gray-400">{r.label}</span>
            <span className="text-green-400">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
