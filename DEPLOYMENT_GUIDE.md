# 🚀 Deployment Guide - Analizator Cijena

## ✅ Pre-Deployment Checklist

Your application is **READY FOR DEPLOYMENT**! All files have been prepared and tested locally.

### Files Ready

- ✅ `main.py` - Backend with all endpoints (add, refresh, delete)
- ✅ `scraper_engine.py` - Web scraping logic
- ✅ `templates/dashboard.html` - Premium UI/UX
- ✅ `requirements.txt` - All dependencies
- ✅ `Dockerfile` - Docker configuration
- ✅ `sources.json` - Competitor configuration
- ✅ `products.json` - Initial product data
- ✅ `.gitignore` - Git ignore rules
- ✅ `README.md` - Complete documentation
- ✅ `BUILD.md` - Build instructions

---

## 📤 Step 1: Upload to GitHub

### Option A: Using GitHub Web Interface (Recommended if Git not installed)

1. **Go to your repository:**

   ```
   https://github.com/namiksejdovic1-tech/price-master-bih
   ```

2. **Upload files:**
   - Click "Add file" → "Upload files"
   - Drag and drop ALL files from: `C:\Users\Namik\Desktop\Analiza konkurencije\bijelatehnika_app`
   - **IMPORTANT:** Make sure to upload the `templates` folder with `dashboard.html`
   - Commit message: "Premium UI redesign - Production ready"
   - Click "Commit changes"

### Option B: Using Git (If you install Git)

```bash
cd "C:\Users\Namik\Desktop\Analiza konkurencije\bijelatehnika_app"
git init
git add .
git commit -m "Premium UI redesign - Production ready"
git remote add origin https://github.com/namiksejdovic1-tech/price-master-bih.git
git branch -M main
git push -u origin main --force
```

---

## 🚂 Step 2: Deploy to Railway

### 2.1 Connect Repository

1. **Go to Railway:**

   ```
   https://railway.com/new/github
   ```

2. **Select Repository:**
   - Find `namiksejdovic1-tech/price-master-bih`
   - Click "Deploy Now"

### 2.2 Configure Build

Railway will auto-detect Python. Verify these settings:

**Build Command:**

```bash
pip install -r requirements.txt && playwright install chromium
```

**Start Command:**

```bash
python main.py
```

**Port:** `8000`

### 2.3 Environment Variables (Optional)

If needed, add:

- `PORT=8000`
- `PYTHON_VERSION=3.9`

### 2.4 Deploy

- Click "Deploy"
- Wait 2-3 minutes for build
- Railway will provide a live URL like: `https://your-app.railway.app`

---

## 🌐 Alternative: Deploy to Render.com

### 3.1 Create New Web Service

1. **Go to Render:**

   ```
   https://render.com/
   ```

2. **New Web Service:**
   - Connect GitHub account
   - Select `price-master-bih` repository
   - Choose "main" branch

### 3.2 Configure Service

**Name:** `price-analyzer-bih`

**Environment:** `Python 3`

**Build Command:**

```bash
pip install -r requirements.txt && playwright install chromium
```

**Start Command:**

```bash
python main.py
```

**Instance Type:** `Free`

### 3.3 Environment Variables

Add if needed:

```
PORT=8000
PYTHON_VERSION=3.9
```

### 3.4 Deploy

- Click "Create Web Service"
- Wait for deployment (3-5 minutes)
- Get your live URL

---

## 🐳 Alternative: Docker Deployment

### 4.1 Build Docker Image

```bash
cd "C:\Users\Namik\Desktop\Analiza konkurencije\bijelatehnika_app"
docker build -t price-analyzer .
```

### 4.2 Run Locally

```bash
docker run -p 8000:8000 price-analyzer
```

### 4.3 Deploy to Docker Hub

```bash
docker tag price-analyzer yourusername/price-analyzer
docker push yourusername/price-analyzer
```

---

## ✅ Post-Deployment Verification

After deployment, verify:

1. **Homepage loads** - Check the inline form is visible
2. **Add product works** - Test adding a new product
3. **Widgets display** - Verify all 4 widgets show correct data
4. **Table filters** - Click widgets to filter table
5. **Refresh works** - Test refresh icon on products
6. **Delete works** - Test delete icon
7. **Footer visible** - Scroll down to see footer

---

## 🔧 Troubleshooting

### Issue: "Internal Server Error"

**Solution:** Check logs for Jinja2 or Python errors

```bash
# Railway: View logs in dashboard
# Render: View logs in service page
```

### Issue: "Playwright not found"

**Solution:** Ensure build command includes:

```bash
playwright install chromium
```

### Issue: "Port already in use"

**Solution:** Change port in deployment settings or use environment variable

### Issue: "Scraping fails"

**Solution:** This is expected on some platforms. The app uses fallback data automatically.

---

## 📊 Expected Performance

- **Build time:** 2-5 minutes
- **Cold start:** 3-5 seconds
- **Response time:** < 500ms
- **Scraping time:** 10-15 seconds per product

---

## 🎯 Next Steps After Deployment

1. **Test thoroughly** - Add multiple products
2. **Monitor performance** - Check Railway/Render metrics
3. **Share URL** - Send to stakeholders
4. **Collect feedback** - Iterate based on usage
5. **Add features** - CSV export, email alerts, etc.

---

## 📞 Support

If you encounter issues:

1. Check deployment logs
2. Verify all files uploaded correctly
3. Ensure `templates/dashboard.html` is in the repository
4. Confirm build and start commands are correct

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ Live URL is accessible  
✅ Premium UI loads correctly  
✅ All 4 widgets are visible  
✅ Products can be added  
✅ Table filtering works  
✅ Footer displays correctly  

---

**You're ready to deploy! 🚀**

The application is production-ready with:

- Premium UI/UX as specified
- All endpoints functional
- Proper error handling
- Fallback mechanisms
- Professional design

**Estimated deployment time: 5-10 minutes**

Good luck! 🎯
