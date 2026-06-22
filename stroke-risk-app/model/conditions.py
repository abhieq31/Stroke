"""Condition registry (Python side of the factory).

Adding a disease = adding an entry here + a UI schema in the web app. The
training/export code never changes. That's the whole point: the model is a
config, not a codebase.
"""

CONDITIONS = {
    "stroke": {
        "name": "Brain stroke",
        "csv": "healthcare-dataset-stroke-data.csv",
        "drop_cols": ["id"],
        "target": "stroke",
        "numeric": ["age", "avg_glucose_level", "bmi"],
        "binary": ["hypertension", "heart_disease"],
        "categorical": ["smoking_status"],
        "zero_as_missing": [],
        "median_impute": ["bmi"],
        # cutoffs on the calibrated-probability scale (prevalence ~5%)
        "risk_bands": {"moderate": 0.05, "higher": 0.15},
    },
    "diabetes": {
        "name": "Type 2 diabetes",
        "csv": "diabetes.csv",
        "drop_cols": [],
        "target": "Outcome",
        # Pima dataset. We keep only the inputs a person can actually know and
        # that carry signal (audit dropped SkinThickness, Insulin, Pedigree).
        "numeric": ["Glucose", "BMI", "Age", "BloodPressure"],
        "binary": [],
        "categorical": [],
        # 0 is physiologically impossible here -> it means "missing".
        "zero_as_missing": ["Glucose", "BMI", "BloodPressure"],
        "median_impute": ["Glucose", "BMI", "BloodPressure"],
        # prevalence ~35%, so the calibrated scale sits higher
        "risk_bands": {"moderate": 0.30, "higher": 0.55},
    },
}
