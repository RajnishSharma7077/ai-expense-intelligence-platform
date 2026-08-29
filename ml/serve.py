"""
FastAPI model server for the expense categorization pipeline.

- Loads the trained pipeline from models/expense_model.joblib on startup
- Exposes:
  - GET /health -> {"status": "ok"}
  - POST /predict -> {"category": ..., "probabilities": {cat: prob}}
  - POST /predict/batch -> accepts list of items and returns predictions
- Serves the simple frontend mounted at / (static files in ./frontend)

Run: (from ml/)
  pip install -r requirements.txt
  uvicorn serve:app --host 0.0.0.0 --port 8000 --reload
"""
from typing import List, Dict, Any
import os
import joblib

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "expense_model.joblib")

app = FastAPI(title="Expense Category Model Server")

# Allow local frontend usage
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    description: str = Field(..., example="Starbucks - Latte")
    amount: float = Field(..., example=4.75)


class BatchPredictRequest(BaseModel):
    items: List[PredictRequest]


class PredictResponse(BaseModel):
    category: str
    probabilities: Dict[str, float]


model = None
labels = None


@app.on_event("startup")
def load_model():
    global model, labels
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model not found at {MODEL_PATH}. Train and place the model there before serving.")
    model = joblib.load(MODEL_PATH)
    # get label classes if available
    try:
        labels = list(model.classes_)
    except Exception:
        labels = None
    print("Model loaded.")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    X = [{"description": req.description, "amount": req.amount}]
    try:
        pred = model.predict(X)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    probabilities = {}
    # try predict_proba if available
    try:
        probs = model.predict_proba(X)[0]
        classes = model.classes_
        probabilities = {str(c): float(p) for c, p in zip(classes, probs)}
    except Exception:
        # fallback: only the predicted label with prob 1.0
        probabilities = {str(pred): 1.0}

    return {"category": str(pred), "probabilities": probabilities}


@app.post("/predict/batch")
def predict_batch(req: BatchPredictRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    items = req.items
    X = [{"description": it.description, "amount": it.amount} for it in items]

    try:
        preds = model.predict(X)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    results: List[Dict[str, Any]] = []
    try:
        probas = model.predict_proba(X)
        classes = model.classes_
        for p, probs in zip(preds, probas):
            results.append({
                "category": str(p),
                "probabilities": {str(c): float(pr) for c, pr in zip(classes, probs)}
            })
    except Exception:
        for p in preds:
            results.append({"category": str(p), "probabilities": {str(p): 1.0}})

    return {"results": results}


# Serve the small frontend (index.html in ./frontend)
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    print("No frontend directory found; create ml/frontend to serve a demo UI.")
