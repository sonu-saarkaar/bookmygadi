# 🚗 BookMyGadi

A full-stack ride booking platform inspired by Uber & Ola — built with modern technologies for real-time ride management, tracking, and booking.

---

## ✨ Key Features

- 📍 Live ride tracking (real-time location)
- 💰 Fare negotiation system (unique feature)
- 👤 Multi-role system (User, Rider, Admin)
- ⚡ Real-time updates via WebSockets
- 📱 Android app integration (User & Rider)
- 💳 Payment integration (Razorpay)
- 🧠 Smart pricing & service management
- 🗺 Map support (MapLibre + Google Maps)

---

## 🛠 Tech Stack

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- SQLite / PostgreSQL
- WebSockets

### Frontend
- React (Vite)
- TypeScript
- Tailwind CSS

### Mobile
- Kotlin (Android)
- Jetpack Compose
- Firebase (FCM)

---

## 📁 Project Structure


backend/ # FastAPI backend (API + WebSocket)
frontend/ # React web app (User + Rider + Admin)
android/ # Native Android apps


---

## ⚙️ Run Locally

### 🔹 Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
🔹 Frontend
cd frontend
npm install
npm run dev
🌐 Local URLs
Service	URL
Frontend	http://localhost:5173

Backend	http://localhost:8000

API Docs	http://localhost:8000/docs
📸 System Overview
User books ride → backend creates request
Rider receives → accepts/rejects
Real-time tracking via WebSocket
Payment + feedback system integrated
📌 Current Status

🚧 Active Development
🔥 Core features completed
⚙️ Deployment in progress

👨‍💻 Author

Sonu Saarkaar
Founder | Full Stack Developer

⭐ Support

If you like this project, consider giving it a star ⭐
