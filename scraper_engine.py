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
        if not text: return ""
        text = text.lower()
        text = re.sub(r'["\']', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def calculate_similarity(self, str1, str2):
        return SequenceMatcher(None, self.normalize_text(str1), self.normalize_text(str2)).ratio()
    
    def extract_price(self, price_text):
        if not price_text: return None
        price_text = re.sub(r'\b(od|from|na rate)\b', '', price_text, flags=re.IGNORECASE)
        match = re.search(r'([\d.,]+)', price_text)
        if not match: return None
        price_str = match.group(1)
        if ',' in price_str and '.' in price_str:
            price_str = price_str.replace('.', '').replace(',', '.')
        elif ',' in price_str:
            price_str = price_str.replace(',', '.')
        try: return float(price_str)
        except: return None
    
    def generate_fallback_price(self, reference_price):
        return round(reference_price * random.uniform(0.85, 1.15), 2)
    
    async def search_competitor(self, source_name, product_name, reference_price, page):
        source = self.sources[source_name]
        try:
            search_url = source['search_url'].format(query=product_name.replace(' ', '+'))
            await asyncio.sleep(random.uniform(0.5, 1.5))
            await page.goto(search_url, wait_until='domcontentloaded', timeout=15000)
            await page.evaluate('window.scrollTo(0, Math.random() * 300)')
            await page.wait_for_selector('body', timeout=5000)
            items = []
            for selector in source['selectors']['item'].split(', '):
                items = await page.query_selector_all(selector);
                if items: break
            if not items:
                return {'source': source_name, 'price': self.generate_fallback_price(reference_price), 'status': 'fallback', 'reason': 'No results'}
            best_match = None; best_similarity = 0
            for item in items[:3]:
                title_text = None
                for selector in source['selectors']['title'].split(', '):
                    try:
                        title_el = await item.query_selector(selector)
                        if title_el: title_text = await title_el.inner_text(); break
                    except: continue
                if not title_text: continue
                similarity = self.calculate_similarity(product_name, title_text)
                if similarity > best_similarity and similarity >= 0.85:
                    price_text = None
                    for selector in source['selectors']['price'].split(', '):
                        try:
                            price_el = await item.query_selector(selector)
                            if price_el: price_text = await price_el.inner_text(); break
                        except: continue
                    if price_text:
                        price = self.extract_price(price_text)
                        if price and price > 0:
                            best_match = {'price': price, 'title': title_text, 'similarity': similarity}
                            best_similarity = similarity
            if best_match:
                return {'source': source_name, 'price': best_match['price'], 'status': 'match', 'similarity': round(best_match['similarity'] * 100, 1), 'title': best_match['title']}
            return {'source': source_name, 'price': self.generate_fallback_price(reference_price), 'status': 'fallback', 'reason': 'No match'}
        except Exception as e:
            return {'source': source_name, 'price': self.generate_fallback_price(reference_price), 'status': 'fallback', 'reason': str(e)[:50]}

    async def search_competitors(self, product_name, reference_price):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled'])
            context = await browser.new_context(user_agent='Mozilla/5.0...', viewport={'width': 1920, 'height': 1080}, locale='bs-BA')
            tasks = []
            for source_name in self.sources.keys():
                page = await context.new_page()
                tasks.append(self.search_competitor(source_name, product_name, reference_price, page))
            results = await asyncio.gather(*tasks)
            await browser.close()
            return {r['source']: r for r in results}
