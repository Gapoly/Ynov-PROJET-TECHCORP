# Web - Interface Chat IA

Interface web minimaliste pour interagir avec le modèle financier `phi3.5-financial` via Ollama.

## Contenu

```text
Web/
|-- backend/
|   `-- server.py
|-- frontend/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- Modelfile.phi3-financial
|-- server.log
|-- server.pid
`-- server.port
```

## Lancement

Depuis le dossier `Web/` :

```bash
cd /home/dev/Ynov-PROJET-TECHCORP/Web
PORT=8080 BIND=0.0.0.0 CHAT_MODEL=phi3.5-financial python3 backend/server.py
```

Interface publique :

```text
http://158.158.3.207:8080/
```

## Variables utiles

| Variable | Valeur | Description |
|---|---|---|
| `PORT` | `8080` | Port du serveur web |
| `BIND` | `0.0.0.0` | Exposition sur l'IP publique |
| `OLLAMA_HOST` | `http://localhost:11434` | URL locale d'Ollama |
| `CHAT_MODEL` | `phi3.5-financial` | Modèle utilisé par défaut |

## Endpoints

| Endpoint | Rôle |
|---|---|
| `/` | Interface web |
| `/health` | État du service et du modèle |
| `/api/chat` | API utilisée par le frontend |

## Vérification rapide

```bash
curl http://158.158.3.207:8080/health
```

Réponse attendue :

```json
{
  "service": "simple-ai-chat",
  "ollama_reachable": true,
  "status": "ok",
  "default_model": "phi3.5-financial"
}
```

## Notes

- Ollama doit être lancé sur `localhost:11434`.
- L'interface possède un thème clair/sombre.
- Le backend limite les modèles autorisés et rejette les entrées invalides.
