#!/bin/bash
# ============================================================
# One-command startup for the Internal Audit System
# Run from the project root: bash start.sh
# ============================================================

set -e

echo ""
echo "Internal Audit System - Starting up"
echo "========================================"

# Check Python
if ! command -v python3.11 &>/dev/null; then
    echo "Python 3.11 not found. Please install Python 3.11 and rerun this script."
    exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
    echo "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Setup backend
echo ""
echo "Setting up backend..."
cd backend

if [ ! -d ".venv" ]; then
    echo "   Creating virtual environment..."
    python3.11 -m venv .venv
fi

source .venv/bin/activate

echo "   Installing Python dependencies..."
pip install -q -r requirements.txt

# Copy .env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   Created .env from example - please add your API keys."
fi

# Seed admin users
echo "   Seeding admin users..."
python scripts/seed_admin.py

# Seed knowledge base
echo "   Seeding knowledge base..."
python scripts/seed_knowledge_base.py

# Start backend in background
echo "   Starting backend on port 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

cd ..

# Setup frontend
echo ""
echo "Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "   Installing Node dependencies (this may take a minute)..."
    npm install
fi

echo "   Starting frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "========================================"
echo "System is running"
echo ""
echo "  Frontend:  http://localhost:5173"
echo "  API:       http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "  Login:  admin@company.com / admin123"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================"

# Wait and cleanup on exit
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
