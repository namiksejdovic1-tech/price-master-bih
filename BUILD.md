# BUILD WINDOWS .EXE

## Opcija 1: PyInstaller (Brzo)

```bash
# Install
pip install pyinstaller

# Build
pyinstaller BijelaTehnika.spec

# Output
dist/BijelaTehnika.exe
```

**Problem:** Playwright browser ne radi u .exe (zahtijeva external Chromium)

---

## Opcija 2: Cloud Deployment (PREPORUČENO)

Aplikacija je **web-based**, najbolje radi kao:

### A) Render.com (Besplatno)

1. Upload kod na GitHub
2. Connect Render → Auto-deploy
3. **URL:** `https://bijelatehnika.onrender.com`

### B) Railway.app (Brže)

1. `railway login`
2. `railway init`
3. `railway up`
4. **URL:** `https://bijelatehnika.up.railway.app`

---

## Opcija 3: Desktop Wrapper (Electron)

Zahtijeva **potpunu reimplementaciju**:

- Backend: Node.js + Express (umjesto FastAPI)
- Scraping: Puppeteer (umjesto Playwright)
- Database: SQLite (umjesto JSON)
- Build: electron-builder
- **Vrijeme:** 2-3 sata

---

## PREPORUKA

**Koristi Python aplikaciju kao web app:**

```bash
# Pokreni lokalno
python main.py

# Otvori
http://localhost:8000
```

**Prednosti:**

- ✅ Već radi
- ✅ Premium UI
- ✅ Sve funkcionalnosti
- ✅ Može se deployovati na cloud
- ✅ Pristupačno sa bilo kojeg uređaja

**Desktop .exe nije potreban** - moderna web aplikacija je bolji izbor.
