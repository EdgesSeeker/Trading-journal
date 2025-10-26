# SMA Cloud Monitoring - Deployment Instructions

## 🚀 Vercel Deployment

### Schritt 1: Vercel Account erstellen
1. Gehe zu https://vercel.com
2. Erstelle einen kostenlosen Account
3. Verbinde mit GitHub (empfohlen)

### Schritt 2: Repository erstellen
1. Erstelle ein neues GitHub Repository: `sma-monitor`
2. Lade die Dateien hoch:
   - `api/sma-monitor.js`
   - `vercel.json`

### Schritt 3: Vercel Deployment
1. Gehe zu https://vercel.com/dashboard
2. Klicke "New Project"
3. Importiere dein GitHub Repository
4. Vercel erkennt automatisch die Konfiguration
5. Klicke "Deploy"

### Schritt 4: Cron Job aktivieren
1. Gehe zu deinem Vercel Dashboard
2. Wähle dein Projekt
3. Gehe zu "Functions" → "Cron Jobs"
4. Aktiviere den Cron Job für alle 5 Minuten

## 📱 Frontend Integration

### Schritt 5: API URL aktualisieren
Nach dem Deployment erhältst du eine URL wie:
`https://sma-monitor-xyz.vercel.app`

Aktualisiere in `components/ProfitTakingView.tsx`:
```typescript
const CLOUD_API_URL = 'https://deine-vercel-url.vercel.app/api/sma-monitor';
```

## 🧪 Testing

### Schritt 6: Test durchführen
1. Starte deine lokale App
2. Gehe zu "Profit Taking"
3. Füge einen Test-Trade hinzu
4. Klicke "☁️ Cloud" Button
5. Du solltest eine Bestätigung erhalten

### Schritt 7: Cloud-Überwachung testen
1. Warte 5 Minuten
2. Gehe zu deiner Vercel Function URL
3. Du solltest die Überwachungsergebnisse sehen

## ✅ Fertig!

Deine Cloud-Lösung läuft jetzt 24/7 und überwacht automatisch alle Trades!
