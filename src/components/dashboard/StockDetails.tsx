"use client";

import React from "react";

interface StockDetailsProps {
  name: string;
  price: number;
  previousClose: number;
  dayRange: string;
  yearRange: string;
  marketCap: string;
  volume: number;
  pveRatio: number;
  exchange: string;
}

const StockDetails: React.FC<StockDetailsProps> = ({
  name,
  price,
  previousClose,
  dayRange,
  yearRange,
  marketCap,
  volume,
  pveRatio,
  exchange,
}) => {
  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-full md:max-w-sm">
      <h2 className="text-lg font-semibold text-white mb-4">{name}</h2>
      <div className="text-sm text-gray-400 space-y-2">
        <p>
          <span className="text-gray-300">Price: </span>${price.toFixed(2)}
        </p>
        <p>
          <span className="text-gray-300">Previous Close: </span>$
          {previousClose.toFixed(2)}
        </p>
        <p>
          <span className="text-gray-300">Day Range: </span>
          {dayRange}
        </p>
        <p>
          <span className="text-gray-300">52 Week Range: </span>
          {yearRange}
        </p>
        <p>
          <span className="text-gray-300">Market Cap: </span>
          {marketCap}
        </p>
        <p>
          <span className="text-gray-300">Volume: </span>
          {volume.toLocaleString()}
        </p>
        <p>
          <span className="text-gray-300">P/E Ratio: </span>
          {pveRatio.toFixed(2)}
        </p>
        <p>
          <span className="text-gray-300">Exchange: </span>
          {exchange}
        </p>
      </div>
    </div>
  );
};

export default StockDetails;
