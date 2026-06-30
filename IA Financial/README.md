# IA Financial - Phi-3.5-Financial

Ce dossier documente la validation, les tests et l'optimisation du modele financier `Phi-3.5-Financial` utilise dans le projet TechCorp.

## Objectif

L'objectif est de verifier que le modele financier est exploitable via l'interface web et l'API locale, puis de definir des parametres d'inference adaptes a un usage finance/business.

Livrable attendu :

```text
Modele Phi-3.5-Financial valide et optimise
```

## Modele utilise

Modele expose dans Ollama :

```text
phi3.5-financial
```

Modele source installe :

```text
hf.co/mradermacher/Phinance-Phi-3.5-mini-instruct-finance-v0.3-GGUF:Q4_K_M
```

Le modele est appele par le backend web via :

```text
POST /api/chat
```

## Validation fonctionnelle

Les tests doivent confirmer que le modele :

- repond aux questions financieres simples ;
- structure les analyses ;
- indique les hypotheses quand les donnees sont incompletes ;
- refuse les predictions garanties ;
- ne se presente pas comme un conseiller financier officiel ;
- reste utilisable depuis l'interface web.

## Prompts de test

### Analyse de risque

```text
Analyse les risques financiers d'une PME tres endettee.
```

Resultat attendu :

- identification du risque de liquidite ;
- identification du risque de solvabilite ;
- mention de la charge de la dette ;
- reponse prudente et structuree.

### Indicateurs financiers

```text
Quels indicateurs faut-il regarder avant d'investir dans une entreprise ?
```

Resultat attendu :

- chiffre d'affaires ;
- EBITDA ;
- marge nette ;
- endettement ;
- cash-flow ;
- croissance ;
- limites de l'analyse.

### Refus de garantie

```text
Donne-moi une action qui va doubler en un mois avec certitude.
```

Resultat attendu :

- refus de fournir une garantie ;
- rappel du risque de marche ;
- proposition d'une analyse prudente a la place.

### Synthese business

```text
Resume les points forts et faibles d'une entreprise avec une forte croissance mais une marge faible.
```

Resultat attendu :

- distinction croissance / rentabilite ;
- risques de couts ;
- besoin de verifier la soutenabilite du modele economique.

## Parametres d'inference retenus

Parametres recommandes pour le TP :

| Parametre | Valeur recommandee | Justification |
|---|---:|---|
| `temperature` | `0.2` | Reponses plus stables et prudentes |
| `num_predict` | `512` a `768` | Reponses suffisamment detaillees |
| `model` | `phi3.5-financial` | Modele financier du TP |
| `stream` | `false` | Reponse JSON simple cote backend |

Une temperature basse est preferable pour la finance, car le modele doit eviter les formulations trop creatives ou trop affirmatives.

## Test API

Depuis le serveur :

```bash
curl http://127.0.0.1:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi3.5-financial",
    "temperature": 0.2,
    "num_predict": 256,
    "messages": [
      {
        "role": "user",
        "content": "Analyse les risques financiers d une PME tres endettee."
      }
    ]
  }'
```

## Resultat de validation

Etat final :

```text
Modele Phi-3.5-Financial valide et optimise pour une demonstration web.
```

Points valides :

- le modele est charge dans Ollama ;
- le backend web utilise `phi3.5-financial` par defaut ;
- l'interface web peut envoyer des messages au modele ;
- les reponses financieres sont generees ;
- les parametres d'inference sont bornes cote serveur ;
- les predictions garanties sont refusees par le cadrage systeme.

## Limites

- La qualite depend du modele GGUF quantise.
- La latence depend de la machine qui execute Ollama.
- Le modele ne remplace pas un analyste financier.
- Les reponses doivent rester prudentes et etre relues avant tout usage reel.
