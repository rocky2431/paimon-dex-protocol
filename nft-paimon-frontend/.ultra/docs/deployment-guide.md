# Deployment Guide - Frontend

**Last Updated:** 2025-11-07  
**Project:** nft-paimon-frontend  
**Version:** 0.1.0

---

## Overview

This guide covers deployment of the Paimon DEX frontend to production and staging environments.

**Tech Stack:**
- Next.js 14 (App Router)
- Vercel (recommended hosting)
- BSC Mainnet/Testnet

---

## Pre-Deployment Checklist

### 1. Code Quality

- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] All tests passing (`npm test`)
- [ ] No console.log statements in production code
- [ ] ESLint warnings addressed (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)

### 2. Environment Configuration

- [ ] Environment variables configured
- [ ] Contract addresses updated
- [ ] RPC endpoints verified
- [ ] API keys secured (not in git)

### 3. Security

- [ ] Dependencies updated (`npm audit`)
- [ ] No high/critical vulnerabilities
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] Rate limiting enabled (if applicable)

### 4. Performance

- [ ] Core Web Vitals targets met (LCP <2.5s, INP <200ms, CLS <0.1)
- [ ] Images optimized (WebP format)
- [ ] Bundle size analyzed (`npm run build`)
- [ ] Lazy loading implemented

---

## Environment Variables

### Required Variables

Create `.env.production` file:

```bash
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=56                    # BSC Mainnet
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org/

# Contract Addresses (Update after mainnet deployment)
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_USDP_ADDRESS=0x...
NEXT_PUBLIC_PAIMON_ADDRESS=0x...
NEXT_PUBLIC_VENFT_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
NEXT_PUBLIC_PSM_ADDRESS=0x...
NEXT_PUBLIC_DEX_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_DEX_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_LAUNCHPAD_ADDRESS=0x...
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0x...

# Feature Flags (Enable/disable features)
NEXT_PUBLIC_ENABLE_VAULT=true
NEXT_PUBLIC_ENABLE_STABILITY_POOL=true
NEXT_PUBLIC_ENABLE_VENFT=true
NEXT_PUBLIC_ENABLE_BOOST=true
NEXT_PUBLIC_ENABLE_BRIBES=true
NEXT_PUBLIC_ENABLE_NITRO=true
NEXT_PUBLIC_ENABLE_REWARDS=true

# Analytics (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### Testnet Variables

Create `.env.staging`:

```bash
NEXT_PUBLIC_CHAIN_ID=97                    # BSC Testnet
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Use testnet contract addresses
# ... (same structure as production)
```

---

## Deployment Platforms

### Option 1: Vercel (Recommended)

**Advantages:**
- Zero-config Next.js deployment
- Automatic HTTPS
- CDN + edge functions
- Preview deployments for PRs
- Built-in analytics

**Steps:**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to Preview:**
   ```bash
   vercel
   ```

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

5. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.production`
   - Redeploy after adding variables

**Custom Domain Setup:**
1. Add domain in Vercel dashboard
2. Update DNS records (A/CNAME)
3. HTTPS automatically configured

---

### Option 2: Self-Hosted (Docker)

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_CHAIN_ID=56
      - NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org/
    restart: unless-stopped
```

**Deploy:**
```bash
docker-compose up -d
```

---

### Option 3: Netlify

**netlify.toml:**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "18"
```

**Deploy:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_CHAIN_ID: ${{ secrets.CHAIN_ID }}
          NEXT_PUBLIC_RPC_URL: ${{ secrets.RPC_URL }}
          # Add all environment variables
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Post-Deployment Verification

### 1. Smoke Tests

**Check all critical pages load:**
```bash
curl -I https://paimon.dex/
curl -I https://paimon.dex/swap
curl -I https://paimon.dex/vault
curl -I https://paimon.dex/lock
```

**Expected:** All return `200 OK`

---

### 2. Functionality Tests

**Manual checks:**
- [ ] Navigation works (all pages accessible)
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Swap transaction succeeds
- [ ] Borrow/Repay works
- [ ] Lock PAIMON works
- [ ] Mobile responsive design works

---

### 3. Performance Monitoring

**Use Lighthouse CI:**
```bash
npm install -g @lhci/cli
lhci autorun --url=https://paimon.dex/
```

**Core Web Vitals Targets:**
- LCP (Largest Contentful Paint): <2.5s ✅
- INP (Interaction to Next Paint): <200ms ✅
- CLS (Cumulative Layout Shift): <0.1 ✅

---

### 4. Error Monitoring

**Sentry Setup (Optional):**

1. Install Sentry:
   ```bash
   npm install @sentry/nextjs
   ```

2. Initialize:
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```

3. Configure `sentry.client.config.js`:
   ```javascript
   import * as Sentry from "@sentry/nextjs";
   
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
   });
   ```

---

## Rollback Procedure

### Vercel Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Confirm rollback

**CLI Rollback:**
```bash
vercel rollback [deployment-url]
```

---

### Docker Rollback

1. Find previous image:
   ```bash
   docker images | grep paimon-frontend
   ```

2. Stop current container:
   ```bash
   docker-compose down
   ```

3. Update `docker-compose.yml` with previous image tag

4. Restart:
   ```bash
   docker-compose up -d
   ```

---

## Monitoring & Alerts

### 1. Uptime Monitoring

**Recommended Tools:**
- UptimeRobot (free)
- Pingdom
- StatusCake

**Setup:**
- Monitor main URL: `https://paimon.dex/`
- Check interval: 5 minutes
- Alert via email/Slack

---

### 2. Performance Monitoring

**Google Analytics:**
```html
<!-- Add to app/layout.tsx -->
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
  strategy="afterInteractive"
/>
```

**Vercel Analytics:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

### 3. Error Tracking

**Sentry Alerts:**
- Critical errors → Slack notification
- High error rate → Email alert
- New error types → Weekly digest

---

## Staging Environment

### Purpose

- Test features before production
- QA testing
- Demo for stakeholders

### Setup

1. **Create staging branch:**
   ```bash
   git checkout -b staging
   ```

2. **Deploy to Vercel staging:**
   ```bash
   vercel --env=staging
   ```

3. **Configure staging variables** (use testnet addresses)

4. **Access staging URL:**
   - Automatic: `paimon-dex-staging.vercel.app`
   - Custom: `staging.paimon.dex`

---

## Security Best Practices

### 1. Environment Variables

- ❌ Never commit `.env` files to git
- ✅ Use secrets management (GitHub Secrets, Vercel Env Vars)
- ✅ Rotate API keys regularly

### 2. HTTPS

- ✅ Enforce HTTPS (automatic on Vercel)
- ✅ HSTS headers enabled
- ✅ Secure cookies (`secure: true`)

### 3. Dependency Security

**Regular audits:**
```bash
npm audit
npm audit fix
```

**Automated dependency updates:**
- Dependabot (GitHub)
- Renovate Bot

---

## Troubleshooting

### Build Failures

**Issue:** `npm run build` fails

**Debug:**
```bash
npm run build 2>&1 | tee build.log
# Check build.log for errors
```

**Common causes:**
- Missing environment variables
- TypeScript errors
- Out of memory (increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096`)

---

### Deployment Failures

**Issue:** Vercel deployment fails

**Debug:**
1. Check Vercel deployment logs
2. Verify environment variables set
3. Test build locally first

---

### Performance Issues

**Issue:** Slow page loads

**Debug:**
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

**Solutions:**
- Enable lazy loading
- Optimize images
- Use dynamic imports
- Enable compression

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-07 | Initial deployment guide |

---

**Note:** Update this guide whenever deployment process changes.
