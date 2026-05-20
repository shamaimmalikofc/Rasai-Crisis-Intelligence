# Setup script for Rasai (Crisis Intelligence Application)
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "📡 RASAI CRISIS INTELLIGENCE ARCHITECTURE SETUP" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Check for Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "✓ Found Node.js: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Node.js is not installed or not in system PATH." -ForegroundColor Red
    Exit
}

# 1. Installing Backend Dependencies
Write-Host "`n📦 Setting up Backend Component..." -ForegroundColor Yellow
cd backend
Write-Host "Installing packages (express, cors, dotenv, @google/generative-ai)..." -ForegroundColor DarkCyan
npm install
cd ..
Write-Host "✓ Backend component setup complete." -ForegroundColor Green

# 2. Installing Frontend Dependencies
Write-Host "`n📦 Setting up Frontend Component..." -ForegroundColor Yellow
cd frontend
Write-Host "Installing Expo & React Native dependencies..." -ForegroundColor DarkCyan
npm install
cd ..
Write-Host "✓ Frontend component setup complete." -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "🚀 RASAI DEPLOYMENT SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "To fire up the environment, run:" -ForegroundColor Yellow
Write-Host "  1. Start the Backend server:" -ForegroundColor White
Write-Host "     cd backend; npm run dev" -ForegroundColor White
Write-Host "  2. Start the Expo Web app dashboard:" -ForegroundColor White
Write-Host "     cd frontend; npm run web" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
