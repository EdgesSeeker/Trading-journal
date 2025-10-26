# Dockerfile für Price Alerts API Server
FROM node:18-alpine

# Arbeitsverzeichnis erstellen
WORKDIR /app

# Package.json kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm install

# App-Dateien kopieren
COPY . .

# Port freigeben
EXPOSE 3001

# Server starten
CMD ["npm", "start"]
