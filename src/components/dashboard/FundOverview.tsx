// src/components/dashboard/FundOverview.tsx
export default function FundOverview({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={` bg-gray-900 p-6 rounded-xl text-white ${className}`}>
      <h2 className="text-lg font-semibold mb-2">Digital Fund Direct-Growth</h2>
      <p className="text-sm text-gray-400 mb-2">Equity • Technology</p>
      <div className="text-sm">
        Min. Investment: <strong>$100</strong>
      </div>
      <div className="mt-2 text-sm text-green-400">
        Category Returns: +29.60%
      </div>
      <div className="text-sm text-green-500">3Y Returns: +37.74%</div>
    </div>
  );
}
