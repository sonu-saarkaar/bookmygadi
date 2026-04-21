# BookMyGadi FastAPI Backend

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Environment (`backend/.env`)

```env
SECRET_KEY=change-me-in-production
DATABASE_URL=sqlite:///./bookmygadi.db
MAPBOX_TOKEN=
```

## Docs

- Swagger: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
