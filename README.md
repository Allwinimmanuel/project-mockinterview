# AI Proctoring & Mock Interview System

This is a complete AI-powered Proctoring and Mock Interview Platform featuring real-time eye, head pose, phone/object, and voice/audio monitoring, combined with an automated recruiter dashboard and interactive candidate coding environment.

---

## 🚀 Quick Start Guide

To run this project on another machine, follow these instructions step-by-step:

### 1. Prerequisites
Make sure you have the following installed on your system:
* **Node.js** (v18 or higher recommended)
* **Python** (v3.10 or higher recommended)
* **MySQL Server** (running locally)

---

### 2. Database Setup (MySQL)
1. Open your MySQL client (e.g., MySQL Workbench, Command Line, or phpMyAdmin).
2. Create a new database named `interview_db`:
   ```sql
   CREATE DATABASE interview_db;
   ```
3. Verify your MySQL server username and password. The default configuration assumes:
   * **Host:** `localhost`
   * **User:** `root`
   * **Password:** `password`
   * **Database:** `interview_db`

---

### 3. Environment Variables Configuration
Go to `demo-master/server/` and verify or create the `.env` file with the correct configuration:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=interview_db
```
*(Update `DB_PASSWORD` if your local MySQL root user uses a different password).*

---

### 4. Dependency Installation
Run the helper installer script or install dependencies manually:

#### Automated Install:
From the root directory of the project, run:
```bash
npm install
npm run install-all
```
*(Or manually install dependencies in all project folders as listed below)*

#### Manual Install (Alternative):
1. **Root Directory:**
   ```bash
   npm install
   ```
2. **Web App (demo-master):**
   ```bash
   cd demo-master
   npm install
   ```
3. **Backend Server (demo-master/server):**
   ```bash
   cd demo-master/server
   npm install
   ```
4. **AI Proctoring Service (demo-master/proctoring_service):**
   ```bash
   cd demo-master/proctoring_service
   pip install -r requirements.txt
   ```

---

### 5. Seeding Initial Question Bank
Before starting the servers for the first time, seed the question bank database with preconfigured aptitude and technical questions:
```bash
cd demo-master/server
node seed.js
```
You should see: `✅ Successfully seeded questions into the database!`

---

### 6. Running the Application

You need to start two processes in separate terminals:

#### Terminal 1: Frontend & Backend Launcher
From the project root directory, run:
```bash
npm run dev
```
* This runs the root launcher which starts both the Express backend and the Vite frontend simultaneously.
* It automatically binds them together on the allocated ports (typically **http://localhost:5173** for the app).

#### Terminal 2: Python AI Proctoring Server
From the `demo-master/proctoring_service` directory, run:
```bash
py main.py
```
*(or `python main.py`)*
* This starts the MediaPipe and YOLO v8 proctoring models server (running on **http://localhost:5001**).

---

## 🛠️ Project Structure
* `demo-master/` - Contains the React frontend web interface.
* `demo-master/server/` - Node Express API backend utilizing Sequelize ORM with MySQL.
* `demo-master/proctoring_service/` - Python real-time AI computer vision proctoring models.
* `scripts/` - Workspace development runner tools.
