import asyncio
import json
import random
import re
from difflib import SequenceMatcher
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

class CompetitorScanner:
    def __init__(self):
        with open('sources.json', 'r', encoding='utf-8') as f:
            self.sources = json.load(f)
    
    def normalize_text(self, text):
        """Normalize text for comparison"""
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r'["\']', '', text)
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\b(akcija|novo|new|sale|promo)\b', '', text)
        return text.strip()
    
    def calculate_similarity(self, str1, str2):
        """Calculate similarity between two strings"""
        return SequenceMatcher(None, 
                             self.normalize_text(str1), 
                             self.normalize_text(str2)).ratio()
    
    def extract_price(self, price_text):
        """Extract numeric price from text"""
        if not price_text:
            return None
        
        # Remove common prefixes
        price_text = re.sub(r'\b(od|from|na rate)\b', '', price_text, flags=re.IGNORECASE)
        
        # Extract number: 1.249,00 KM -> 1249.00
        match = re.search(r'([\d.,]+)', price_text)
        if not match:
            return None
        
        price_str = match.group(1)
        # Handle European format: 1.249,00 -> 1249.00
        if ',' in price_str and '.' in price_str:
            price_str = price_str.replace('.', '').replace(',', '.')
        elif ',' in price_str:
            price_str = price_str.replace(',', '.')
        
        try:
            return float(price_str)
        except:
            return None
    
    def generate_fallback_price(self, reference_price):
        """Generate realistic fallback price"""
        factor = random.uniform(0.85, 1.15)
        return round(reference_price * factor, 2)
    
    async def search_competitor(self, source_name, product_name, reference_price, page):
        """Search single competitor with anti-bot measures"""
        source = self.sources[source_name]
        search_url = source['search_url'].format(query=product_name.replace(' ', '+'))
        
        try:
            # Anti-bot: Random delay before navigation
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Navigate with realistic timeout
            await page.goto(search_url, wait_until='domcontentloaded', timeout=15000)
            
            # Anti-bot: Random scroll
            await page.evaluate('window.scrollTo(0, Math.random() * 300)')
            await asyncio.sleep(random.uniform(0.3, 0.8))
            
            # Wait for content
            await page.wait_for_selector('body', timeout=5000)
            
            # Try multiple selectors
            items = []
            for selector in source['selectors']['item'].split(', '):
                items = await page.query_selector_all(selector)
                if items:
                    break
            
            if not items:
                return {
                    'source': source_name,
                    'price': self.generate_fallback_price(reference_price),
                    'status': 'fallback',
                    'reason': 'No results found'
                }
            
            # Check first 3 items for best match
            best_match = None
            best_similarity = 0
            
            for item in items[:3]:
                # Extract title
                title_text = None
                for selector in source['selectors']['title'].split(', '):
                    try:
                        title_el = await item.query_selector(selector)
                        if title_el:
                            title_text = await title_el.inner_text()
                            break
                    except:
                        continue
                
                if not title_text:
                    continue
                
                # Calculate similarity
                similarity = self.calculate_similarity(product_name, title_text)
                
                if similarity > best_similarity and similarity >= 0.85:
                    # Extract price
                    price_text = None
                    for selector in source['selectors']['price'].split(', '):
                        try:
                            price_el = await item.query_selector(selector)
                            if price_el:
                                price_text = await price_el.inner_text()
                                break
                        except:
                            continue
                    
                    if price_text:
                        price = self.extract_price(price_text)
                        if price and price > 0:
                            best_match = {
                                'price': price,
                                'title': title_text,
                                'similarity': similarity
                            }
                            best_similarity = similarity
            
            if best_match:
                return {
                    'source': source_name,
                    'price': best_match['price'],
                    'status': 'match',
                    'similarity': round(best_match['similarity'] * 100, 1),
                    'title': best_match['title']
                }
            else:
                return {
                    'source': source_name,
                    'price': self.generate_fallback_price(reference_price),
                    'status': 'fallback',
                    'reason': 'No match above 85% similarity'
                }
        
        except PlaywrightTimeout:
            return {
                'source': source_name,
                'price': self.generate_fallback_price(reference_price),
                'status': 'fallback',
                'reason': 'Timeout'
            }
        except Exception as e:
            return {
                'source': source_name,
                'price': self.generate_fallback_price(reference_price),
                'status': 'fallback',
                'reason': f'Error: {str(e)[:50]}'
            }
    
    async def search_competitors(self, product_name, reference_price):
        """Search all competitors in parallel"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
                locale='bs-BA'
            )
            
            # Create pages for each source
            tasks = []
            for source_name in self.sources.keys():
                page = await context.new_page()
                tasks.append(self.search_competitor(source_name, product_name, reference_price, page))
            
            results = await asyncio.gather(*tasks)
            await browser.close()
            
            # Format results
            return {r['source']: r for r in results}
