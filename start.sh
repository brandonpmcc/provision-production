#!/bin/bash
# ProVision Production — First-time setup & launch
# Run this from inside the provision-app folder

set -e

ENV_FILE=".env.local"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ProVision Production — First-time Setup ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check if Google secret is already set
if grep -q "GOOGLE_CLIENT_SECRET=." "$ENV_FILE" 2>/dev/null; then
  echo "✅ Google OAuth already configured — starting app..."
  echo ""
  npm run dev
  exit 0
fi

echo "One thing needed: your Google OAuth Client Secret."
echo ""
echo "In Chrome, open the Google Cloud Console tab and:"
echo "  1. Scroll to 'Client secrets'"
echo "  2. Find 'Client secret NEW  ****gFmf'"
echo "  3. Click the copy icon (⧉) next to it"
echo ""
read -s -p "Paste your Client Secret here (it won't show for security): " GOOGLE_SECRET
echo ""

if [ -z "$GOOGLE_SECRET" ]; then
  echo "❌ No secret entered. Please run this script again."
  exit 1
fi

# Write secret into .env.local
sed -i '' "s|GOOGLE_CLIENT_SECRET=|GOOGLE_CLIENT_SECRET=${GOOGLE_SECRET}|" "$ENV_FILE"

echo ""
echo "✅ Secret saved!"
echo ""
echo "Installing dependencies..."
npm install --silent

echo ""
echo "🚀 Starting ProVision Production..."
echo "   Open http://localhost:3000 in Chrome"
echo "   Press Ctrl+C to stop"
echo ""
npm run dev
