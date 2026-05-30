# MySafe - AI-Powered Ingredient Scanner

## Product Overview
MySafe is a mobile-first ingredient safety scanner that uses AI to analyze food and cosmetic products against personalized health profiles for humans (including babies, toddlers, kids, pregnant/nursing) and pets (dogs, cats, birds, exotic).

## Tech Stack
- **Frontend**: Expo (React Native) with expo-router
- **Backend**: FastAPI + MongoDB
- **AI Services**: 
  - Google Gemini Vision (`gemini-3.1-pro-preview`) for OCR/ingredient text extraction
  - Claude Sonnet (`claude-sonnet-4-6`) for AI scoring and comparison summaries
- **Payments**: Stripe (test mode keys placeholder)
- **Auth**: JWT-based email/password authentication
- **Storage**: Base64 images stored in MongoDB

## Features Implemented

### Authentication
- Email/password registration & login
- JWT token-based session management
- Persistent login via AsyncStorage

### Profiles (Smart Profiles)
- **Human Profile**: Name, Age (months/years), Biological Sex (Male/Female/Other), Pregnant/Nursing toggle (when female), Height, Weight, Skin Type, Hair Type, Medical Conditions, Allergies
- **Pet Profile**: Name, Pet Type (Dog/Cat/Bird/Exotic), Age, Weight, Fixed Status, Medical Conditions
- Active profile switcher
- Free tier: 1 human profile only
- Premium tier: Unlimited profiles + pets

### AI Scoring Engine (Smart Human Protocols)
- **Baby (0-12 months)**: Instant fail for honey, harsh cosmetic chemicals
- **Toddler (1-3 years)**: Heavy penalty for artificial dyes, high sodium/sugar
- **Kid (4-12 years)**: Fail high caffeine, taurine, guarana
- **Pregnant/Nursing**: Fail retinol/retinoids, oxybenzone, raw ingredients
- **Adult Cosmetics**: Two-tier scoring (base toxicity + skin/hair personalization)

### AI Scoring Engine (Strict Pet Protocol)
- **Lethal List**: Instant fail for xylitol, theobromine, alliums, grapes, macadamia nuts
- **Toxic Preservatives**: BHA, BHT, Ethoxyquin penalties
- **Pet Cosmetics**: Tea tree, eucalyptus, citrus oils flagged
- **Species-Specific**: Different rules for cats vs dogs

### Scanner & OCR
- Camera-based scanning with expo-camera
- Gemini Vision OCR
- **Critical Safety**: Returns "Image unclear" error (HTTP 400) when image is blurry/unreadable - NEVER defaults to 10/10

### History & Filtering
- Profile-specific history filtering
- Category filter (All/Food/Cosmetic)
- Recent scans on home screen

### Monetization (Freemium)
- Free Tier: 1 human profile, food scanning only
- Premium Tier ($4.99/mo): Unlimited profiles, pets, cosmetics, comparison
- Stripe integration ready (test keys placeholder)

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Current user info

### Profiles
- `POST /api/profiles` - Create profile
- `GET /api/profiles` - List profiles
- `GET /api/profiles/{id}` - Get specific profile

### Scans
- `POST /api/scan` - Submit image for AI analysis
- `GET /api/scans?profile_id={id}` - List scans (filtered)
- `GET /api/scans/{id}` - Get specific scan
- `POST /api/compare?scan1_id={id1}&scan2_id={id2}` - Compare 2 products

## Database Models (MongoDB)

### users
- id, email, name, password (hashed), subscription_status, created_at

### profiles
- id, user_id, name, profile_type, age fields, medical conditions, etc.

### scans
- id, user_id, profile_id, image_base64, ocr_text, category, score, verdict, flagged_ingredients, safe_ingredients, ai_summary, created_at

## Test Results
- Backend: 21/21 tests passed (100%)
- All AI integrations verified working
- "Image unclear" safety check confirmed
- Free tier limits enforced correctly
