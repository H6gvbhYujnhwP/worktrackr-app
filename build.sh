#!/bin/bash
set -e

echo "🔧 Installing dependencies..."
npm install

echo "🎨 Building React client..."
cd web/client
npm install
npm run build
cd ../..

echo "✅ Build complete!"
