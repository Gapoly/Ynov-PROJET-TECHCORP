# Chat IA

Interface web locale minimaliste, avec thème clair/sombre, pour discuter avec le modèle financier du TP.

## Lancement rapide

```bash
cd /home/dev/techcorp-ai-chat
export OLLAMA_HOST=http://localhost:11434
export CHAT_MODEL=phi3.5-financial
python3 backend/server.py
```

Ouvrir ensuite `http://127.0.0.1:8080`.

## Variables utiles

| Variable | Valeur par defaut | Role |
|---|---:|---|
| `OLLAMA_HOST` | `http://localhost:11434` | URL du serveur d'inference |
| `CHAT_MODEL` | `phi3.5-financial` | Nom du modele expose par Ollama |
| `PORT` | `8080` | Port de l'interface |
| `BIND` | `127.0.0.1` | Interface reseau ecoutee |

Le modele par defaut est le modele finance du TP.
