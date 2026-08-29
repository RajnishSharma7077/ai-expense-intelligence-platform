"""
Generate a synthetic expense transactions CSV suitable for training an expense-category classifier.
Produces columns: id,date,amount,merchant,description,category
Usage: python generate_synthetic_data.py --n 100000 --out data/expenses.csv
"""
import argparse
import random
from datetime import datetime, timedelta
import csv

from faker import Faker
import numpy as np

fake = Faker()

CATEGORIES = [
    "Food",
    "Travel",
    "Shopping",
    "Utilities",
    "Entertainment",
    "Health",
    "Education",
    "Transport",
    "Bills",
    "Others",
]

# simple mapping of keywords to categories to produce realistic text -> category relationship
MERCHANT_KEYWORDS = {
    "pizza": "Food",
    "restaurant": "Food",
    "cafe": "Food",
    "uber": "Transport",
    "lyft": "Transport",
    "airlines": "Travel",
    "hotel": "Travel",
    "amazon": "Shopping",
    "walmart": "Shopping",
    "netflix": "Entertainment",
    "spotify": "Entertainment",
    "doctor": "Health",
    "pharmacy": "Health",
    "university": "Education",
    "school": "Education",
    "electric": "Bills",
    "water": "Bills",
    "gas": "Bills",
}

MERCHANTS = [
    "Joe's Pizza",
    "Starbucks Coffee",
    "Uber Eats",
    "Lyft",
    "Delta Airlines",
    "Hilton Hotels",
    "Amazon Marketplace",
    "Walmart Supercenter",
    "Netflix Streaming",
    "Spotify",
    "City Hospital",
    "CVS Pharmacy",
    "State University",
    "Local High School",
    "Gas Station",
    "Electric Company",
    "Waterworks",
    "Corner Grocery",
    "Mall Outlet",
    "Local Taxi",
]

def pick_category_from_merchant(merchant, description):
    key_text = (merchant + " " + description).lower()
    for kw, cat in MERCHANT_KEYWORDS.items():
        if kw in key_text:
            return cat
    # fallback by random weighted probabilities to make dataset realistic
    weights = [0.18, 0.12, 0.18, 0.08, 0.08, 0.06, 0.04, 0.08, 0.06, 0.12]
    return random.choices(CATEGORIES, weights=weights, k=1)[0]


def generate_row(i):
    # random date in last 3 years
    start = datetime.now() - timedelta(days=3 * 365)
    date = start + timedelta(days=random.randint(0, 3 * 365), seconds=random.randint(0, 86400))
    merchant = random.choice(MERCHANTS + [fake.company() for _ in range(10)])

    # description: combine merchant, short phrase, sometimes include keywords
    phrases = [
        "Lunch with friends",
        "Grocery shopping",
        "Monthly subscription",
        "Taxi ride",
        "Flight booking",
        "Hotel stay",
        "Prescription purchase",
        "Course fee",
        "Online purchase",
        "Gas refill",
        "Electric bill payment",
    ]
    desc = random.choice(phrases)
    # occasionally append merchant
    if random.random() < 0.6:
        description = f"{merchant} - {desc}"
    else:
        description = desc

    # amount distribution depends on category-like phrases
    # rough sampling for variety
    base = np.random.exponential(scale=30.0) + 1.0
    # clamp
    amount = round(float(np.clip(base, 0.5, 2000.0)), 2)

    category = pick_category_from_merchant(merchant, description)

    return {
        "id": i,
        "date": date.strftime("%Y-%m-%d"),
        "amount": amount,
        "merchant": merchant,
        "description": description,
        "category": category,
    }


def generate_csv(n, out_path):
    with open(out_path, "w", newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["id", "date", "amount", "merchant", "description", "category"])
        writer.writeheader()
        for i in range(1, n + 1):
            row = generate_row(i)
            writer.writerow(row)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=100000, help="Number of rows to generate")
    parser.add_argument("--out", type=str, default="data/expenses.csv", help="Output CSV path")
    args = parser.parse_args()

    # ensure output directory exists
    import os

    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    print(f"Generating {args.n} synthetic transactions to {args.out} ...")
    generate_csv(args.n, args.out)
    print("Done.")
