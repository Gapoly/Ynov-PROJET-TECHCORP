# Partie IA — Modèle médical expérimental (Fine-tuning LoRA)

## 1. Objectif de la mission (rappel du TP)

Le brief TechCorp confie au rôle **IA** une mission **expérimentale (R&D)**, distincte de la
mission critique (servir Phi-3.5-Financial). Il s'agit de :

- Fine-tuner un **modèle médical expérimental** par **LoRA**, à partir du dataset de
  conversations médicales fourni.
- Tester et valider ses **performances conversationnelles**.

Le brief précise explicitement que ce modèle **reste expérimental** : il n'a **pas** à être
déployé en production, contrairement au modèle financier. Le livrable attendu est donc le
**modèle médical fine-tuné (adaptateur LoRA)** accompagné de ses tests.

> ⚠️ **Avertissement.** Ce modèle est une démonstration technique. Ce **n'est pas un dispositif
> médical** et il ne doit en aucun cas être utilisé pour de vrais conseils de santé.

---

## 2. Environnement d'exécution — Google Colab

Tout le fine-tuning médical a été réalisé sur **Google Colab**, et **non sur la VM Azure**. Ce
choix est central dans l'architecture du projet.

### Pourquoi Colab et pas la VM Azure ?

- **Le fine-tuning a besoin d'un GPU.** Entraîner un modèle (même en LoRA) sur CPU est beaucoup
  trop lent. Or la VM Azure du projet est une machine **CPU**, dédiée à *servir* le modèle
  financier (Phi-3.5-Financial via Ollama). Elle n'a pas de GPU.
- **Colab fournit un GPU gratuit.** La version gratuite de Colab donne accès à un **GPU NVIDIA
  T4 (~15 Go de VRAM)**, largement suffisant pour fine-tuner un modèle de 3,8 Md de paramètres
  en 4-bit. Le brief mentionnait Colab Pro, mais **la version gratuite a suffi**.
- **Pas de quota GPU à demander.** Sur Azure, déployer une VM avec GPU (série NC) implique une
  demande d'augmentation de quota qui peut prendre des heures — bloquant en hackathon. Colab
  évite totalement ce problème.

### Répartition des deux environnements

| Environnement | Rôle | Matériel |
|---------------|------|----------|
| **VM Azure** | *Sert* Phi-3.5-Financial (production) + interface web | CPU |
| **Google Colab** | *Entraîne* le modèle médical (R&D) | GPU T4 (gratuit) |

Les deux ne se croisent jamais : le financier vit sur Azure, le médical naît et s'entraîne sur
Colab. Seul l'**adaptateur LoRA** produit par Colab est exporté en fin de course.

### Déroulé concret sur Colab

1. Ouvrir [colab.research.google.com](https://colab.research.google.com) avec un compte Google.
2. Importer le notebook `finetune_medical_hf.ipynb` (`Fichier > Importer un notebook`).
3. **Activer le GPU** : `Exécution > Modifier le type d'exécution > T4 GPU`.
4. Exécuter les cellules dans l'ordre (`Exécution > Tout exécuter`).
5. En fin de run, télécharger l'adaptateur via le panneau **Fichiers** (icône dossier) de Colab.

> Remarque : les fichiers générés sur Colab sont **temporaires**. Il faut télécharger
> `lora_medical.zip` sur sa machine avant que la session ne se déconnecte.

---

## 3. Choix techniques et justifications

| Choix | Décision | Pourquoi |
|-------|----------|----------|
| **Modèle de base** | `microsoft/Phi-3.5-mini-instruct` (~3,8 Md de paramètres) | Petit modèle, bon compromis qualité/temps, tourne sur GPU gratuit. Distinct du modèle financier (lui déjà entraîné et servi). |
| **Méthode** | **QLoRA** (LoRA + quantization 4-bit) | Réentraîner les 3,8 Md de paramètres est impossible en temps de hackathon. On **gèle** le modèle de base et on n'entraîne qu'un petit **adaptateur** (~0,78 % des paramètres). |
| **Quantization** | 4-bit (NF4, double quant) | Permet de charger le modèle dans les ~15 Go d'un GPU T4 gratuit. |
| **Plateforme** | **Google Colab (GPU T4 gratuit)** | Le fine-tuning nécessite un GPU ; la VM Azure (CPU) sert uniquement le modèle financier. Colab évite la demande de quota GPU Azure. |
| **Dataset** | `ruslanmv/ai-medical-chatbot` (~250k dialogues Patient/Docteur) | Dataset médical fourni dans le TP. Sous-échantillonné à **1000 dialogues** pour tenir dans le temps imparti. |
| **Librairies** | Hugging Face **Transformers + PEFT + TRL + bitsandbytes** | Stack standard et fiable (voir section 4 sur l'abandon d'Unsloth). |

---

## 4. Pipeline de fine-tuning

Le notebook (`finetune_medical_hf.ipynb`), exécuté sur Colab, suit 7 étapes.

### 4.1 — Chargement du modèle en 4-bit

```python
bnb_config = BitsAndBytesConfig(
    load_in_4bit = True,
    bnb_4bit_quant_type = "nf4",
    bnb_4bit_compute_dtype = torch.float16,
    bnb_4bit_use_double_quant = True,
)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config = bnb_config,
    device_map = "auto",
    dtype = torch.float16,
)
model.config.use_cache = False
```

Le modèle est téléchargé depuis Hugging Face et chargé compressé en 4-bit dans le GPU T4 de Colab. `dtype=torch.float16` force la cohérence de précision
avec le T4 (qui ne supporte pas le bfloat16).

### 4.2 — Greffe de l'adaptateur LoRA (PEFT)

```python
model = prepare_model_for_kbit_training(model)
lora_config = LoraConfig(
    r = 16, lora_alpha = 16, lora_dropout = 0, bias = "none",
    task_type = "CAUSAL_LM",
    target_modules = ["q_proj","k_proj","v_proj","o_proj",
                      "gate_proj","up_proj","down_proj"],
)
model = get_peft_model(model, lora_config)
```

On insère les matrices LoRA (rang `r=16`) sur les couches d'attention et les couches MLP. Seuls
ces ~30 millions de paramètres sont entraînables — le reste du modèle est gelé.

### 4.3 — Préparation des données

```python
dataset = load_dataset("ruslanmv/ai-medical-chatbot", split="train")
dataset = dataset.shuffle(seed=42).select(range(1000))
# Patient -> rôle "user", Doctor -> rôle "assistant"
# formaté au gabarit chat de phi-3.5 : <|user|> ... <|end|> <|assistant|> ...
```

Les colonnes `Patient` (question) et `Doctor` (réponse) sont mises au **gabarit de conversation
de Phi-3.5** (`<|user|> … <|end|> <|assistant|> …`). Ce formatage est critique : sans lui, le
modèle s'entraîne sur du bruit.

### 4.4 — Entraînement

```python
trainer = SFTTrainer(
    model = model, train_dataset = dataset, processing_class = tokenizer,
    args = SFTConfig(
        dataset_text_field = "text", max_length = 1024,
        per_device_train_batch_size = 2, gradient_accumulation_steps = 4,
        max_steps = 60, learning_rate = 2e-4,
        fp16 = False, bf16 = False,
        optim = "paged_adamw_8bit", lr_scheduler_type = "linear",
        save_strategy = "no",
    ),
)
trainer.train()
```

Entraînement court de démonstration : **60 steps**, batch effectif de 8
(2 × 4 accumulations), learning rate `2e-4` typique pour du LoRA.

### 4.5 — Test, puis sauvegarde de l'adaptateur

Génération manuelle (token par token) puis :

```python
model.save_pretrained("lora_medical")
tokenizer.save_pretrained("lora_medical")
```

L'adaptateur LoRA sauvegardé dans `lora_medical/` **est le livrable**.

---

## 5. Problèmes rencontrés et résolutions

Le TP insiste sur le fait d'explorer/déboguer le travail hérité. Voici les obstacles techniques
réels rencontrés et corrigés au cours du déploiement sur Colab.

### 5.1 — Abandon d'Unsloth (loss bloquée)

La première approche utilisait **Unsloth** (librairie d'accélération). Résultat : la **loss
restait plate à ~8-9** sur tous les steps → le modèle **n'apprenait rien**. Diagnostic : bug
connu d'Unsloth avec Phi-3.5 dans cette combinaison de versions (le patch d'accélération casse
le calcul de la loss). 

**Solution :** abandon d'Unsloth au profit de la stack **Hugging Face pure (PEFT + TRL)**, après
**redémarrage de la session Colab** pour effacer les patches résiduels. La loss s'est alors comportée
normalement.

### 5.2 — Conflit de précision fp16 / bf16 sur T4

Erreur `NotImplementedError: ... not implemented for 'BFloat16'`. Le **T4 de Colab** ne supporte pas le
bfloat16, et le grad-scaler fp16 entrait en conflit avec des paramètres bf16.

**Solution :** `dtype=torch.float16` au chargement **et** `fp16=False`, `bf16=False` à
l'entraînement (l'adaptateur LoRA, minuscule, s'entraîne en pleine précision sans surcoût mémoire
notable).

### 5.3 — Incompatibilités de `generate()` (Transformers 5.x)

Plusieurs erreurs successives au moment du test (`KeyError: 'shape'`, `prob_dist must be 1 or 2
dim`, `Tensors must have same number of dimensions`) dues à des changements d'API dans la version
très récente de Transformers préinstallée sur Colab.

**Solution :** contournement de `generate()` par une **boucle de génération manuelle** qui ne
prend que les logits du dernier token à chaque étape, avec **pénalité de répétition** et
**température** pour éviter les boucles.

---

## 6. Résultats

### Apprentissage (preuve chiffrée)

| Indicateur | Valeur |
|------------|--------|
| Loss au step 1 | **≈ 3,35** |
| Loss au step 60 | **≈ 2,40** |
| Loss moyenne | ≈ 2,65 |
| Paramètres entraînés | 29,9 M / 3,85 Md (**0,78 %**) |

La **baisse régulière de la loss (3,35 → 2,40)** démontre que l'adaptateur LoRA a bien appris à
partir des données médicales.

### Test conversationnel

Question posée (non vue à l'entraînement) :
> *« I've had a sore throat and a mild fever for 3 days. What should I do? »*

Le modèle répond dans le **bon registre médical** : il identifie une probable infection des voies
respiratoires supérieures, suggère un traitement symptomatique (paracétamol), et mentionne des
**signaux d'alerte** (essoufflement, suspicion de pneumonie) justifiant une consultation. Le ton
« médecin » du dataset a bien été assimilé.

---

## 7. Limites et lecture critique (volet validation / sécurité)

- **Hallucinations.** Sur des générations longues, le modèle invente du vocabulaire pseudo-médical.
  C'est attendu pour un entraînement court (60 steps) sur un petit modèle.
- **Non fiabilité médicale.** Le modèle reproduit le *style* des réponses du dataset, pas une
  expertise validée. Il ne constitue **pas** une source médicale sûre.
- **Biais du dataset.** Les réponses héritent des biais et de la qualité variable du dataset
  d'origine.

Ces limites confirment le positionnement voulu par le TP : modèle **expérimental, hors
production**. Elles rejoignent directement le volet **CYBER** du projet (robustesse, absence de
biais problématiques).

---

## 8. Livrable

- **Adaptateur LoRA médical** : `lora_medical/` (téléchargé depuis Colab en `lora_medical.zip`).
- **Notebook reproductible** : `finetune_medical_hf.ipynb` (à exécuter sur Google Colab, GPU T4).
- Pour réutiliser le modèle : recharger le modèle de base `microsoft/Phi-3.5-mini-instruct` en
  4-bit, puis appliquer l'adaptateur LoRA par-dessus (`PeftModel.from_pretrained`).
