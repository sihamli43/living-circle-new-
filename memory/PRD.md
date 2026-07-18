# Living Circle — PRD

## Tagline
"Find your people, find your place" — Tinder-style roommate finder for the Indian market.

## Tech Stack
- **Frontend**: Expo SDK 54 (React Native), Expo Router (file-based), react-native-reanimated + gesture-handler for swipe, expo-linear-gradient, @expo/vector-icons (Ionicons), AsyncStorage via `@/src/utils/storage`.
- **Backend**: FastAPI + Motor (MongoDB).
- **No 3rd party integrations** — Mock OTP, base64 photos, polling chat.

## Color & Theme
- Teal primary `#0A878A` + coral accent `#F26D5B` on a warm cream surface `#FDFBF7`.
- Tactile / Playful LIGHT personality per `/app/design_guidelines.json`.
- Rounded cards, soft shadows, pill chips, gradient initials avatars.

## Core Features
1. **Auth**: phone + mock OTP (always `1234`).
2. **Onboarding wizard** (3–4 steps): profile basics → details (budget, localities, move-in, listing type) → lifestyle (7-step questionnaire) → optional listing form for "I have a place".
3. **Discover (swipe)**: full-screen Tinder-style cards with reanimated gestures, compatibility badge, like/pass haptics, filters (budget, locality, food, gender, listing type), empty state.
4. **Matches tab**: 2-column grid of mutual matches with compatibility + shared prefs.
5. **Messages tab**: chat list with last message previews.
6. **Chat screen**: in-app polling (3.5s) text chat, header shows compatibility, block/report menu.
7. **Profile**: gradient cover banner, large avatar, lifestyle/about sections, edit shortcuts, logout.

## Compatibility Score
Weighted match of lifestyle answers:
- food 20, smoking 15, drinking 10, sleep 15, cleanliness 20, guests 10, pets 10.

## Seed Data
18 sample profiles with Indian names across Bangalore/Mumbai/Delhi/Pune/Hyderabad localities, varied lifestyle answers, mix of "has place" + "looking" types.

## API (all under `/api`)
- `POST /auth/send-otp`, `POST /auth/verify-otp`
- `GET/PUT /profiles/me`, `GET /profiles/discover`, `GET /profiles/{id}`
- `POST /swipes`, `GET /matches`
- `GET /messages/{match_id}`, `POST /messages/{match_id}`
- `POST /users/{id}/block`, `POST /users/{id}/report`

## Smart Business Enhancement Ideas (future)
- Boost / Super-Like for ₹49 (paid signal of stronger interest).
- Verified-tenant badge with KYC for higher trust & higher conversion.
- "Move-in date" alerts to nudge listing owners 30 days before to refresh.

## Auth
Mock OTP (1234) — see `/app/memory/test_credentials.md`.
