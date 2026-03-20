# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from app.core.config import settings
# from app.core.database import create_tables
# from app.api import auth, hr, it, query

# app = FastAPI(
#     title=settings.APP_NAME,
#     version="1.0.0",
#     description="Internal Audit & Knowledge Management System",
#     docs_url="/docs",
#     redoc_url="/redoc"
# )

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=settings.origins_list,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(auth.router)
# app.include_router(hr.router)
# app.include_router(it.router)
# app.include_router(query.router)


# @app.on_event("startup")
# async def startup():
#     create_tables()
#     print(f"✅ {settings.APP_NAME} started")
#     print(f"📚 API docs: http://localhost:8000/docs")


# @app.get("/")
# def root():
#     return {"message": f"{settings.APP_NAME} is running", "docs": "/docs"}


# @app.get("/health")
# def health():
#     return {"status": "ok"}


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import create_tables
from app.api import auth, hr, it, query, knowledge

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Internal Audit & Knowledge Management System",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(hr.router)
app.include_router(it.router)
app.include_router(query.router)
app.include_router(knowledge.router)


@app.on_event("startup")
async def startup():
    create_tables()
    print(f"✅ {settings.APP_NAME} started")
    print(f"📚 API docs: http://localhost:8000/docs")


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
