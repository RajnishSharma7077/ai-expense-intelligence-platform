"""
Train an expense categorization model on a CSV dataset.
Expects CSV columns: id,date,amount,merchant,description,category
Saves the trained model (joblib) and prints evaluation metrics.
Usage: python train_model.py --data data/expenses.csv --out-model models/expense_model.joblib
"""
import argparse
import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

from model_utils import TextSelector, NumericSelector


def train(data_path, out_model_path):
    print(f"Loading data from {data_path}...")
    df = pd.read_csv(data_path)
    # basic sanity
    assert 'description' in df.columns and 'amount' in df.columns and 'category' in df.columns, "CSV must contain 'description','amount','category' columns"

    X = df[['description', 'amount']]
    y = df['category']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # pipeline: parallel text and numeric processing -> combined -> classifier
    text_pipeline = Pipeline([
        ('selector', TextSelector('description')),
        ('tfidf', TfidfVectorizer(max_features=20000, ngram_range=(1,2))),
    ])

    numeric_pipeline = Pipeline([
        ('selector', NumericSelector('amount')),
        ('scaler', StandardScaler()),
    ])

    combined = FeatureUnion([
        ('text', text_pipeline),
        ('num', numeric_pipeline),
    ])

    pipeline = Pipeline([
        ('features', combined),
        ('clf', RandomForestClassifier(n_estimators=200, n_jobs=-1, random_state=42)),
    ])

    print("Training model (this may take a while for large datasets)...")
    pipeline.fit(X_train, y_train)

    print("Evaluating...")
    y_pred = pipeline.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("Classification report:\n", classification_report(y_test, y_pred))

    os.makedirs(os.path.dirname(out_model_path), exist_ok=True)
    joblib.dump(pipeline, out_model_path)
    print(f"Saved trained model to {out_model_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=str, default='data/expenses.csv')
    parser.add_argument('--out-model', type=str, default='models/expense_model.joblib')
    args = parser.parse_args()

    train(args.data, args.out_model)
