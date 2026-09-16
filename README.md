# CBT Admin System (Part 1)

This project contains the foundation for the AI-powered descriptive-answer examination system.

## Project Structure
- `backend/`: FastAPI application containing all models, logic, and file storage APIs.
- `frontend/`: Vite + React + TypeScript + Tailwind CSS application for the admin dashboard.
- `storage_data/`: Local storage directory mimicking an S3-compatible service.

## Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local frontend dev)
- Python 3.11 (optional for local backend dev outside Docker)

## Getting Started

1. **Start the environment (Database, Backend, Frontend)**
   ```bash
   docker-compose up --build
   ```

2. **Run Initial Database Migrations**
   Open a new terminal and run:
   ```bash
   docker-compose exec backend alembic revision --autogenerate -m "Initial schema"
   docker-compose exec backend alembic upgrade head
   ```

3. **Accessing the applications**
   - Frontend UI: http://localhost:5173
   - Backend API Docs (Swagger): http://localhost:8000/docs
   - Local DB: `localhost:5432`

## API List (Part 1)
- `GET /api/exams` - Get all exams
- `POST /api/exams` - Create an exam
- `GET /api/exams/{id}` - Get exam details
- `POST /api/exams/{id}/questions` - Add a question
- `POST /api/questions/{id}/model-answer` - Upload handwriting model answer image
- `POST /api/attempts` - Create a student exam attempt
- `POST /api/attempts/{id}/answers` - Start student answer for a question
- `POST /api/answers/{id}/upload` - Upload a student's handwritten answer sheet

## Known Limitations
- The `StorageProvider` is implemented using the local file system. This will need to be switched to `S3` for production.
- Authentication/Authorization is bypassed in Part 1 to focus on core logic.
- Uploaded files are returned with local relative paths rather than full URLs in this iteration.
