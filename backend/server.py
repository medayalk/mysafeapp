from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import stripe
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import base64
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Stripe setup
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class ProfileCreate(BaseModel):
    name: str
    profile_type: Literal["human", "pet"]
    # Date of Birth (preferred) - ISO format: YYYY-MM-DD
    date_of_birth: Optional[str] = None
    # Legacy age fields (kept for backward compat)
    age_value: Optional[int] = None
    age_unit: Optional[Literal["months", "years"]] = "years"
    biological_sex: Optional[Literal["male", "female", "other"]] = None
    is_pregnant_nursing: Optional[bool] = False
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    skin_type: Optional[Literal["normal", "dry", "oily", "combination", "sensitive"]] = None
    hair_type: Optional[Literal["straight", "wavy", "curly", "coily", "dry", "oily", "color-treated"]] = None
    medical_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    # Pet fields
    pet_type: Optional[Literal["dog", "cat", "bird", "exotic"]] = None
    pet_breed: Optional[str] = None
    fixed_status: Optional[Literal["neutered", "spayed", "intact"]] = None
    pet_medical_conditions: Optional[List[str]] = []

class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    profile_type: Literal["human", "pet"]
    date_of_birth: Optional[str] = None
    age_value: Optional[int] = None
    age_unit: Optional[Literal["months", "years"]] = "years"
    biological_sex: Optional[Literal["male", "female", "other"]] = None
    is_pregnant_nursing: Optional[bool] = False
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    skin_type: Optional[Literal["normal", "dry", "oily", "combination", "sensitive"]] = None
    hair_type: Optional[Literal["straight", "wavy", "curly", "coily", "dry", "oily", "color-treated"]] = None
    medical_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    pet_type: Optional[Literal["dog", "cat", "bird", "exotic"]] = None
    pet_breed: Optional[str] = None
    fixed_status: Optional[Literal["neutered", "spayed", "intact"]] = None
    pet_medical_conditions: Optional[List[str]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ScanCreate(BaseModel):
    profile_id: str
    image_base64: str
    comparison_mode: Optional[bool] = False
    compare_with_scan_id: Optional[str] = None

class Scan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    profile_id: str
    image_base64: str
    ocr_text: str
    category: Literal["food", "cosmetic", "unknown"]
    subcategory: Optional[str] = "unknown"  # food/beverage/snack/supplement/skin_care/hair_care/body_care/oral_care/makeup/fragrance/pet_food/pet_care/unknown
    score: float  # 0-10
    verdict: Literal["safe", "caution", "unhealthy", "danger"]
    flagged_ingredients: List[Dict[str, str]]
    safe_ingredients: List[str]
    ai_summary: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ComparisonResult(BaseModel):
    scan1: Scan
    scan2: Scan
    winner_scan_id: str
    comparison_summary: str

# ============= HELPER FUNCTIONS =============

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def calculate_age_in_months(age_value: int, age_unit: str) -> int:
    """Convert age to months for easier comparison"""
    if age_unit == "years":
        return age_value * 12
    return age_value

def calculate_age_months_from_dob(dob_str: Optional[str]) -> Optional[int]:
    """Calculate age in months from a YYYY-MM-DD DOB string"""
    if not dob_str:
        return None
    try:
        dob = datetime.fromisoformat(dob_str.split('T')[0])
        now = datetime.utcnow()
        months = (now.year - dob.year) * 12 + (now.month - dob.month)
        if now.day < dob.day:
            months -= 1
        return max(0, months)
    except Exception:
        return None

def get_age_category(age_months: int) -> str:
    """Determine age category for humans"""
    if age_months <= 12:
        return "baby"
    elif age_months <= 36:
        return "toddler"
    elif age_months <= 144:
        return "kid"
    else:
        return "adult"

async def ocr_with_gemini_vision(image_base64: str) -> tuple[str, bool, str, str]:
    """
    Use Gemini Vision (Flash for speed) to extract text + category + subcategory in ONE call.
    Returns: (extracted_text, is_clear, category, subcategory)
    """
    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ocr-{uuid.uuid4()}",
            system_message="""You are an OCR and product classification expert. From the image:
1. Extract ALL ingredient text exactly as shown.
2. Classify the product into category and subcategory.

Categories: food | cosmetic | unknown
Subcategories:
  - food: food, beverage, snack, supplement, pet_food
  - cosmetic: skin_care, hair_care, body_care, oral_care, makeup, fragrance, pet_care
  - unknown: unknown

Respond in this EXACT JSON format (no extra text):
{"text": "ingredients...", "category": "food|cosmetic|unknown", "subcategory": "..."}

If the image is too blurry or unclear to read ingredients confidently, respond with:
{"text": "UNCLEAR", "category": "unknown", "subcategory": "unknown"}"""
        )
        # Use Flash for speed (3-5x faster than Pro)
        chat.with_model("gemini", "gemini-3-flash-preview")
        
        msg = UserMessage(
            text="Extract ingredients and classify this product. Return JSON only.",
            file_contents=[ImageContent(image_base64)]
        )
        
        response = await chat.send_message(msg)
        
        # Parse JSON
        import json
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start < 0 or json_end <= json_start:
            return "", False, "unknown", "unknown"
        
        data = json.loads(response[json_start:json_end])
        text = data.get("text", "").strip()
        category = data.get("category", "unknown")
        subcategory = data.get("subcategory", "unknown")
        
        if text == "UNCLEAR" or len(text) < 10:
            return "", False, "unknown", "unknown"
        
        return text, True, category, subcategory
        
    except Exception as e:
        logging.error(f"OCR Error: {e}")
        return "", False, "unknown", "unknown"

def detect_category(ingredients_text: str) -> str:
    """Detect if product is food or cosmetic based on ingredients"""
    cosmetic_keywords = [
        "paraben", "sulfate", "silicone", "glycerin", "retinol", "salicylic acid",
        "dimethicone", "phthalate", "fragrance", "parfum", "tocopherol", "phenoxyethanol",
        "cetyl", "stearyl", "aqua", "water (and)", "cyclopentasiloxane"
    ]
    
    food_keywords = [
        "sugar", "salt", "sodium", "corn syrup", "wheat", "milk", "egg",
        "soy", "dextrose", "glucose", "fructose", "preservative", "artificial flavor",
        "citric acid", "vitamin", "protein", "carbohydrate"
    ]
    
    text_lower = ingredients_text.lower()
    
    cosmetic_count = sum(1 for kw in cosmetic_keywords if kw in text_lower)
    food_count = sum(1 for kw in food_keywords if kw in text_lower)
    
    if cosmetic_count > food_count:
        return "cosmetic"
    elif food_count > cosmetic_count:
        return "food"
    else:
        return "unknown"

async def score_with_ai(ingredients_text: str, category: str, profile: Dict) -> Dict[str, Any]:
    """
    Use Claude Sonnet to score ingredients based on profile
    """
    try:
        api_key = os.getenv("EMERGENT_LLM_KEY")
        
        # Build profile context
        profile_context = f"Profile Type: {profile['profile_type']}\n"
        
        if profile['profile_type'] == 'human':
            # Prefer DOB-based age calculation; fallback to age_value/age_unit
            age_months = calculate_age_months_from_dob(profile.get('date_of_birth'))
            if age_months is None:
                age_months = calculate_age_in_months(profile.get('age_value', 300), profile.get('age_unit', 'years'))
            age_category = get_age_category(age_months)
            profile_context += f"Age Category: {age_category} ({age_months} months)\n"
            profile_context += f"Sex: {profile.get('biological_sex', 'unknown')}\n"
            profile_context += f"Pregnant/Nursing: {profile.get('is_pregnant_nursing', False)}\n"
            profile_context += f"Skin Type: {profile.get('skin_type', 'unknown')}\n"
            profile_context += f"Hair Type: {profile.get('hair_type', 'unknown')}\n"
            profile_context += f"Medical Conditions: {', '.join(profile.get('medical_conditions', []))}\n"
            profile_context += f"Allergies: {', '.join(profile.get('allergies', []))}\n"
        else:  # pet
            # Compute pet age from DOB or fallback to age_value/unit
            pet_age_months = calculate_age_months_from_dob(profile.get('date_of_birth'))
            if pet_age_months is not None:
                age_display = f"{pet_age_months // 12} years {pet_age_months % 12} months"
            else:
                age_display = f"{profile.get('age_value', 0)} {profile.get('age_unit', 'years')}"
            profile_context += f"Pet Type: {profile.get('pet_type', 'unknown')}\n"
            if profile.get('pet_breed'):
                profile_context += f"Breed: {profile.get('pet_breed')}\n"
            profile_context += f"Age: {age_display}\n"
            profile_context += f"Weight: {profile.get('weight_kg', 0)} kg\n"
            profile_context += f"Fixed Status: {profile.get('fixed_status', 'unknown')}\n"
            profile_context += f"Medical Conditions: {', '.join(profile.get('pet_medical_conditions', []))}\n"
        
        system_prompt = """You are an expert ingredient safety analyzer. Analyze ingredients and provide:
1. Safety score (0-10, where 10 is safest)
2. List of flagged (dangerous/concerning) ingredients with reasons
3. List of safe ingredients
4. Brief safety summary

CRITICAL RULES:
- Baby (0-12 months): FAIL (score 0-2) for honey, harsh chemicals in cosmetics
- Toddler (1-3 years): Heavy penalty for artificial dyes, high sodium/sugar
- Pregnant/Nursing: FAIL for retinol, oxybenzone, high caffeine
- Pets: STRICT FAIL for xylitol, chocolate/theobromine, grapes, onions, garlic, toxic oils

Return JSON format:
{
  "score": float (0-10),
  "verdict": "safe" | "caution" | "unhealthy" | "danger",
  "flagged_ingredients": [{"name": "ingredient", "reason": "why dangerous"}],
  "safe_ingredients": ["ingredient1", "ingredient2"],
  "summary": "brief explanation"
}"""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"score-{uuid.uuid4()}",
            system_message=system_prompt
        )
        # Use Haiku for speed (3x faster than Sonnet) - scoring rules are simple enough
        chat.with_model("anthropic", "claude-haiku-4-5-20251001")
        
        prompt = f"""Analyze these {category} ingredients for this profile:

{profile_context}

Ingredients:
{ingredients_text}

Provide safety analysis in JSON format."""
        
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        
        # Parse JSON from response
        import json
        # Try to extract JSON from response
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            result = json.loads(response[json_start:json_end])
        else:
            # Fallback if JSON parsing fails
            result = {
                "score": 5.0,
                "verdict": "caution",
                "flagged_ingredients": [],
                "safe_ingredients": [],
                "summary": "Unable to analyze ingredients properly."
            }
        
        return result
        
    except Exception as e:
        logging.error(f"Scoring Error: {e}")
        return {
            "score": 5.0,
            "verdict": "caution",
            "flagged_ingredients": [],
            "safe_ingredients": [],
            "summary": f"Error analyzing ingredients: {str(e)}"
        }

# ============= ROUTES =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password,
        "subscription_status": "free",
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    # Create token
    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "subscription_status": "free"
        }
    }

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(
        data={"sub": user["id"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "subscription_status": user.get("subscription_status", "free")
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "subscription_status": current_user.get("subscription_status", "free")
    }

@api_router.post("/profiles", response_model=Profile)
async def create_profile(profile_data: ProfileCreate, current_user: dict = Depends(get_current_user)):
    # All features unlocked - freemium gates removed
    profile = Profile(
        user_id=current_user["id"],
        **profile_data.dict()
    )
    
    await db.profiles.insert_one(profile.dict())
    return profile

@api_router.get("/profiles", response_model=List[Profile])
async def get_profiles(current_user: dict = Depends(get_current_user)):
    profiles = await db.profiles.find({"user_id": current_user["id"]}).to_list(100)
    return [Profile(**p) for p in profiles]

@api_router.get("/profiles/{profile_id}", response_model=Profile)
async def get_profile(profile_id: str, current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"id": profile_id, "user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**profile)

@api_router.post("/scan", response_model=Scan)
async def create_scan(scan_data: ScanCreate, current_user: dict = Depends(get_current_user)):
    # Get profile
    profile = await db.profiles.find_one({"id": scan_data.profile_id, "user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Perform OCR + category detection in single Gemini Flash call (fast)
    ocr_text, is_clear, category, subcategory = await ocr_with_gemini_vision(scan_data.image_base64)
    
    if not is_clear or not ocr_text:
        raise HTTPException(
            status_code=400,
            detail="Image unclear. Please ensure the ingredients are in focus and scan again."
        )
    
    # Score with AI
    scoring_result = await score_with_ai(ocr_text, category, profile)
    
    # Create scan
    scan = Scan(
        user_id=current_user["id"],
        profile_id=scan_data.profile_id,
        image_base64=scan_data.image_base64,
        ocr_text=ocr_text,
        category=category if category in ("food", "cosmetic", "unknown") else "unknown",
        subcategory=subcategory,
        score=scoring_result["score"],
        verdict=scoring_result["verdict"],
        flagged_ingredients=scoring_result["flagged_ingredients"],
        safe_ingredients=scoring_result["safe_ingredients"],
        ai_summary=scoring_result["summary"]
    )
    
    await db.scans.insert_one(scan.dict())
    return scan

@api_router.get("/scans", response_model=List[Scan])
async def get_scans(
    profile_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if profile_id:
        query["profile_id"] = profile_id
    
    scans = await db.scans.find(query).sort("created_at", -1).to_list(100)
    return [Scan(**s) for s in scans]

@api_router.get("/scans/{scan_id}", response_model=Scan)
async def get_scan(scan_id: str, current_user: dict = Depends(get_current_user)):
    scan = await db.scans.find_one({"id": scan_id, "user_id": current_user["id"]})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return Scan(**scan)

@api_router.post("/compare", response_model=ComparisonResult)
async def compare_scans(scan1_id: str, scan2_id: str, current_user: dict = Depends(get_current_user)):
    # Comparison is now FREE for everyone
    # Get both scans
    scan1 = await db.scans.find_one({"id": scan1_id, "user_id": current_user["id"]})
    scan2 = await db.scans.find_one({"id": scan2_id, "user_id": current_user["id"]})
    
    if not scan1 or not scan2:
        raise HTTPException(status_code=404, detail="One or both scans not found")
    
    scan1_obj = Scan(**scan1)
    scan2_obj = Scan(**scan2)
    
    # Determine winner
    winner_id = scan1_id if scan1_obj.score > scan2_obj.score else scan2_id
    
    # Generate comparison summary with AI
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=api_key,
        session_id=f"compare-{uuid.uuid4()}",
        system_message="You are a product safety comparison expert. Provide brief, clear explanations."
    )
    chat.with_model("anthropic", "claude-sonnet-4-6")
    
    prompt = f"""Compare these two products and explain why one is safer:

Product 1: Score {scan1_obj.score}/10 - {scan1_obj.verdict}
Flagged: {', '.join([f['name'] for f in scan1_obj.flagged_ingredients])}

Product 2: Score {scan2_obj.score}/10 - {scan2_obj.verdict}
Flagged: {', '.join([f['name'] for f in scan2_obj.flagged_ingredients])}

Provide ONE sentence explaining which is safer and why."""
    
    msg = UserMessage(text=prompt)
    comparison_summary = await chat.send_message(msg)
    
    return ComparisonResult(
        scan1=scan1_obj,
        scan2=scan2_obj,
        winner_scan_id=winner_id,
        comparison_summary=comparison_summary
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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
