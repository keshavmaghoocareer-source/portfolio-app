# Portfolio Management System

A full-featured investment portfolio management system with 8 modules.

## Modules
- Dashboard (AUM overview)
- Client Management
- Portfolio Tracking & Aggregation
- Transaction Management
- Performance Measurement (TWR, volatility, Sharpe, Sortino, drawdown)
- Risk Analytics (VaR, concentration risk)
- Asset Allocation & Rebalancing
- Factor Analysis (geography, sector, asset class)
- Alternative Assets (PE, VC, Hedge Funds)
- Team Management

## Default Login
- Username: `admin`
- Password: `admin123`
**Change this immediately after first login.**

## Deploy to Railway (Recommended)

1. Go to https://github.com and create a free account if you don't have one
2. Create a new repository called `portfolio-app`
3. Upload all these files to the repository
4. Go to https://railway.app and sign up with your GitHub account
5. Click "New Project" → "Deploy from GitHub repo"
6. Select your `portfolio-app` repository
7. Railway will automatically detect and deploy the app
8. Your app will be live at a URL like `https://portfolio-app-production.up.railway.app`

## Run Locally
```bash
npm install
node server.js
```
Then open http://localhost:3000

## Environment Variables (for production)
- `SESSION_SECRET` — Set to a long random string for security
- `PORT` — Automatically set by Railway
