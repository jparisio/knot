import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  const token = process.env.FINNHUB_API_KEY;
  if (!token) return NextResponse.json([], { status: 500 });

  const res = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${token}`,
    { next: { revalidate: 60 } },
  );

  if (!res.ok) return NextResponse.json([]);

  const { result } = await res.json() as {
    result: { symbol: string; description: string; type: string }[];
  };

  // Return top 6, filtering to Equity/ETP types to cut noise
  const filtered = (result ?? [])
    .filter((r) => r.type === 'Common Stock' || r.type === 'ETP' || r.type === '')
    .slice(0, 6)
    .map((r) => ({ symbol: r.symbol, description: r.description }));

  return NextResponse.json(filtered);
}
