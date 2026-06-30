# Rôle DATA

**Projet :** TechCorp — Challenge IA
**Rôle :** DATA (Expert Données)
**Périmètre :** validation des données du modèle financier + analyse/nettoyage du dataset médical

---

## Couverture de la mission

| Point de mission | Traité dans |
|------------------|-------------|
| Validation des données d'entrée pour Phi-3.5-Financial | Partie A |
| Tests de qualité des conversations (financier) | Partie A |
| Analyse et nettoyage du dataset médical | Partie B (§2-3) |
| Préparation des données pour le fine-tuning LoRA | Partie B (§4) |
| Validation de la qualité des conversations médicales | Partie B (§5) |

**Livrables :** dataset médical nettoyé (`medical_dataset_clean.parquet`) + le présent rapport.

---

# Partie A — Validation Phi-3.5-Financial

Le modèle Phi-3.5-Financial est fourni **pré-entraîné** : il n'y a pas de dataset brut à nettoyer
en amont. La validation DATA porte donc sur la **qualité des entrées/sorties en conditions
réelles** : on envoie au modèle des questions du domaine financier et on évalue la pertinence de
ses réponses.

## A.1 — Protocole de test

- Le modèle est interrogé via le serveur d'inférence (Ollama) déployé par l'équipe INFRA.
- Une batterie de questions financières représentatives est soumise.
- Chaque réponse est évaluée selon 4 critères (grille ci-dessous).

## A.2 — Jeu de questions de test (domaine finance)

1. What is EBITDA and why is it important?
2. Explain the difference between gross margin and net margin.
3. What is working capital and how is it calculated?
4. How do you interpret a P/E ratio?
5. What does a negative cash flow from operations indicate?
6. What is the difference between a stock and a bond?
7. Explain what diversification means in a portfolio.
8. What is ROI and how is it computed?

## A.3 — Grille d'évaluation

Chaque réponse est notée de 1 (faible) à 5 (excellent) sur :

| Critère | Description |
|---------|-------------|
| **Pertinence** | La réponse traite-t-elle bien la question posée ? |
| **Exactitude** | L'information financière est-elle correcte ? |
| **Cohérence** | La réponse est-elle structurée et sans contradiction ? |
| **Ton / format** | Registre professionnel adapté à un usage finance/business ? |

## A.4 — Résultats

Tests réalisés via l'interface web connectée au serveur Ollama (Phi-3.5-Financial).

| # | Question | Pertinence | Exactitude | Cohérence | Ton | Commentaire |
|---|----------|:---------:|:----------:|:---------:|:---:|-------------|
| 1 | EBITDA | 5 | 5 | 5 | 5 | Définition correcte + mention des limites de l'indicateur |
| 2 | Gross margin vs Net margin | 5 | 5 | 4 | 4 | Formules correctes ; formulation parfois un peu lourde |

### A.5 — Captures des tests

**Question 1 — EBITDA :**

[![Test EBITDA](https://i.goopics.net/m7w5xq.png)](https://goopics.net/i/m7w5xq)

**Question 2 — Gross margin vs Net margin :**

[![Test marges](https://i.goopics.net/hrmugi.png)](https://goopics.net/i/hrmugi)

---

# Partie B — Dataset médical

**Dataset :** `ruslanmv/ai-medical-chatbot` (Hugging Face)
**Usage :** fine-tuning LoRA du modèle médical expérimental.

## B.1 — Présentation du dataset

| Caractéristique | Valeur |
|-----------------|--------|
| Source | `ruslanmv/ai-medical-chatbot` |
| Volume | **256 916 lignes** (~250k dialogues) |
| Taille | 142 Mo |
| Format | Parquet |
| Langue | Anglais |
| Colonnes | `Description`, `Patient`, `Doctor` |
| Nature | Dataset **expérimental** patient ↔ médecin |

### Description des colonnes

| Colonne | Contenu | Longueur (caractères) |
|---------|---------|------------------------|
| `Description` | Résumé court de la question | 1 à 1 500 |
| `Patient` | Question complète du patient | 1 à 17 700 |
| `Doctor` | Réponse du médecin | 2 à 11 400 |

Pour le fine-tuning : `Patient` → rôle *user*, `Doctor` → rôle *assistant*.

## B.2 — Problèmes de qualité identifiés

**1. Doublons.** De nombreuses paires question/réponse identiques se répètent (ex :
*« What does abutment of the nerve root mean? »* apparaît de multiples fois). → suppression des
doublons exacts.

**2. Réponses « bouchon ».** Une part des réponses `Doctor` ne sont que des renvois sans contenu
(*« For further information consult a … online -->»*). → filtrage des réponses courtes contenant
un motif de renvoi.

**3. Artefacts d'anonymisation.** Mentions `(attachment removed to protect patient identity)`
référençant des images supprimées. → retrait de la mention.

**4. Artefacts de mise en forme.** Flèches `-->`, espaces multiples, retours ligne incohérents.
→ nettoyage et normalisation.

**5. Valeurs vides ou aberrantes.** Champs vides, réponses d'1-2 caractères, textes de plusieurs
milliers de caractères. → suppression des vides + filtrage des longueurs.

**6. Contenu sensible.** Sujets de santé sexuelle / mentale présents. Inhérent au domaine, non
filtré, mais **signalé** (renforce le caractère expérimental — lien volet CYBER).

## B.3 — Pipeline de nettoyage (script `clean_medical_dataset.py`)

1. Sélection des colonnes utiles
2. Suppression des lignes vides
3. Nettoyage texte (artefacts, flèches, espaces)
4. Filtrage des réponses « bouchon »
5. Filtrage des longueurs aberrantes
6. Suppression des doublons exacts
7. Export `medical_dataset_clean.parquet`

## B.4 — Préparation pour le fine-tuning LoRA

Les paires `Patient`/`Doctor` nettoyées sont reformatées au **gabarit de conversation de
Phi-3.5** (`<|user|> … <|end|> <|assistant|> …`), format attendu par le modèle pour l'entraînement.

## B.5 — Validation de la qualité des conversations médicales

Après nettoyage, vérification par échantillonnage :
- chaque ligne contient bien une question **et** une réponse non vides ;
- les réponses conservées ont un contenu médical réel (plus de simples renvois) ;
- le format de conversation est correct.

## B.6 — Résultats du nettoyage

| Étape | Lignes restantes | Supprimées |
|-------|------------------|------------|
| Dataset brut | 256 916 | — |
| Après suppression des vides | 256 916 | 0 |
| Après filtrage des réponses « bouchon » | 249 103 | 7 813 |
| Après filtrage des longueurs | 248 754 | 349 |
| Après dédoublonnage | 240 814 | 7 940 |
| **Dataset final nettoyé** | **240 814** | **16 102 (6,3 %)** |

**Lecture :** le dataset ne contenait aucune ligne vide. Le plus gros retrait vient des réponses
« bouchon » (7 813 renvois sans contenu médical) et des doublons (7 940). Au total **16 102
lignes supprimées (6,3 %)**, pour un dataset final de **240 814 conversations propres**.

