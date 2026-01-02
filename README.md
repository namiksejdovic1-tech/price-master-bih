# 🎯 Analizator Cijena - Price Intelligence Platform

**Profesionalni alat za praćenje konkurencije na BIH tržištu**

[![Live Demo](https://img.shields.io/badge/demo-live-success)](http://localhost:8000)
[![Python](https://img.shields.io/badge/python-3.9+-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 📋 Pregled

Analizator Cijena je napredna SaaS platforma za praćenje i analizu konkurentskih cijena na tržištu Bosne i Hercegovine. Aplikacija automatski prati cijene proizvoda kod vodećih konkurenata i pruža inteligentne preporuke za optimizaciju cijena.

### ✨ Ključne Funkcionalnosti

- **🔍 Automatsko Praćenje Cijena** - Prati cijene kod 4 glavna konkurenta (Domod, eKupi, Technoshop, Tehnomag)
- **📊 AI Index Konkurentnosti** - Inteligentna analiza tržišne pozicije
- **⚡ Real-time Dashboard** - Pregled svih proizvoda i cijena u realnom vremenu
- **🎯 Pametni Filteri** - Filtriranje proizvoda po statusu (najbolja cijena, OK, hitna korekcija)
- **🔄 Refresh Funkcionalnost** - Ponovna analiza pojedinačnih proizvoda
- **📱 Responsive Design** - Optimizovano za sve uređaje
- **🎨 Premium UI/UX** - Moderna, profesionalna vizuelna identifikacija

## 🚀 Brzi Start

### Preduvjeti

- Python 3.9 ili noviji
- pip (Python package manager)
- Git

### Instalacija

1. **Klonirajte repozitorij:**

```bash
git clone https://github.com/namiksejdovic1-tech/price-master-bih.git
cd price-master-bih
```

1. **Instalirajte zavisnosti:**

```bash
pip install -r requirements.txt
playwright install chromium
```

1. **Pokrenite aplikaciju:**

```bash
python main.py
```

1. **Otvorite browser:**

```
http://localhost:8000
```

## 🏗️ Arhitektura

### Tehnološki Stack

- **Backend:** FastAPI (Python)
- **Frontend:** HTML, CSS (Tailwind), JavaScript
- **Scraping:** Playwright (headless browser automation)
- **Data Storage:** JSON (products.json)
- **Template Engine:** Jinja2

### Struktura Projekta

```
bijelatehnika_app/
├── main.py                 # FastAPI aplikacija i rute
├── scraper_engine.py       # Web scraping logika
├── sources.json            # Konfiguracija konkurenata
├── products.json           # Baza proizvoda
├── requirements.txt        # Python zavisnosti
├── Dockerfile             # Docker konfiguracija
├── templates/
│   └── dashboard.html     # Premium UI template
└── BUILD.md               # Deployment uputstva
```

## 📊 UI/UX Specifikacija

### Hijerarhija Ekrana

1. **Inline Forma** - Dodavanje proizvoda (uvijek vidljiva)
2. **Rezultati Pretrage** - Brzi feedback nakon dodavanja
3. **4 Widgeta** - Statistika i filteri
   - W1: Tržišno najbolja cijena
   - W2: Ne treba korekcija
   - W3: Hitna korekcija
   - W4: INDEX KONKURENTNOSTI (AI)
4. **Tabela** - Glavni prikaz svih proizvoda

### Dizajn Principi

- Svijetla pozadina (#F7F9FC)
- Rounded kartice (16px)
- Inter font family
- Boja statusa jasno označena
- Bez teških bordera
- Smooth transitions i hover efekti

## 🔧 API Endpoints

### GET `/`

Glavni dashboard sa svim proizvodima i statistikom

### POST `/api/add`

Dodavanje novog proizvoda i analiza konkurencije

```json
{
  "name": "Naziv proizvoda",
  "price": 899.00,
  "link": "https://..."
}
```

### POST `/api/refresh/{product_id}`

Ponovna analiza konkurencije za specifičan proizvod

### DELETE `/api/product/{product_id}`

Brisanje proizvoda

## 🌐 Deployment

### Railway (Preporučeno)

1. Push kod na GitHub
2. Povežite Railway sa GitHub repozitorijem
3. Railway automatski detektuje Python aplikaciju
4. Dodajte environment variable ako je potrebno
5. Deploy!

Detaljne instrukcije: [BUILD.md](BUILD.md)

### Docker

```bash
docker build -t price-analyzer .
docker run -p 8000:8000 price-analyzer
```

### Render.com

1. Kreirajte novi Web Service
2. Povežite GitHub repozitorij
3. Build Command: `pip install -r requirements.txt && playwright install chromium`
4. Start Command: `python main.py`

## 📈 Kako Funkcioniše

1. **Korisnik dodaje proizvod** - Unosi naziv i svoju cijenu
2. **Sistem pretražuje konkurente** - Playwright automatski pretražuje 4 konkurenta
3. **AI analiza** - Sistem analizira rezultate i pronalazi najbolje poklapanje
4. **Prikaz rezultata** - Korisnik vidi cijene svih konkurenata
5. **Preporuke** - AI Index daje preporuke za optimizaciju

## 🎯 Konkurenti

Aplikacija prati cijene kod:

- **Domod** (domod.ba)
- **eKupi** (ekupi.ba)
- **Technoshop** (technoshop.ba)
- **Tehnomag** (tehnomag.ba)

## 🔐 Sigurnost

- Rate limiting na scraping
- Fallback mehanizam za greške
- Validacija input podataka
- CORS zaštita

## 📝 Licenca

© 2026 Price Competitor Analysis. Sva prava zadržana - Namik Sejdović

## 🤝 Kontakt

**Namik Sejdović**

- GitHub: [@namiksejdovic1-tech](https://github.com/namiksejdovic1-tech)

## 🚧 Roadmap

- [ ] Export u CSV/Excel
- [ ] Email notifikacije za promjene cijena
- [ ] Historijski prikaz cijena
- [ ] Multi-user support
- [ ] API za integracije
- [ ] Mobile aplikacija

## 🙏 Acknowledgments

Pokreće napredna tehnologija za analizu tržišta.

---

**Made with ❤️ in Bosnia and Herzegovina**
