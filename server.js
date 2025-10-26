// Express.js API Server für Price Alerts
// Läuft auf Port 3001 und stellt API-Endpoints für n8n bereit

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Daten-Datei Pfad
const DATA_FILE = path.join(__dirname, 'data', 'price-alerts.json');

// Sicherstellen, dass data Ordner existiert
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initiale Daten-Datei erstellen falls nicht vorhanden
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Hilfsfunktionen
const readAlerts = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading alerts:', error);
    return [];
  }
};

const writeAlerts = (alerts) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(alerts, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing alerts:', error);
    return false;
  }
};

// API Endpoints

// GET /api/alerts - Alle aktiven Alerts abrufen
app.get('/api/alerts', (req, res) => {
  try {
    const alerts = readAlerts();
    const activeAlerts = alerts.filter(alert => alert.active);
    
    res.json({
      success: true,
      data: activeAlerts,
      count: activeAlerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      message: error.message
    });
  }
});

// GET /api/alerts/:symbol - Alerts für bestimmtes Symbol
app.get('/api/alerts/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const alerts = readAlerts();
    const symbolAlerts = alerts.filter(alert => 
      alert.active && alert.symbol.toUpperCase() === symbol
    );
    
    res.json({
      success: true,
      data: symbolAlerts,
      symbol: symbol,
      count: symbolAlerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts for symbol',
      message: error.message
    });
  }
});

// POST /api/alerts - Neuen Alert hinzufügen
app.post('/api/alerts', (req, res) => {
  try {
    const { symbol, alertPrice, isAbove, active = true } = req.body;
    
    if (!symbol || !alertPrice) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and alertPrice are required'
      });
    }
    
    const alerts = readAlerts();
    const newAlert = {
      id: Date.now().toString(),
      symbol: symbol.toUpperCase(),
      alertPrice: parseFloat(alertPrice),
      isAbove: Boolean(isAbove),
      active: Boolean(active),
      createdAt: new Date().toISOString()
    };
    
    alerts.push(newAlert);
    
    if (writeAlerts(alerts)) {
      res.json({
        success: true,
        data: newAlert,
        message: 'Alert created successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save alert'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
      message: error.message
    });
  }
});

// PUT /api/alerts/:id - Alert aktualisieren
app.put('/api/alerts/:id', (req, res) => {
  try {
    const alertId = req.params.id;
    const updates = req.body;
    
    const alerts = readAlerts();
    const alertIndex = alerts.findIndex(alert => alert.id === alertId);
    
    if (alertIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    alerts[alertIndex] = { ...alerts[alertIndex], ...updates };
    
    if (writeAlerts(alerts)) {
      res.json({
        success: true,
        data: alerts[alertIndex],
        message: 'Alert updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update alert'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update alert',
      message: error.message
    });
  }
});

// DELETE /api/alerts/:id - Alert löschen
app.delete('/api/alerts/:id', (req, res) => {
  try {
    const alertId = req.params.id;
    const alerts = readAlerts();
    const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
    
    if (alerts.length === filteredAlerts.length) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    if (writeAlerts(filteredAlerts)) {
      res.json({
        success: true,
        message: 'Alert deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert',
      message: error.message
    });
  }
});

// GET /api/trades - Alle offenen Trades mit SMA-Indikatoren abrufen
app.get('/api/trades', (req, res) => {
  try {
    // In einer echten App würdest du hier die Trades aus der Datenbank laden
    // Für jetzt verwenden wir die Alerts als Trades (da sie die gleiche Struktur haben)
    const alerts = readAlerts();
    const tradesWithMA = alerts.filter(alert => 
      alert.active && alert.trailingMA && alert.trailingMA !== ''
    );
    
    res.json({
      success: true,
      data: tradesWithMA,
      count: tradesWithMA.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades',
      message: error.message
    });
  }
});

// GET /api/sync - Synchronisation mit Frontend (für manuelle Updates)
app.post('/api/sync', (req, res) => {
  try {
    const { alerts } = req.body;
    
    if (!Array.isArray(alerts)) {
      return res.status(400).json({
        success: false,
        error: 'Alerts must be an array'
      });
    }
    
    if (writeAlerts(alerts)) {
      res.json({
        success: true,
        message: 'Alerts synchronized successfully',
        count: alerts.length
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to synchronize alerts'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to synchronize alerts',
      message: error.message
    });
  }
});

// Server starten
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Price Alerts API Server läuft auf Port ${PORT}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/alerts`);
  console.log(`   GET  http://localhost:${PORT}/api/alerts/:symbol`);
  console.log(`   POST http://localhost:${PORT}/api/alerts`);
  console.log(`   PUT  http://localhost:${PORT}/api/alerts/:id`);
  console.log(`   DELETE http://localhost:${PORT}/api/alerts/:id`);
  console.log(`   POST http://localhost:${PORT}/api/sync`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server wird heruntergefahren...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Server wird heruntergefahren...');
  process.exit(0);
});
