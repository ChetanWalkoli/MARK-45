# 🤖 MARK 45 OS

Welcome to **MARK 45 OS** — a futuristic, AI-powered developer workspace and co-pilot styled after the iconic Iron Man suit interface. Built specifically for developers who want a local-first, context-aware, and highly-immersive interface to design, code, and interact with AI models.

---

## 🌟 Key Features

* **3D Scroll Landing Page**: A visually stunning, scroll-triggered 3D layout providing system status visualizations and immersive navigation.
* **Futuristic Chat Terminal**: A sleek glassmorphic UI designed with custom neon-glow indicators, smooth transitions, and ambient backdrops.
* **Multi-Model Intelligence**: Choose your preferred model directly from the dropdown:
  - Gemini 1.5 Flash (Default)
  - GPT-4o
  - Claude 3.5 Sonnet
  - MARK 45 (Local developer agent)
* **Voice-Activated Input**: Integrated browser Speech Recognition for hands-free co-pilot interaction.
* **Context File Uploader**: Read and inject text, JSON, Python, and markdown files directly into the prompt context.
* **Persistent Sessions**: Chat history is persisted directly in your local storage.
* **Dual Architecture**: Integrated Express.js backend for modular server routes and a React-Vite client for lightning-fast rendering.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, Vanilla CSS gradients & custom glassmorphism
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Framework**: Express.js (TypeScript)
- **Environment**: Node.js

---

## 🚀 Setup & Installation

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your system.

### 1. Install Dependencies
Run the helper script in the root directory to install all packages for both the frontend and backend:
```bash
npm run install:all
```

### 2. Configure Environment variables
Create a `.env` file inside the `frontend/` directory and add your Gemini API Key:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start the Development Servers
Launch both the frontend and backend servers concurrently:
```bash
npm run dev
```

The application will be accessible at:
- **Frontend (Vite App)**: `http://localhost:5173`
- **Backend (API Service)**: `http://localhost:5000`

---

## 📁 Folder Structure

```text
mark-45/
├── backend/            # Express.js API Server
│   ├── dist/           # Compiled JS output
│   ├── src/
│   │   └── server.ts   # Server entrypoint
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/           # React + Vite Frontend Client
│   ├── public/         # Static assets (videos, logo.png)
│   ├── src/
│   │   ├── components/ # Chat, Sidebar, Settings, and Hero components
│   │   ├── hooks/      # Local storage state and chat helpers
│   │   ├── services/   # Gemini API streaming connection
│   │   ├── App.tsx     # Main application layout
│   │   └── index.css   # Global styles and ambient effects
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json        # Root workspace manager
└── README.md
```

---

## 🤝 Git Integration

This project is set up to track updates on GitHub. To push new updates, run:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```
