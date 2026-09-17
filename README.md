# AI-Powered Descriptive CBT Admin System

This project is a Computer-Based Testing (CBT) admin platform that automatically evaluates handwritten student answers (specifically in Hindi) using Google Gemini AI and a Celery background worker system.

## Key Features
- **Gemini OCR Integration**: Swapped from local Tesseract to Google's Gemini Vision API to flawlessly extract handwritten Hindi text from uploaded answer sheets.
- **AI Evaluation Pipeline**: A Celery + Redis worker queue runs in the background to automatically grade student answers against model answers and rubrics, providing a score and detailed reasoning.
- **Premium Light Theme UI**: A beautiful, glassmorphic React frontend built with Vite, featuring dynamic glowing animations, stat dashboards, and live attempt tracking.
- **Student Attempt Management**: Upload student exam pages by entering their name and enrollment number. 
- **Live Attempts Queue & Exam Results**: Monitor the global AI grading queue in real-time, and view the finalized scores for all students grouped by exam.
- **Human-in-the-Loop Review**: Allows teachers to override the AI's grading if they spot an error or hallucination.

## Project Structure
- `backend/`: FastAPI application containing all APIs, SQLAlchemy models, and the `Celery` worker tasks (`tasks.py`).
- `frontend/`: Vite + React + TypeScript application for the admin dashboard.
- `storage_data/`: Local storage directory for uploaded answer sheet images.

## Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local frontend dev)
- A valid `GEMINI_API_KEY` inside your `.env` file or `docker-compose.yml`.

## Getting Started

1. **Configure Environment Variables**
   Ensure your `.env` or `docker-compose.yml` has the proper API key:
   ```yaml
   OCR_PROVIDER=gemini
   GEMINI_API_KEY=your_key_here
   ```

2. **Start the environment (Database, Redis, Backend, Worker, Frontend)**
   ```bash
   docker compose up -d --build
   ```

3. **Accessing the applications**
   - **Frontend UI**: http://localhost:8000 (proxied via Vite on some setups, or check Docker ports)
   - **Backend API Docs (Swagger)**: http://localhost:8000/docs
   - **Local DB**: `localhost:5432`

## API Highlights
- `GET /api/stats` - Fetch dashboard statistics (total exams, pending reviews, attempts).
- `GET /api/attempts` - View the global queue of student attempts and their current AI processing status.
- `GET /api/exams/{id}/attempts` - Get all student attempts and their total scores for a specific exam.
- `POST /api/attempts` - Register a new student attempt with their name and enrollment number.
- `POST /api/answers/{id}/upload` - Upload an image of the student's handwritten answer sheet to trigger the AI OCR and evaluation worker.
