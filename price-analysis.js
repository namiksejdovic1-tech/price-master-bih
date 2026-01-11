function analyze(products) {
  const results = [];

  for (const product of products) {
    const { name, my_price, competitor_prices } = product;

    // Filter out zero prices
    const validPrices = competitor_prices.filter(p => p > 0);

    if (validPrices.length === 0) {
      // No competitor prices available
      results.push({
        name,
        my_price,
        competitor_average: 0,
        suggestion: "🟡",
        suggested_price: my_price
      });
      continue;
    }

    // Calculate competitor average
    const competitor_average = validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length;

    let suggestion;
    let suggested_price;

    if (my_price > competitor_average * 1.05) {
      // Too expensive: my_price > competitor_average + 5%
      suggestion = "🔴";
      suggested_price = Math.round(competitor_average * 0.95 * 100) / 100; // 5% below average
    } else if (my_price <= competitor_average) {
      // Competitive: my_price ≤ competitor_average
      suggestion = "🟢";
      suggested_price = my_price;
    } else {
      // Can optimize: within ±5% of competitor_average
      suggestion = "🟡";
      suggested_price = Math.round(competitor_average * 100) / 100;
    }

    results.push({
      name,
      my_price,
      competitor_average: Math.round(competitor_average * 100) / 100,
      suggestion,
      suggested_price
    });
  }

  return results;
}

module.exports = { analyze };