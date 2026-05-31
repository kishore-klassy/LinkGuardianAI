import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import links, youtube, payments, plans, users
from app.logging_config import setup_logging, logger

setup_logging()

from contextlib import asynccontextmanager
from app.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()

app = FastAPI(
    title="ExpireLinkX API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Change this block in your app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://linkguardianai.vercel.app",  # Your original Vercel URL
        "https://linkguardian.cuvisoft.in",   # Your new professional domain
        "http://localhost:3000",              # Keep this if you test your frontend locally
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    body = None
    if request.method in ("POST", "PUT", "PATCH"):
        try:
            body = await request.json()
        except Exception:
            body = None

    logger.log_request(request.method, request.url.path, body)

    try:
        response = await call_next(request)
        duration = (time.perf_counter() - start) * 1000
        logger.log_response(request.method, request.url.path, response.status_code, duration)
        return response
    except Exception as e:
        duration = (time.perf_counter() - start) * 1000
        logger.log_error(request.method, request.url.path, str(e))
        raise


app.include_router(links.router)
app.include_router(youtube.router)
app.include_router(payments.router)
app.include_router(plans.router)
app.include_router(users.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/")
async def api_root():
    return {
        "app": "ExpireLinkX API",
        "version": "1.0.0",
        "endpoints": [
            "/health",
            "/api/plans",
            "/api/check-links",
            "/api/check-youtube-channel",
            "/api/payments/create-order",
            "/api/payments/verify",
            "/docs",
            "/redoc",
        ],
    }
