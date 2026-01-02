from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import os
from scraper_engine import CompetitorScanner

app = FastAPI()
templates = Jinja2Templates(directory="templates")
scanner = CompetitorScanner()

PRODUCTS_FILE = "products.json"

class ProductInput(BaseModel):
    name: str
    price: float
    link: str = ""

def load_products():
    """Load products from JSON file"""
    if not os.path.exists(PRODUCTS_FILE):
        # Initialize with 10 popular products
        initial_products = [
            {"id": 1, "name": "Beko Frižider RCSA366K40WN", "my_price": 899.00, "link": "", "competitors": {}},
            {"id": 2, "name": "Gorenje Mašina za veš WEI843", "my_price": 749.00, "link": "", "competitors": {}},
            {"id": 3, "name": "Samsung Galaxy A54 128GB", "my_price": 649.00, "link": "", "competitors": {}},
            {"id": 4, "name": "Philips TV 55PUS8808", "my_price": 1299.00, "link": "", "competitors": {}},
            {"id": 5, "name": "Bosch Usisivač BGL3HYG", "my_price": 299.00, "link": "", "competitors": {}},
            {"id": 6, "name": "LG Klima uređaj S09ET", "my_price": 1199.00, "link": "", "competitors": {}},
            {"id": 7, "name": "Tefal Toster TT3650", "my_price": 89.00, "link": "", "competitors": {}},
            {"id": 8, "name": "Xiaomi Robot Vacuum S10", "my_price": 549.00, "link": "", "competitors": {}},
            {"id": 9, "name": "Ariston Bojler PRO1 R 80", "my_price": 429.00, "link": "", "competitors": {}},
            {"id": 10, "name": "Electrolux Šporet EKC6450", "my_price": 1099.00, "link": "", "competitors": {}}
        ]
        save_products(initial_products)
        return initial_products
    
    with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_products(products):
    """Save products to JSON file"""
    with open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

def calculate_stats(products):
    """Calculate dashboard statistics"""
    total = len(products)
    wins = 0
    opportunities = 0
    
    for product in products:
        if not product.get('competitors'):
            continue
        
        my_price = product['my_price']
        competitor_prices = [
            c['price'] for c in product['competitors'].values() 
            if c.get('price') and c['price'] > 0
        ]
        
        if competitor_prices:
            min_competitor = min(competitor_prices)
            if my_price <= min_competitor:
                wins += 1
            else:
                opportunities += 1
    
    return {
        'total': total,
        'wins': wins,
        'opportunities': opportunities
    }

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Render dashboard"""
    products = load_products()
    
    # Pre-calculate min_price and is_best for each product
    for product in products:
        competitors = product.get('competitors', {})
        prices = []
        for source in ['domod', 'ekupi', 'technoshop', 'tehnomag']:
            comp = competitors.get(source, {})
            if comp.get('price') and comp['price'] > 0:
                prices.append(comp['price'])
        
        product['min_competitor_price'] = min(prices) if prices else 0
        product['is_best_price'] = product['my_price'] <= product['min_competitor_price'] if product['min_competitor_price'] > 0 else False
    
    stats = calculate_stats(products)
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "products": products,
        "stats": stats
    })

@app.post("/api/add")
async def add_product(product: ProductInput):
    """Add new product and analyze competitors"""
    products = load_products()
    
    # Generate new ID
    new_id = max([p['id'] for p in products], default=0) + 1
    
    # Create product entry
    new_product = {
        "id": new_id,
        "name": product.name,
        "my_price": product.price,
        "link": product.link,
        "competitors": {}
    }
    
    # Scan competitors
    try:
        results = await scanner.search_competitors(product.name, product.price)
        new_product['competitors'] = results
    except Exception as e:
        print(f"Scraping error: {e}")
        # Use fallback for all
        new_product['competitors'] = {
            source: {
                'source': source,
                'price': scanner.generate_fallback_price(product.price),
                'status': 'fallback',
                'reason': 'System error'
            }
            for source in scanner.sources.keys()
        }
    
    products.append(new_product)
    save_products(products)
    
    stats = calculate_stats(products)
    
    return JSONResponse({
        "success": True,
        "product": new_product,
        "stats": stats
    })

@app.post("/api/refresh/{product_id}")
async def refresh_product(product_id: int):
    """Refresh competitor data for a specific product"""
    products = load_products()
    
    # Find the product
    product = next((p for p in products if p['id'] == product_id), None)
    if not product:
        return JSONResponse({"success": False, "error": "Product not found"})
    
    # Re-scan competitors
    try:
        results = await scanner.search_competitors(product['name'], product['my_price'])
        product['competitors'] = results
    except Exception as e:
        print(f"Scraping error: {e}")
        # Use fallback for all
        product['competitors'] = {
            source: {
                'source': source,
                'price': scanner.generate_fallback_price(product['my_price']),
                'status': 'fallback',
                'reason': 'System error'
            }
            for source in scanner.sources.keys()
        }
    
    save_products(products)
    stats = calculate_stats(products)
    
    return JSONResponse({
        "success": True,
        "product": product,
        "stats": stats
    })

@app.delete("/api/product/{product_id}")
async def delete_product(product_id: int):
    """Delete product"""
    products = load_products()
    products = [p for p in products if p['id'] != product_id]
    save_products(products)
    
    stats = calculate_stats(products)
    
    return JSONResponse({
        "success": True,
        "stats": stats
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
