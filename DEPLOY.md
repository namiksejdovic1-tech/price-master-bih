# VPS Deployment Guide - srv1262290.hstgr.cloud

## Quick Deploy

```bash
# SSH into your VPS
ssh root@srv1262290.hstgr.cloud

# Clone the repo (or update if exists)
cd /opt && git clone https://github.com/namiksejdovic1-tech/price-master-bih.git
cd price-master-bih

# Or if already cloned:
git pull origin main

# Deploy with Docker Compose
docker-compose up -d

# Verify deployment
docker-compose ps
curl http://localhost:3000/health
```

## What's Deployed

✅ **Version**: Latest from main branch (commit da7952c)  
✅ **Security**: Zero npm vulnerabilities  
✅ **Node.js**: 18+ LTS Alpine  
✅ **Port**: 3000 (exposed)  
✅ **Auto-restart**: Yes  
✅ **Health Check**: Enabled  

## Files Persistence

- `products.json` - persists locally
- `uploads/` - persists locally
- Both mounted as volumes

## Useful Commands

```bash
# View logs
docker-compose logs -f price-master

# Restart service
docker-compose restart price-master

# Stop service
docker-compose down

# Rebuild image
docker-compose build --no-cache
docker-compose up -d

# Check health
curl http://localhost:3000/health
```

## Firewall Setup (if needed)

```bash
# Allow port 3000
ufw allow 3000/tcp
```

## Next Steps

1. Update DNS to point to VPS IP
2. Set up reverse proxy (Nginx) for HTTPS on port 80/443
3. Configure environment variables in docker-compose.yml if needed
4. Set up cron backups for products.json

---
**Deployment Date**: 2026-01-12  
**Status**: Ready to Deploy ✅
