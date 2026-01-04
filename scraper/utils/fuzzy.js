import fuzzball from 'fuzzball';

// Fuzzy matching utilities for product comparison
export class FuzzyMatcher {
    // Normalize product name for comparison
    static normalize(text) {
        if (!text) return '';

        return text
            .toLowerCase()
            .trim()
            // Remove special characters but keep spaces and alphanumeric
            .replace(/[^\w\s\d]/g, ' ')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Extract model/serial numbers from product name
    static extractModel(text) {
        if (!text) return '';

        const patterns = [
            /\b[A-Z]{2,}\s*[-]?\s*\d{3,}/gi,  // ABC-1234 or ABC1234
            /\b\d{3,}[-]?\d*/gi,                // 1234 or 1234-56
            /\b[A-Z]\d+[A-Z]?\d*/gi             // A1234B
        ];

        const models = [];
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches) {
                models.push(...matches.map(m => m.replace(/[-\s]/g, '').toUpperCase()));
            }
        }

        return models.join(' ');
    }

    // Extract brand from product name
    static extractBrand(text) {
        if (!text) return '';

        const commonBrands = [
            'Samsung', 'LG', 'Sony', 'Bosch', 'Whirlpool', 'Electrolux',
            'Gorenje', 'Beko', 'Candy', 'Indesit', 'Hisense', 'TCL',
            'Philips', 'Panasonic', 'Sharp', 'Toshiba', 'Haier', 'Midea',
            'Beko', 'Ariston', 'Zanussi', 'AEG', 'Miele', 'Siemens'
        ];

        const normalized = text.toLowerCase();

        for (const brand of commonBrands) {
            if (normalized.includes(brand.toLowerCase())) {
                return brand;
            }
        }

        // Try to extract first word as potential brand
        const firstWord = text.trim().split(/\s+/)[0];
        if (firstWord && firstWord.length > 2) {
            return firstWord;
        }

        return '';
    }

    // Calculate match score between two product names
    static matchScore(product1, product2, options = {}) {
        if (!product1 || !product2) return 0;

        const normalized1 = this.normalize(product1);
        const normalized2 = this.normalize(product2);

        // Base similarity score using token set ratio (handles word order)
        let score = fuzzball.token_set_ratio(normalized1, normalized2);

        // Brand matching - must match exactly
        const brand1 = this.extractBrand(product1);
        const brand2 = this.extractBrand(product2);

        if (brand1 && brand2) {
            if (brand1.toLowerCase() !== brand2.toLowerCase()) {
                // Brand mismatch - significant penalty
                score *= 0.3;
            } else {
                // Brand match - bonus
                score = Math.min(100, score * 1.1);
            }
        }

        // Model number matching - strong indicator
        const model1 = this.extractModel(product1);
        const model2 = this.extractModel(product2);

        if (model1 && model2) {
            const modelMatch = fuzzball.ratio(model1, model2);
            if (modelMatch > 80) {
                // Strong model match - significant bonus
                score = Math.min(100, score * 1.3);
            }
        }

        return Math.round(score);
    }

    // Find best matching product from a list
    static findBestMatch(searchProduct, candidateProducts, threshold = 70) {
        if (!candidateProducts || candidateProducts.length === 0) {
            return null;
        }

        let bestMatch = null;
        let bestScore = 0;

        for (const candidate of candidateProducts) {
            const score = this.matchScore(searchProduct, candidate.name || candidate.title);

            if (score > bestScore && score >= threshold) {
                bestScore = score;
                bestMatch = {
                    ...candidate,
                    matchScore: score
                };
            }
        }

        return bestMatch;
    }

    // Check if two products are likely the same
    static isSameProduct(product1, product2, threshold = 75) {
        const score = this.matchScore(product1, product2);
        return score >= threshold;
    }
}

export default FuzzyMatcher;
