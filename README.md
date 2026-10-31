# 💬 Full-Stack Real-time Chat & WebRTC Video Call App

A modern, full-stack real-time chat application with WebRTC 1-on-1 video & audio calling, MongoDB database persistence, user authentication, and friend discovery/request system.

---

## ✨ Features

- 🔐 **Authentication:** User Registration & Login with JWT and Bcrypt password hashing.
- 👥 **Explore Users:** Discover all registered users with live search and friendship status badges.
- 🤝 **Friend Request System:** Send, receive, accept, decline, and cancel friend requests in real-time.
- 💬 **Real-time 1-on-1 Chat:** Instant messaging powered by WebRTC & Socket.io with persistent chat history.
- 📹 **Video & Audio Calling:** Peer-to-peer encrypted WebRTC calls with camera/mic controls and picture-in-picture.
- 🍃 **MongoDB Persistence:** Uses Mongoose models for Users, Friendships, Requests, and Messages.
- 🎨 **Modern Sleek UI:** Built with React 19, Tailwind CSS v4, Lucide Icons, and responsive design.

---

## 📁 Project Structure

```text
Chat_App/
├── .gitignore               # Root git ignore (filters node_modules, .env, build)
├── backend/                 # Express, Socket.io, Mongoose
│   ├── models/              # User, FriendRequest, Friendship, Message schemas
│   ├── server.js            # Express server & WebRTC signaling
│   ├── db.js                # MongoDB connection & helper queries
│   ├── .env                 # Local environment secrets (ignored by git)
│   ├── .env.example         # Template for environment variables
│   └── package.json
└── frontend/                # Vite, React, Tailwind CSS
    ├── src/
    │   ├── components/      # AuthModal, Sidebar, ChatArea, CallModal, UserCard
    │   ├── services/        # api.js, socket.js (dynamic backend URL)
    │   ├── App.jsx          # Main application & WebRTC peer manager
    │   └── index.css        # Tailwind styles
    ├── .env                 # Local frontend env (ignored by git)
    ├── .env.example         # Template for frontend env
    └── vite.config.js
```

---

## 🚀 Local Setup

### 1. Backend
```bash
cd backend
npm install
# Ensure MongoDB is running locally on port 27017
node server.js
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

App will run on `http://localhost:5173`.

---

## 🌐 Deployment Guide

### Deploying Backend (e.g., Render / Railway):
1. Push this repository to GitHub.
2. In Render / Railway, select `New Web Service` pointing to your repository.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `node server.js`.
6. Add Environment Variables:
   - `PORT`: `5001` (or let the host assign it)
   - `MONGO_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `JWT_SECRET`: A strong secret key

### Deploying Frontend (e.g., Vercel / Netlify):
1. In Vercel / Netlify, select `New Project` pointing to the repository.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Set **Build Command** to `npm run build`.
5. Set **Output Directory** to `dist`.
6. Add Environment Variable:
   - `VITE_BACKEND_URL`: Your deployed backend URL (e.g., `https://your-backend.onrender.com`)

