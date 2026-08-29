from sklearn.base import BaseEstimator, TransformerMixin


class TextSelector(BaseEstimator, TransformerMixin):
    """Select a single text column from a dataframe."""

    def __init__(self, key):
        self.key = key

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        return X[self.key].fillna("").astype(str).values


class NumericSelector(BaseEstimator, TransformerMixin):
    """Select a numeric column from a dataframe."""

    def __init__(self, key):
        self.key = key

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        vals = X[[self.key]].fillna(0).astype(float).values
        return vals
