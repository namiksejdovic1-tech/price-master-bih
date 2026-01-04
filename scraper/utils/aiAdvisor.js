// AI-powered price advisor
export class AIAdvisor {
    // Calculate recommended price based on competitor data
    static calculateRecommendedPrice(myPrice, competitorPrices, options = {}) {
        const {
            minMargin = 0.05,      // Minimum 5% margin
            maxMargin = 0.25,      // Maximum 25% margin
            strategy = 'competitive' // 'aggressive', 'competitive', 'premium'
        } = options;

        const validPrices = competitorPrices.filter(p => p > 0);

        if (validPrices.length === 0) {
            return {
                recommendedPrice: myPrice,
                strategy: 'no_data',
                confidence: 0,
                reasoning: 'No competitor data available'
            };
        }

        const minCompetitor = Math.min(...validPrices);
        const maxCompetitor = Math.max(...validPrices);
        const avgCompetitor = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
        const medianCompetitor = this.calculateMedian(validPrices);

        let recommendedPrice;
        let reasoning;
        let confidence;

        switch (strategy) {
            case 'aggressive':
                // Price slightly below minimum competitor
                recommendedPrice = minCompetitor * 0.98;
                reasoning = 'Aggressive pricing to capture market share';
                confidence = 75;
                break;

            case 'premium':
                // Price near median but maintain premium positioning
                recommendedPrice = medianCompetitor * 1.05;
                reasoning = 'Premium positioning with competitive awareness';
                confidence = 70;
                break;

            case 'competitive':
            default:
                // Price competitively near median
                if (myPrice < minCompetitor) {
                    // We're already cheapest - can increase slightly
                    recommendedPrice = minCompetitor * 0.99;
                    reasoning = 'Currently cheapest - room to increase margin';
                    confidence = 85;
                } else if (myPrice > maxCompetitor) {
                    // We're most expensive - should decrease
                    recommendedPrice = medianCompetitor * 1.02;
                    reasoning = 'Currently most expensive - reduce to median level';
                    confidence = 90;
                } else {
                    // We're in the middle - maintain position near median
                    recommendedPrice = medianCompetitor;
                    reasoning = 'Competitive position - align with market median';
                    confidence = 80;
                }
                break;
        }

        // Ensure we don't go below cost (minimum margin)
        const minimumPrice = myPrice * (1 - maxMargin);
        const maximumPrice = myPrice * (1 + maxMargin);

        recommendedPrice = Math.max(minimumPrice, Math.min(maximumPrice, recommendedPrice));
        recommendedPrice = Math.round(recommendedPrice * 100) / 100;

        return {
            recommendedPrice,
            strategy,
            confidence,
            reasoning,
            marketAnalysis: {
                minCompetitor: Math.round(minCompetitor * 100) / 100,
                maxCompetitor: Math.round(maxCompetitor * 100) / 100,
                avgCompetitor: Math.round(avgCompetitor * 100) / 100,
                medianCompetitor: Math.round(medianCompetitor * 100) / 100,
                myCurrentPrice: Math.round(myPrice * 100) / 100,
                myPosition: this.getMarketPosition(myPrice, validPrices)
            }
        };
    }

    // Calculate competitive index (0-100, higher = more competitive)
    static calculateCompetitiveIndex(myPrice, competitorPrices) {
        const validPrices = competitorPrices.filter(p => p > 0);

        if (validPrices.length === 0 || myPrice === 0) return 50;

        const minPrice = Math.min(...validPrices);
        const maxPrice = Math.max(...validPrices);

        if (maxPrice === minPrice) return 100;

        // Calculate where we stand in the price range
        const priceRange = maxPrice - minPrice;
        const ourPosition = maxPrice - myPrice;

        // Convert to 0-100 scale (lower price = higher index)
        let index = (ourPosition / priceRange) * 100;

        // Bonus if we're the cheapest
        if (myPrice <= minPrice) {
            index = Math.min(100, index + 10);
        }

        return Math.round(Math.max(0, Math.min(100, index)));
    }

    // Generate price alerts and warnings
    static generateAlerts(myPrice, competitorPrices, recommendedPrice) {
        const alerts = [];
        const validPrices = competitorPrices.filter(p => p > 0);

        if (validPrices.length === 0) {
            return ['⚠️ No competitor data - unable to assess market position'];
        }

        const minCompetitor = Math.min(...validPrices);
        const maxCompetitor = Math.max(...validPrices);
        const avgCompetitor = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;

        // Price too high
        if (myPrice > maxCompetitor * 1.1) {
            alerts.push('🔴 Critical: Price 10%+ above highest competitor');
        } else if (myPrice > maxCompetitor) {
            alerts.push('⚠️ Warning: Highest price in market');
        }

        // Price too low (potential margin issue)
        if (myPrice < minCompetitor * 0.9) {
            alerts.push('💰 Opportunity: Significantly below market - consider price increase');
        }

        // Large price adjustment recommended
        const priceDiff = Math.abs(myPrice - recommendedPrice);
        const percentDiff = (priceDiff / myPrice) * 100;

        if (percentDiff > 10) {
            alerts.push(`📊 Recommendation: ${percentDiff.toFixed(1)}% price adjustment suggested`);
        }

        // Market position
        const position = this.getMarketPosition(myPrice, validPrices);
        if (position === 'cheapest') {
            alerts.push('✅ Best Price: Currently lowest in market');
        } else if (position === 'expensive') {
            alerts.push('⚠️ Above Average: Price higher than market average');
        }

        return alerts.length > 0 ? alerts : ['✅ Competitive: Price well-positioned in market'];
    }

    // Helper: Calculate median
    static calculateMedian(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // Helper: Get market position
    static getMarketPosition(myPrice, competitorPrices) {
        const min = Math.min(...competitorPrices);
        const avg = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;

        if (myPrice <= min) return 'cheapest';
        if (myPrice < avg * 0.95) return 'below_average';
        if (myPrice <= avg * 1.05) return 'average';
        if (myPrice <= avg * 1.15) return 'above_average';
        return 'expensive';
    }
}

export default AIAdvisor;
