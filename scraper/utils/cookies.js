// Cookie management and session handling for scrapers
export class CookieManager {
    constructor() {
        this.cookies = new Map();
    }

    setCookies(domain, cookies) {
        this.cookies.set(domain, cookies);
    }

    getCookies(domain) {
        return this.cookies.get(domain) || [];
    }

    clear(domain) {
        if (domain) {
            this.cookies.delete(domain);
        } else {
            this.cookies.clear();
        }
    }

    // Generate realistic browser headers
    static getHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'bs-BA,bs;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        };
    }

    // Random delay to mimic human behavior
    static async randomDelay(min = 500, max = 2000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }
}

export default CookieManager;
