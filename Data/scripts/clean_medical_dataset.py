import re
import pandas as pd
from datasets import load_dataset

def clean_text(t):
    t = str(t)
    t = re.sub(r"\(attachment removed to protect patient identity\)", "", t, flags=re.I)
    t = re.sub(r"-{2,}>", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

ds = load_dataset("ruslanmv/ai-medical-chatbot", split="train")
df = ds.to_pandas()[["Description", "Patient", "Doctor"]].copy()
n0 = len(df)
print(f"Dataset brut : {n0} lignes")

df = df.dropna(subset=["Patient", "Doctor"])
df["Patient"] = df["Patient"].astype(str).str.strip()
df["Doctor"]  = df["Doctor"].astype(str).str.strip()
df = df[(df["Patient"].str.len() > 0) & (df["Doctor"].str.len() > 0)]
print(f"Apres suppression des vides     : {len(df)}")

df["Patient"] = df["Patient"].map(clean_text)
df["Doctor"]  = df["Doctor"].map(clean_text)

stub = re.compile(r"(consult|revert).{0,60}online", re.I)
df = df[~(df["Doctor"].str.contains(stub) & (df["Doctor"].str.len() < 200))]
print(f"Apres filtrage reponses bouchon : {len(df)}")

df = df[df["Patient"].str.len().between(15, 4000)]
df = df[df["Doctor"].str.len().between(40, 4000)]
print(f"Apres filtrage des longueurs    : {len(df)}")

df = df.drop_duplicates(subset=["Patient", "Doctor"])
n1 = len(df)
print(f"Apres dedoublonnage             : {n1}")

df.to_parquet("medical_dataset_clean.parquet", index=False)
print("-" * 50)
print(f"Dataset nettoye : {n1} lignes ({n0 - n1} supprimees, {100*(n0-n1)/n0:.1f} %)")
print("Fichier ecrit : medical_dataset_clean.parquet")
