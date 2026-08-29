# AI Expense Intelligence Platform

An end-to-end expense tracking and intelligence application that combines a React dashboard, an Express backend, MongoDB-based persistence, JWT authentication, and a machine learning model for automatic expense categorization.

The project was built as a practical MVP for a modern personal finance dashboard that can:

- track expenses and budgets
- understand spending patterns
- predict the category of a new expense using AI
- provide smart insights and exportable reports
- support multi-user authentication with isolated data

## Overview

This project includes three major layers:

1. ML layer
   - Generates synthetic expense data
   - Trains a category classifier
   - Serves predictions through a FastAPI app

2. Backend layer
   - Handles authentication, user management, budgets, summaries, and exports
   - Persists data in MongoDB
   - Secures protected routes with JWT

3. Frontend layer
   - Provides a dashboard with analytics, transactions, budgets, insights, and reports
   - Connects to the backend through a secure API layer
   - Includes login/register flow and profile editing

## Project architecture

```text
ai-expense-intelligence-platform/
├── backend/
│   ├── db.js
│   ├── models.js
│   ├── package.json
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── index.html
├── ml/
│   ├── generate_synthetic_data.py
│   ├── model_utils.py
│   ├── train_model.py
│   ├── serve.py
│   ├── requirements.txt
│   ├── frontend/
│   └── models/
├── .gitignore
├── render.yaml
├── README.md
└── package-lock.json
```

## Tech stack

### Frontend
- React
- Vite
- JavaScript / JSX
- CSS-based dashboard styling

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Bcrypt password hashing

### ML
- Python
- scikit-learn
- pandas
- joblib
- FastAPI
- uvicorn

## Features implemented

### User authentication

The app supports:

- register new user
- login existing user
- JWT-based protected routes
- session persistence in browser localStorage
- profile update ability
- password change flow

Demo credentials seeded by default:

- Email: demo@expense.ai
- Password: demo123

### Expense dashboard

The dashboard includes:

- total spend overview
- top category analysis
- monthly spending chart
- AI category prediction
- add expense form
- transactions table
- budget monitoring
- insights section
- CSV export report

### Budget management

The app tracks budgets by category and calculates:

- monthly limit
- current spent amount
- remaining budget
- usage percentage

### AI categorization

The AI model predicts expense category using:

- description text features
- transaction amount
- category labels such as Food, Travel, Bills, Shopping, Transport, Entertainment, Health, and Education

### Reports and insights

Users can:

- export expense data as CSV
- review monthly spend trends
- get smart summary insights based on spending behavior

## Machine learning module

The ML portion of the project was created to train an expense category classifier using synthetic data.

### Files in the ML folder

- `ml/generate_synthetic_data.py`  
  Generates sample transactions with merchant, description, amount, and category.

- `ml/train_model.py`  
  Trains the model pipeline and saves the artifact.

- `ml/model_utils.py`  
  Contains custom scikit-learn classes required for model serialization and safe loading.

- `ml/serve.py`  
  Exposes a FastAPI service with `/predict` and `/predict/batch` endpoints.

- `ml/frontend/index.html` and `ml/frontend/main.js`  
  Simple web interface for quick prediction testing.

### Model approach

The model uses a pipeline combining:

- text vectorization from the expense description
- numeric scaling for the amount
- a classifier such as RandomForest

The prediction service accepts payloads like:

```json
{
  "description": "Starbucks cappuccino",
  "amount": 6.5
}
```

and returns a predicted category and confidence values.

### Important note about the model artifact

The trained model file is intentionally not included in the GitHub repo because it exceeds GitHub's 100 MB file size restriction. The repository includes the training code and the model-serving API so the model can be regenerated locally with:

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train_model.py
python serve.py
```

## Backend details

The backend is in `backend/server.js` and uses the following structure:

### Authentication routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `POST /api/auth/change-password`

### Expense routes
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Budget routes
- `GET /api/budgets`
- `PUT /api/budgets/:category`

### Summary and insights
- `GET /api/summary`
- `GET /api/insights`

### Reports
- `GET /api/export/report`

### Database structure

The app defines models for:

- `User`
- `Transaction`
- `Budget`

Each transaction and budget belongs to a user via `userId`, which enables per-user data isolation.

The current local setup uses MongoDB Memory Server for development, so database data is temporary until a real MongoDB URI is configured.

## Frontend details

The frontend is built with React and Vite in `frontend/`.

### Main dashboard features

- Overview cards for total spend and spending trends
- AI prediction panel
- Quick expense entry form
- Transactions page
- Budgets page
- Insights page
- Reports page
- Profile modal with name and password editing

### Frontend auth flow

The app stores the JWT in browser localStorage and sends it as a bearer token on protected API calls.

## Local development setup

### 1. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. ML model setup

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train_model.py
python serve.py
```

### 4. Run the app

Once all services are started:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- ML API: http://localhost:8000

## Default demo login

The backend seeds a demo account automatically:

- Email: demo@expense.ai
- Password: demo123

## Environment variables

### Backend example

```env
PORT=3001
JWT_SECRET=replace_with_a_strong_secret
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/expense_ai
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Frontend example

```env
VITE_API_URL=http://localhost:3001
VITE_MODEL_URL=http://localhost:8000
```

## Deployment notes

This repository includes a deployment-ready configuration:

- `render.yaml` for backend deployment on Render
- `frontend/vercel.json` for frontend hosting on Vercel
- `.env.example` files for environment configuration

Recommended production deployment:

- Frontend: Vercel
- Backend: Render or Railway
- Database: MongoDB Atlas

## MVP status and next steps

The project is a working MVP that demonstrates:

- real user authentication
- protected expense and budget data
- AI-powered categorization
- dashboard analytics
- persistent backend data layer

Possible future improvements include:

- edit transaction from UI
- delete or modify budgets more elegantly
- stronger validation and central error handling
- real production database and cloud deployment
- richer AI insights and better model accuracy
- receipt OCR and advanced spending analytics
- notifications, reminders, and recurring expenses

## Summary

This project brings together finance, AI, and a full-stack web app in one place. It shows how a personal finance dashboard can move from a static mockup to a real application with user accounts, AI-driven categorization, protected APIs, and data persistence.

It is a strong base for building a production-grade expense intelligence platform with more advanced forecasting, recommendations, and automation in the future.
