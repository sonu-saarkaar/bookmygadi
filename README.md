# 🚗 BookMyGaadi — Ride Booking Platform

> **A full-stack, production-grade ride-booking system** inspired by Uber/Ola.  
> Built as a **monorepo** with a React web app (user + rider), a FastAPI backend, and a native Android app.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Maps Integration](#-maps-integration)
- [Project Structure](#-project-structure)
- [Backend (FastAPI)](#-backend-fastapi)
- [Frontend (React + Vite)](#-frontend-react--vite)
- [Android App](#-android-app)
- [Database Models](#-database-models)
- [API Endpoints](#-api-endpoints)
- [Services Offered](#-services-offered)
- [Real-Time Features](#-real-time-features)
- [Admin Panel](#-admin-panel)
- [Environment Variables](#-environment-variables)
- [Running the Project](#-running-the-project)
- [Demo Credentials](#-demo-credentials)

---

## 🌐 Project Overview

**BookMyGaadi** is a complete ride-booking ecosystem with three distinct portals:

| Portal | Technology | Purpose |
|---|---|---|
| **User App** (Web) | React + Vite | Customers book rides, track drivers, negotiate fares |
| **Rider App** (Web) | React + Vite | Drivers receive/accept requests, navigate, update status |
| **Admin Panel** (Web) | React + Vite | Admins manage users, rides, pricing, vehicles |
| **Android App** (User) | Kotlin + Jetpack Compose | Native mobile app for customers |
| **Android App** (Rider) | Kotlin + WebView | Driver app wrapping the Rider web portal |
| **Backend API** | Python + FastAPI | Central API serving all frontends |

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Core language |
| **FastAPI** | 0.116.1 | REST API + WebSocket server |
| **SQLAlchemy** | 2.0.43 | ORM for database management |
| **SQLite / PostgreSQL** | (default) | Local dev / Production-ready |
| **Redis** | Opt-in | High-frequency location caching & task queuing |
| **httpx** | latest | Async HTTP client (for FCM push) |
| **razorpay** | latest | Payment gateway integration |
| **Pydantic** | 2.11.7 | Data validation & schemas |
| **WebSocket** | (FastAPI) | Single-connection real-time ride tracking |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18+ | UI framework |
| **Vite** | 5+ | Build tool & dev server |
| **TypeScript** | 5+ | Type-safe JavaScript |
| **React Router** | v6 | SPA routing for user, rider, admin |
| **Tailwind CSS** | 3+ | Utility-first styling |

### Android App (User & Rider)
| Feature | Implementation | Purpose |
|---|---|---|
| **Real-Time Tracking** | WebSockets (OkHttp) | Smooth, sub-second marker movement |
| **Background Location**| Foreground Service | Persistent tracking even when app is minimized |
| **Push Notifications** | FCM (Firebase) | Critical life-cycle alerts (Arriving, Started, etc) |
| **Payments** | Razorpay SDK | Secure UPI, Card, and Netbanking payments |
| **Map Engine** | Google Maps SDK | Polylines, ETA calculation, and Zoom-fitting |

---

## 🗺 Maps Integration

> **Two mapping systems are used side-by-side in this project.**

### 1. 🟢 MapLibre GL JS (Primary — LiveMap)
Used in: `frontend/src/components/LiveMap.tsx`

- **Engine**: Free, open-source vector map renderer
- **Tile Source**: CartoCDN Voyager (`basemaps.cartocdn.com`)
- **Route Source**: OSRM Open-Source Routing (`router.project-osrm.org`) — **no API key needed**
- **Used For**: Ride tracking map on both User and Rider confirmation pages
- **Features**:
  - Animated car marker (SVG top-down view, heading-aware rotation)
  - Live route polyline (black with white border)
  - Pickup dot + destination dot markers
  - Nearby driver radius circle overlay
  - Smooth driver position animation using `requestAnimationFrame`
  - Auto-follow mode (follows driver or pickup)
  - User interaction pause (panning/zooming pauses auto-follow for 8s)

### 2. 🔵 Google Maps JavaScript API (Secondary)
Used in:
- `frontend/src/components/map/NegotiationGoogleMap.tsx` → Home page fare negotiation overlay
- `frontend/src/components/map/LiveRadiusMap.tsx` → Nearby-driver radar circle

**API Key required** → `VITE_GOOGLE_MAPS_API_KEY` in `.env`

- **Features**:
  - DirectionsRenderer (auto-draws colored route)
  - CircleF (search radius highlight)
  - MarkerF (user location pulse dot + driver SVG cars)
  - Custom SVG car icon with heading rotation

### 3. 🔴 Google Maps Android SDK (Native App)
Used in: `android/app-user/src/main/java/com/bookmygadi/user/`

- **Library**: `maps-compose` (Jetpack Compose wrapper for Google Maps Android SDK)
- **Key**: Stored in `android/local.properties` as `MAPS_API_KEY`
- **Features**:
  - `GoogleMap` composable with `MapProperties` + `MapUiSettings`
  - `Marker` composables for Driver, Pickup, and Drop points
  - `Polyline` composable for route drawing (decoded from Google Directions API)
  - `FusedLocationProviderClient` for real device GPS (high-accuracy)
  - `CameraUpdateFactory.newLatLngBounds` → smart viewport fitting both markers
  - `PolylineUtils.decodePoly()` → decodes Google Directions API encoded polyline string
  - Live location polling every 3 seconds (driver location fetched from backend)
  - Google Directions API: `https://maps.googleapis.com/maps/api/directions/json`

---

## 📁 Project Structure

```
bookmygadi-main/
├── backend/                     # FastAPI Python backend
│   ├── app/
│   │   ├── main.py              # App entry, middleware, routers, seed data
│   │   ├── models.py            # All SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── db.py                # SQLAlchemy engine + session
│   │   ├── api/
│   │   │   ├── auth.py          # JWT login/register
│   │   │   ├── rides.py         # Customer ride booking flow
│   │   │   ├── rider.py         # Driver ride management
│   │   │   ├── pricing.py       # Dynamic fare engine
│   │   │   ├── radar.py         # Nearby driver radar (mock GPS orbit)
│   │   │   ├── services.py      # Service metadata CRUD
│   │   │   ├── vehicles.py      # Vehicle inventory
│   │   │   ├── admin.py         # Admin panel APIs
│   │   │   ├── realtime.py      # WebSocket ConnectionManager
│   │   │   └── deps.py          # Auth dependency injection
│   │   ├── admin_panel/         # Legacy admin panel router
│   │   └── core/
│   │       ├── config.py        # Settings from .env
│   │       └── security.py      # JWT + hashing utilities
│   ├── requirements.txt
│   └── bookmygadi.db            # SQLite database file
│
├── frontend/                    # React + Vite web application
│   ├── src/
│   │   ├── App.tsx              # Routes (user, rider, admin)
│   │   ├── pages/app/           # Customer-facing pages
│   │   │   ├── HomePage.tsx         # Map + booking + radar
│   │   │   ├── BookingConfirmedPage.tsx  # Live tracking
│   │   │   ├── SearchingPage.tsx         # Waiting for driver
│   │   │   ├── TrackPage.tsx             # Active ride tracking
│   │   │   ├── ServicesPage.tsx          # Available services
│   │   │   ├── HistoryPage.tsx           # Past rides
│   │   │   ├── ProfilePage.tsx           # User profile
│   │   │   └── UserPaymentPage.tsx       # Payment flow
│   │   ├── rider_app/           # Rider-facing pages
│   │   │   ├── RiderHomePage.tsx         # Incoming requests
│   │   │   ├── RiderRideDetailsPage.tsx  # Live map + actions
│   │   │   ├── RiderTrackPage.tsx        # Active ride view
│   │   │   ├── RiderEarningPage.tsx      # Earnings dashboard
│   │   │   ├── RiderSchedulePage.tsx     # Advance bookings
│   │   │   └── RiderProfilePage.tsx      # Rider profile & vehicle
│   │   ├── admin_v2/            # New Admin Panel (V2)
│   │   ├── components/
│   │   │   ├── LiveMap.tsx          # MapLibre-based live map
│   │   │   ├── map/
│   │   │   │   ├── NegotiationGoogleMap.tsx  # Google Maps radar map
│   │   │   │   └── LiveRadiusMap.tsx          # Google radius overlay
│   │   │   └── layout/
│   │   │       └── AppShell.tsx     # Bottom nav shell for users
│   │   └── services/
│   │       ├── backendApi.ts    # Customer API client (Fetch)
│   │       └── riderApi.ts      # Rider API client (Fetch)
│
└── android/                     # Native Android apps (Kotlin)
    ├── app-user/                # Customer native app
    │   └── src/main/java/com/bookmygadi/user/
    │       ├── MainActivity.kt          # Compose entry point
    │       ├── UserRideViewModel.kt     # Live tracking ViewModel
    │       ├── UserRideMapScreen.kt     # Google Map composable
    │       ├── UserNavGraph.kt          # Navigation graph
    │       ├── WebAppScreen.kt          # WebView wrapper
    │       ├── fcm/
    │       │   └── BMGFirebaseMessagingService.kt  # FCM push
    │       └── ui/tracking/
    │           └── DriverTrackingScreen.kt  # Full tracking screen
    ├── app-rider/               # Driver native app (WebView-based)
    │   └── src/main/java/com/bookmygadi/rider/
    │       └── MainActivity.kt          # WebView + GPS bridge
    ├── core-network/            # Shared Retrofit + API definitions
    │   └── src/main/java/com/bookmygadi/core/network/
    │       ├── BookMyGadiApi.kt         # All API endpoints
    │       ├── NetworkModule.kt         # Hilt Retrofit module
    │       ├── RideEngineImpl.kt        # Ride state machine impl
    │       └── WebSocketManager.kt      # WS client
    └── core-domain/             # Business logic interfaces
        └── src/main/java/com/bookmygadi/core/domain/
            ├── LocationEngine.kt        # Location abstraction
            ├── RideEngine.kt            # Ride flow interface
            ├── RideState.kt             # Ride state model
            └── PolylineUtils.kt         # Google polyline decoder
```

---

## ⚙ Backend (FastAPI)

### Architecture
- **REST API** with JWT Bearer token authentication
- **WebSocket** endpoint for real-time ride event broadcasting
- **SQLite** with SQLAlchemy ORM (Alembic-free, uses runtime migrations)
- **CORS** enabled for local + LAN development

### Key Modules

| Module | Prefix | Description |
|---|---|---|
| `auth.py` | `/api/v1/auth` | Register, Login, JWT token management |
| `rides.py` | `/api/v1/rides` | Customer: create ride, get status, history |
| `rider.py` | `/api/v1/rider` | Driver: list requests, accept/reject, status updates, location push |
| `pricing.py` | `/api/v1/pricing` | Dynamic fare calculator based on route rules |
| `radar.py` | `/api/v1/radar` | Simulated nearby-driver finder (Haversine-based) |
| `services.py` | `/api/v1/services` | Service catalog (Instant Ride / Reserved) |
| `vehicles.py` | `/api/v1/vehicles` | Vehicle inventory management |
| `admin.py` | `/api/v1/admin` | User management, audit logs, support tickets |
| `realtime.py` | `/ws/rides/{ride_id}` | WebSocket for live ride event push |

### Authentication
- **JWT** (`python-jose`) with configurable secret
- Roles: `customer`, `driver`, `admin`
- Per-route role-based access control via `Depends(get_current_user)`

---

## 🌍 Frontend (React + Vite)

### User App Routes (`/app/...`)
| Route | Page | Description |
|---|---|---|
| `/app/home` | `HomePage` | Map, booking form, radar, price negotiation |
| `/app/searching` | `SearchingPage` | Waiting for driver acceptance |
| `/app/booking-confirmed` | `BookingConfirmedPage` | Live driver tracking + ride details |
| `/app/booking-rejected` | `BookingRejectedPage` | Rejection handling |
| `/app/booking-cancelled` | `BookingCancelledPage` | Cancellation page |
| `/app/track` | `TrackPage` | Active ride status |
| `/app/services` | `ServicesPage` | Service catalog |
| `/app/history` | `HistoryPage` | Past rides |
| `/app/profile` | `ProfilePage` | User settings |
| `/app/payment/:rideId` | `UserPaymentPage` | Post-ride payment |
| `/app/feedback` | `UserRideFeedbackPage` | Rate the ride |

### Rider App Routes (`/rider/...`)
| Route | Page | Description |
|---|---|---|
| `/rider/home` | `RiderHomePage` | Incoming requests + radar map |
| `/rider/ride/:rideId` | `RiderRideDetailsPage` | Ride details + live map + action slider |
| `/rider/track` | `RiderTrackPage` | Active ride tracker |
| `/rider/earning` | `RiderEarningPage` | Earnings dashboard |
| `/rider/advance` | `RiderAdvanceBookPage` | Advance bookings |
| `/rider/profile` | `RiderProfilePage` | Profile + vehicle management |
| `/rider/payment/:rideId` | `RiderPaymentPage` | Post-ride payment confirmation |
| `/rider/vehicle/new` | `RiderVehicleRegistrationPage` | Vehicle registration |
| `/rider/feedback/:rideId` | `RiderFeedbackPage` | Customer feedback |

### Admin Panel Routes (`/admin-v2`)
- User management (block/unblock)
- Ride management & status override
- Vehicle inventory
- Pricing rule editor
- Support tickets & audit logs

---

## 📱 Android App

### User App (`app-user`)
| Feature | Implementation |
|---|---|
| **Map** | `GoogleMap` composable (maps-compose) |
| **Location** | `FusedLocationProviderClient` — high accuracy GPS |
| **Live Tracking** | `UserRideViewModel.startLiveTracking()` — polls backend every 3s |
| **Route Drawing** | Google Directions API → `PolylineUtils.decodePoly()` → `Polyline` composable |
| **Camera** | `CameraUpdateFactory.newLatLngBounds()` fits both markers |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **Architecture** | MVVM: `ViewModel` + `StateFlow` + `Repository` |
| **DI** | Dagger Hilt |
| **Networking** | Retrofit 2 + Gson + OkHttp |
| **State** | `RideStatus` enum: IDLE → SEARCHING → ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED |

### Rider App (`app-rider`)
| Feature | Implementation |
|---|---|
| **Map** | WebView loading Rider React app (`/rider/home`) |
| **GPS** | Native `LocationManager` → JavaScript bridge (`AndroidInterface.getNativeLocation()`) |
| **Location Push** | Web JS calls `riderApi.updateDriverLocation()` every 3s via `navigator.geolocation.watchPosition` |
| **Back navigation** | `OnBackPressedCallback` with `webView.canGoBack()` |

---

## 🗃 Database Models

| Model | Table | Description |
|---|---|---|
| `User` | `users` | Customers, drivers, admins (roles) |
| `Ride` | `rides` | Ride requests with GPS coords, live coords, OTP, payment status |
| `RidePreference` | `ride_preferences` | Trip type, AC, seats, booking mode, supervisor info |
| `RideMessage` | `ride_messages` | In-ride chat between customer and driver |
| `RideNegotiation` | `ride_negotiations` | Fare counter-offers between customer and driver |
| `VehicleInventory` | `vehicle_inventory` | Company-owned vehicle fleet |
| `RiderVehicleRegistration` | `rider_vehicle_registrations` | Driver-submitted vehicle with full owner + driver info |
| `RiderApiKey` | `rider_api_keys` | API key system for rider app auth |
| `RideFeedback` | `ride_feedback` | Customer rating (1–5 stars + comment) |
| `RoutePriceRule` | `route_price_rules` | Area-to-area fare rules (base km, base fare, per-km rate) |
| `VehiclePriceModifier` | `vehicle_price_modifiers` | Per-vehicle-type multipliers on fares |
| `RiderSchedule` | `rider_schedule` | Advance booking calendar for drivers |
| `ServiceMetadata` | `service_metadata` | Service catalog (title, icon, mode, color) |
| `ReserveRoutePrice` | `reserve_route_prices` | Driver-set 12h/24h reservation prices per route |
| `ReserveDefaultRate` | `reserve_default_rates` | System default reservation rates |
| `AdminSupportTicket` | `admin_support_tickets` | Complaints and issues |
| `AdminTask` | `admin_tasks` | Internal admin operations |
| `AdminAuditLog` | `admin_audit_logs` | All admin actions logged |

---

## 📡 API Endpoints (Key)

### Auth
```
POST   /api/v1/auth/register       → Create user account
POST   /api/v1/auth/login          → Get JWT token
GET    /api/v1/auth/me             → Current user info
```

### Customer (Rides)
```
POST   /api/v1/rides/              → Create ride request
GET    /api/v1/rides/              → My ride history
GET    /api/v1/rides/active        → Current active ride
POST   /api/v1/rides/{id}/cancel   → Cancel ride
GET    /api/v1/rides/{id}/status   → Poll ride status
```

### Rider (Driver)
```
GET    /api/v1/rider/requests               → Pending ride requests
POST   /api/v1/rider/requests/{id}/accept   → Accept a request
POST   /api/v1/rider/requests/{id}/reject   → Reject a request
POST   /api/v1/rider/requests/{id}/negotiate → Counter-offer fare
GET    /api/v1/rider/active                 → My active rides
POST   /api/v1/rider/active/{id}/status     → Update ride status (arriving/in_progress/completed)
POST   /api/v1/rider/active/{id}/driver-location → Push live GPS coords
GET    /api/v1/rider/active/{id}/tracking   → Get both live coords
POST   /api/v1/rider/active/{id}/messages   → Send in-ride chat message
GET    /api/v1/rider/active/{id}/messages   → Get chat messages
POST   /api/v1/rider/active/{id}/feedback   → Submit customer rating
GET    /api/v1/rider/schedule               → View advance bookings
```

### Pricing
```
POST   /api/v1/pricing/quote       → Generate fare estimate
GET    /api/v1/pricing/rules       → List pricing rules (admin)
POST   /api/v1/pricing/rules       → Create pricing rule (admin)
```

### Radar (Nearby Drivers)
```
GET    /api/v1/radar/nearby?lat=&lng=&radius_km=   → Simulated nearby drivers with Haversine filter
```

### Services
```
GET    /api/v1/services/           → List active services (public)
POST   /api/v1/services/           → Create service (admin)
PATCH  /api/v1/services/{id}       → Update service (admin)
DELETE /api/v1/services/{id}       → Delete service (admin)
```

### Vehicles
```
GET    /api/v1/vehicles/           → Company vehicle inventory
POST   /api/v1/vehicles/           → Add vehicle (admin)
```

### Location (Android Native APIs)
```
POST   /api/rider/update-location          → Driver pushes live GPS
GET    /api/user/ride-location?ride_id=    → User fetches driver GPS

GET    https://maps.googleapis.com/maps/api/directions/json
       → origin=lat,lng&destination=lat,lng&key=API_KEY    → Route + ETA + distance
```

### WebSocket
```
WS     /ws/rides/{ride_id}    → Real-time ride events (status_updated, chat, etc.)
```

---

## 🚀 Services Offered

### Instant Ride (On-Demand)
| Service | Vehicle | Description |
|---|---|---|
| 🚗 Instant Ride Car | Car (Swift etc.) | City & outstation |
| 🏍 Bike Ride | Motorcycle | Solo fast commute |
| 🛺 Auto Ride | Auto/E-Rikshaw | Eco local rides |
| 🚐 Mini Pickup | Bolero/Pickup | Light goods delivery |

### Reserved Booking (Advance)
| Service | Vehicle | Description |
|---|---|---|
| 🗺 General Outstation | Car | Pre-booked intercity travel |
| 💒 Wedding & Events | Car (Decorated) | Dulha/Dulhan + Guest rides |
| 🚜 Logistics & Farming | Bolero | Heavy duty + bulk shifting |

---

## ⚡ Real-Time Features

| Feature | Implementation |
|---|---|
| **Driver Location Push** | Rider → `POST /rider/active/{id}/driver-location` every 3s |
| **Customer Location** | Stored in `rides.customer_live_lat/lng` |
| **Ride Status Events** | FastAPI WebSocket broadcasts `ride_status_updated` |
| **In-Ride Chat** | Rider ↔ Customer via REST polling + WebSocket push |
| **Live Map Animation** | MapLibre `requestAnimationFrame` cubic-ease interpolation |
| **Nearby Driver Radar** | Backend Haversine orbit simulation, polled every 4s |
| **Android Live Track** | Coroutine loop polls `getRiderLocation` + Directions API every 3s |
| **Android Camera** | `LatLngBounds.Builder` fits both user + driver markers automatically |

---

## 🔐 Admin Panel

URL: `/admin-v2`

Features:
- 📊 Dashboard with stats (total rides, drivers, revenue)
- 👤 User Management: list, block/unblock, role assignment
- 🚗 Ride Management: view all rides, override status
- 🛻 Vehicle Inventory: CRUD for company fleet
- 💰 Pricing Rules: per-route + per-vehicle-type fare control
- 🎫 Support Tickets: complaints from riders and customers
- 📋 Audit Logs: every admin action is recorded
- 🗂 Tasks: internal ops task board

---

## 🌱 Environment Variables

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_RIDER_APP_API_KEY=rider_app_linked_key_change_in_production
```

### Backend (`backend/.env`)
```env
SECRET_KEY=your_jwt_secret_key_here
DATABASE_URL=sqlite:///./bookmygadi.db
```

### Android (`android/local.properties`)
```properties
sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
MAPS_API_KEY=your_google_maps_api_key_here
```

> ⚠️ **Google Maps API Key** is needed for:
> - `NegotiationGoogleMap.tsx` (fare negotiation map)
> - `LiveRadiusMap.tsx` (nearby radius map)
> - `UserRideMapScreen.kt` (Android native map)
> - `DriverTrackingScreen.kt` (Android live tracking + Directions API)

> ✅ **MapLibre + OSRM** (LiveMap.tsx) requires **NO API key** — fully free.

---

## 🏃 Running the Project

### Backend
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Android (User App)
1. Open `android/` folder in Android Studio
2. Set `MAPS_API_KEY` in `android/local.properties`
3. Update `baseUrl` in `NetworkModule.kt` to your PC's local IP
4. Run on device/emulator

### Android (Rider App)
1. Update `HOST_IP` in `app-rider/MainActivity.kt` to your PC's local IP
2. Run on device — it will load the React Rider portal via WebView

---

## 🌐 URLs

| Service | URL |
|---|---|
| 🖥 Frontend (User) | http://127.0.0.1:5173/app/home |
| 🚗 Frontend (Rider) | http://127.0.0.1:5173/rider/home |
| 🔧 Admin Panel | http://127.0.0.1:5173/admin-v2 |
| ⚙ Backend API | http://127.0.0.1:8000 |
| 📄 API Docs (Swagger) | http://127.0.0.1:8000/docs |
| 📄 API Docs (ReDoc) | http://127.0.0.1:8000/redoc |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Customer | `sonu@gmail.com` | `123456` |
| Admin | `admin@bookmygadi.com` | `admin123` |
| Driver | `driver@bookmygadi.com` | `driver123` |

---

## 👨‍💻 Development Notes

- **Database migrations** are handled at runtime using SQLite `PRAGMA` + `ALTER TABLE` — no Alembic needed
- **Rider app on Android** uses WebView loading the local Vite dev server — update IP in `MainActivity.kt`
- **CORS** is set to `allow_all` for development — restrict in production
- **OSRM routing** (MapLibre) is free but may be slow on first call — fallback to straight-line if it times out (3.5s)
- **Google Directions API** (Android) is called every 3s during tracking — cache and throttle appropriately in production
- **FCM** is partially implemented — token registration to backend is a stub
- **Radar** uses a mocked Haversine orbit simulation — replace with real driver `driver_live_lat/lng` queries in production

---

*Built with ❤️ as a full-stack ride-booking platform — BookMyGaadi*
#   b o o k m y g a d i  
 