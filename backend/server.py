from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ── SEO Sitemap regeneration ────────────────────────────────────────────────
# Called by the admin dashboard whenever a property, day trip, or destination
# is created / updated / deleted. Regenerates all sitemap XML files + robots.txt.
from fastapi import BackgroundTasks
from fastapi.responses import FileResponse, PlainTextResponse

try:
    from generate_sitemap import run as _run_sitemap, PUBLIC_DIR as _SITEMAP_PUBLIC_DIR
except Exception as _e:  # noqa: BLE001
    _run_sitemap = None
    _SITEMAP_PUBLIC_DIR = None
    logging.getLogger(__name__).warning("Sitemap generator not importable: %s", _e)


@api_router.post("/seo/regenerate-sitemap")
async def regenerate_sitemap(background_tasks: BackgroundTasks):
    """Regenerate sitemap XML files + robots.txt from Supabase data."""
    if _run_sitemap is None:
        return {"ok": False, "error": "Sitemap generator unavailable"}
    result = _run_sitemap()
    return result


@api_router.get("/seo/sitemap-status")
async def sitemap_status():
    """Report current sitemap files (mtime + size) for admin dashboards."""
    if _SITEMAP_PUBLIC_DIR is None:
        return {"ok": False, "error": "Sitemap directory unavailable"}
    files = {}
    for name in ("sitemap.xml", "sitemap-core.xml", "sitemap-properties.xml",
                 "sitemap-destinations.xml", "sitemap-daytrips.xml",
                 "sitemap-images.xml", "robots.txt"):
        f = _SITEMAP_PUBLIC_DIR / name
        if f.exists():
            files[name] = {
                "size": f.stat().st_size,
                "modified": datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).isoformat(),
            }
    return {"ok": True, "files": files}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()