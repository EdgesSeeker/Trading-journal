# Price Alerts API Server mit Docker

Dieser Docker-Setup erstellt einen lokalen API-Server für deine Price Alerts, der von n8n abgefragt werden kann.

## 🚀 Schnellstart

### Schritt 1: Docker Container starten
```bash
# Im Hauptverzeichnis deines Projekts
docker-compose up -d
```

### Schritt 2: API testen
```bash
# Health Check
curl http://localhost:3001/api/health

# Alle Alerts abrufen
curl http://localhost:3001/api/alerts
```

### Schritt 3: In deiner App verwenden
1. Öffne die **Price Alerts** Seite
2. Du siehst **"API: Verbunden"** im Header
3. Füge Alerts hinzu - sie werden automatisch mit der API synchronisiert

## 📡 API Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/health` | Health Check |
| GET | `/api/alerts` | Alle aktiven Alerts |
| GET | `/api/alerts/:symbol` | Alerts für bestimmtes Symbol |
| POST | `/api/alerts` | Neuen Alert hinzufügen |
| PUT | `/api/alerts/:id` | Alert aktualisieren |
| DELETE | `/api/alerts/:id` | Alert löschen |
| POST | `/api/sync` | Synchronisation mit Frontend |

## 🔧 n8n Workflow Setup

### Schritt 1: Cron Trigger
- **Interval:** 5 Minuten

### Schritt 2: HTTP Request (API abfragen)
- **Method:** GET
- **URL:** `http://localhost:3001/api/alerts`

### Schritt 3: Split In Batches
- **Batch Size:** 1
- **Options:** Split into individual items

### Schritt 4: HTTP Request (Yahoo Finance)
- **Method:** GET
- **URL:** `https://query1.finance.yahoo.com/v8/finance/chart/{{$json.symbol}}`

### Schritt 5: IF Node (Preisvergleich)
- **Condition:** `{{$json.chart.result[0].meta.regularMarketPrice}} < {{$json.alertPrice}}`
- **Operation:** smaller

### Schritt 6: Discord Webhook
- **URL:** `https://discord.com/api/webhooks/1431993168697757706/IPp6aglCK8nV-e_8EVnAjFVhti41cJUh8ZSWkTgB_vwr2d0V9XKd9Slcm1r9Em35bXP2`
- **Content:**
```
🚨 **Price Alert** 🚨

**{{$json.symbol}}** ist unter **${{$json.alertPrice}}** gefallen!

Aktueller Preis: **${{$json.chart.result[0].meta.regularMarketPrice}}**
Zeit: {{new Date().toLocaleString('de-DE')}}
```

## 🐳 Docker Befehle

```bash
# Container starten
docker-compose up -d

# Container stoppen
docker-compose down

# Logs anzeigen
docker-compose logs -f

# Container neu bauen
docker-compose up --build -d

# Container Status prüfen
docker-compose ps
```

## 📁 Dateien

- `Dockerfile` - Docker Image Definition
- `docker-compose.yml` - Docker Compose Konfiguration
- `server.js` - Express.js API Server
- `package-api.json` - Node.js Dependencies
- `data/price-alerts.json` - Alert-Daten (wird automatisch erstellt)

## 🔍 Troubleshooting

### API nicht erreichbar
```bash
# Container Status prüfen
docker-compose ps

# Logs anzeigen
docker-compose logs price-alerts-api

# Container neu starten
docker-compose restart
```

### Port bereits belegt
```bash
# Anderen Port verwenden
docker-compose down
# In docker-compose.yml Port ändern: "3002:3001"
docker-compose up -d
```

### Daten verloren
```bash
# Daten sind in ./data/price-alerts.json gespeichert
# Backup erstellen:
cp ./data/price-alerts.json ./backup-$(date +%Y%m%d).json
```

## 🎯 Vorteile dieser Lösung

✅ **Echte API-Verbindung** zwischen App und n8n  
✅ **Automatische Synchronisation** der Alerts  
✅ **Persistente Datenspeicherung** in Docker Volume  
✅ **Einfache Wartung** mit Docker Compose  
✅ **Skalierbar** für mehrere n8n Workflows  

## 📞 Support

Bei Problemen:
1. Prüfe Docker Container Status
2. Schaue in die Logs
3. Teste API-Endpoints mit curl
4. Überprüfe n8n Workflow-Konfiguration
