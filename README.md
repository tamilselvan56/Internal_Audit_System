# Internal Audit & Knowledge System
## Complete Setup Guide — Every Command You Need

---

## 1. Prerequisites — Install These First

```bash
# Check Python version (use Python 3.11)
python3 --version

# Check Node.js version (need 18+)
node --version
npm --version

# Install Python 3.11 (Ubuntu/Debian)
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install Node.js 18 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Note: the backend dependencies in this repo are pinned to versions that target Python 3.11. Python 3.14 is too new for some packages here, including `pydantic-core==2.18.2`, so `pip install -r requirements.txt` can fail on Windows while trying to build from source.

---

## 2. Clone / Create Project Folder

```bash
mkdir audit-system
cd audit-system
```

---

## 3. Backend Setup (FastAPI + Python)

```bash
# Go to backend folder
cd backend

# Create virtual environment with Python 3.11
python3.11 -m venv .venv

# Activate virtual environment
source .venv/bin/activate         # Linux/Mac
# .venv\Scripts\activate          # Windows

# Upgrade pip
pip install --upgrade pip

# Install all backend dependencies
pip install fastapi==0.111.0
pip install uvicorn[standard]==0.29.0
pip install sqlalchemy==2.0.30
pip install alembic==1.13.1
pip install psycopg2-binary==2.9.9
pip install python-dotenv==1.0.1
pip install pydantic==2.7.1
pip install pydantic-settings==2.2.1
pip install python-jose[cryptography]==3.3.0
pip install passlib[bcrypt]==1.7.4
pip install python-multipart==0.0.9
pip install langchain==0.2.1
pip install langchain-community==0.2.1
pip install langchain-openai==0.1.7
pip install langchain-anthropic==0.1.13
pip install chromadb==0.5.0
pip install sentence-transformers==2.7.0
pip install pypdf==4.2.0
pip install reportlab==4.2.0
pip install openpyxl==3.1.2
pip install httpx==0.27.0
pip install aiofiles==23.2.1

# Save dependencies
pip freeze > requirements.txt
```

Windows example if multiple Python versions are installed:

```powershell
cd backend
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Database Setup

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Inside psql — run these commands:
CREATE DATABASE audit_db;
CREATE USER audit_user WITH PASSWORD 'audit_pass_2024';
GRANT ALL PRIVILEGES ON DATABASE audit_db TO audit_user;
\q

# Run database migrations
cd backend
alembic init alembic
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

---

## 5. Environment Variables

```bash
# Create .env file in backend/
cp .env.example .env
# Then edit .env with your values (see .env.example)
```

---

## 6. Frontend Setup (React)

```bash
# From project root
cd frontend

# Install Node dependencies
npm install

# If you get permission errors:
npm install --legacy-peer-deps

# Start development server
npm run dev
```

---

## 7. Run the Full Project

```bash
# Terminal 1 — Start backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Start frontend
cd frontend
npm run dev

# Terminal 3 — Seed knowledge base (run once)
cd backend
source venv/bin/activate
python scripts/seed_knowledge_base.py
```

---

## 8. Access the Application

```
Frontend:      http://localhost:5173
Backend API:   http://localhost:8000
API Docs:      http://localhost:8000/docs
```

---

## 9. Useful Commands

```bash
# Check running servers
lsof -i :8000
lsof -i :5173

# Kill port if already in use
kill -9 $(lsof -t -i:8000)

# View database tables
sudo -u postgres psql -d audit_db -c "\dt"

# Reset database
alembic downgrade base
alembic upgrade head

# Deactivate Python venv
deactivate
```
