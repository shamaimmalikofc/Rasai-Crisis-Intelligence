#!/bin/bash
# Setup script for Rasai (Crisis Intelligence Application)
echo "========================================================"
echo -e "\033[36m📡 RASAI CRISIS INTELLIGENCE ARCHITECTURE SETUP\033[0m"
echo "========================================================"

# Check for Node.js
if command -v node >/dev/null 2>&1; then
    nodeVer=$(node -v)
    echo -e "\033[32m✓ Found Node.js: $nodeVer\033[0m"
else
    echo -e "\033[31m❌ Error: Node.js is not installed or not in system PATH.\033[0m"
    exit 1
fi

# 1. Installing Backend Dependencies
echo -e "\n\033[33m📦 Setting up Backend Component...\033[0m"
cd backend
echo "Installing packages (express, cors, dotenv, @google/generative-ai)..."
npm install
cd ..
echo -e "\033[32m✓ Backend component setup complete.\033[0m"

# 2. Installing Frontend Dependencies
echo -e "\n\033[33m📦 Setting up Frontend Component...\033[0m"
cd frontend
echo "Installing Expo & React Native dependencies..."
npm install
cd ..
echo -e "\033[32m✓ Frontend component setup complete.\033[0m"

echo "========================================================"
echo -e "\033[32m🚀 RASAI DEPLOYMENT SETUP COMPLETED SUCCESSFULLY!\033[0m"
echo "========================================================"
echo -e "\033[33mTo fire up the environment, run:\033[0m"
echo -e "  1. Start the Backend server:"
echo -e "     cd backend && npm run dev"
echo -e "  2. Start the Expo Web app dashboard:"
echo -e "     cd frontend && npm run web"
echo "========================================================"
