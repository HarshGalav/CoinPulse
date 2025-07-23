// Data verification utilities to ensure accuracy and freshness

export interface DataQualityMetrics {
  totalCoins: number;
  freshDataCount: number;
  staleDataCount: number;
  averageAge: number;
  dataSource: string;
  lastUpdateTime: Date | null;
}

export function analyzeDataQuality(prices: any[]): DataQualityMetrics {
  const now = new Date();
  let totalAge = 0;
  let freshCount = 0;
  let staleCount = 0;

  prices.forEach((price) => {
    if (price.last_updated) {
      const age = now.getTime() - price.last_updated.getTime();
      totalAge += age;

      if (age < 10000) {
        // Fresh if less than 10 seconds old
        freshCount++;
      } else {
        staleCount++;
      }
    }
  });

  return {
    totalCoins: prices.length,
    freshDataCount: freshCount,
    staleDataCount: staleCount,
    averageAge: prices.length > 0 ? totalAge / prices.length / 1000 : 0, // in seconds
    dataSource: "Binance REST API",
    lastUpdateTime:
      prices.length > 0
        ? new Date(
            Math.max(...prices.map((p) => p.last_updated?.getTime() || 0))
          )
        : null,
  };
}

export function validatePriceData(price: any): boolean {
  // Basic validation checks
  if (!price || typeof price !== "object") return false;
  if (
    !price.current_price ||
    isNaN(price.current_price) ||
    price.current_price <= 0
  )
    return false;
  if (!price.symbol || typeof price.symbol !== "string") return false;
  if (!price.last_updated || !(price.last_updated instanceof Date))
    return false;

  // Check if data is reasonably fresh (less than 1 minute old)
  const now = new Date();
  const age = now.getTime() - price.last_updated.getTime();
  if (age > 60000) return false; // Stale if older than 1 minute

  return true;
}

export function comparePriceAccuracy(
  price1: number,
  price2: number
): {
  difference: number;
  percentageDiff: number;
  isSignificant: boolean;
} {
  const difference = Math.abs(price1 - price2);
  const percentageDiff = (difference / Math.min(price1, price2)) * 100;
  const isSignificant = percentageDiff > 0.1; // Consider >0.1% difference significant

  return {
    difference,
    percentageDiff,
    isSignificant,
  };
}

// Verify data against multiple sources (for testing)
export async function verifyDataAccuracy(
  symbol: string,
  currentPrice: number
): Promise<{
  isAccurate: boolean;
  sources: Array<{ name: string; price: number; timestamp: Date }>;
  recommendation: string;
}> {
  const sources = [];

  try {
    // Check against Binance directly
    const binanceResponse = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
    );
    if (binanceResponse.ok) {
      const binanceData = await binanceResponse.json();
      sources.push({
        name: "Binance Direct",
        price: parseFloat(binanceData.price),
        timestamp: new Date(),
      });
    }
  } catch (error) {
    console.warn("Failed to verify against Binance:", error);
  }

  // Analyze accuracy
  let isAccurate = true;
  let recommendation = "Data appears accurate";

  if (sources.length > 0) {
    const binancePrice = sources[0].price;
    const accuracy = comparePriceAccuracy(currentPrice, binancePrice);

    if (accuracy.isSignificant) {
      isAccurate = false;
      recommendation = `Price difference of ${accuracy.percentageDiff.toFixed(
        2
      )}% detected. Consider refreshing data.`;
    }
  }

  return {
    isAccurate,
    sources,
    recommendation,
  };
}
