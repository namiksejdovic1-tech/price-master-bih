// Price parsing and normalization utilities
export class PriceParser {
    // Extract numeric price from various formats
    static parsePrice(priceText) {
        if (!priceText || typeof priceText !== 'string') return 0.0;

        // Remove all non-numeric characters except comma and dot
        let cleaned = priceText.replace(/[^\d,.-]/g, '').trim();

        if (!cleaned) return 0.0;

        // Handle European format (1.299,00) vs US format (1,299.00)
        const commaCount = (cleaned.match(/,/g) || []).length;
        const dotCount = (cleaned.match(/\./g) || []).length;

        if (commaCount > 0 && dotCount > 0) {
            // Mixed format - determine which is decimal separator
            const lastComma = cleaned.lastIndexOf(',');
            const lastDot = cleaned.lastIndexOf('.');

            if (lastComma > lastDot) {
                // European: 1.299,00
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                // US: 1,299.00
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (commaCount > 0) {
            // Only commas - check if it's decimal or thousand separator
            const parts = cleaned.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                // Likely decimal: 299,00
                cleaned = cleaned.replace(',', '.');
            } else {
                // Likely thousand separator: 1,299
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (dotCount > 1) {
            // Multiple dots - keep only last as decimal
            const parts = cleaned.split('.');
            cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        }

        try {
            const price = parseFloat(cleaned);
            return isNaN(price) ? 0.0 : Math.round(price * 100) / 100;
        } catch (e) {
            console.error('Price parsing error:', e);
            return 0.0;
        }
    }

    // Format price for display
    static formatPrice(price, currency = 'KM') {
        if (typeof price !== 'number' || isNaN(price)) return 'N/A';
        return `${price.toFixed(2)} ${currency}`;
    }

    // Extract currency from text
    static extractCurrency(text) {
        if (!text) return 'KM';
        const currencies = ['KM', 'BAM', 'EUR', 'USD'];
        for (const curr of currencies) {
            if (text.toUpperCase().includes(curr)) return curr;
        }
        return 'KM';
    }

    // Validate price is reasonable
    static isValidPrice(price, min = 0.01, max = 999999) {
        return typeof price === 'number' && price >= min && price <= max;
    }
}

export default PriceParser;
