// Simple API service for n8n to fetch active price alerts
// This creates a local endpoint that n8n can call to get alert data

interface PriceAlert {
  id: string;
  symbol: string;
  alertPrice: number;
  isAbove: boolean;
  active: boolean;
  createdAt: string;
}

class PriceAlertsAPI {
  private alerts: PriceAlert[] = [];

  // Load alerts from localStorage
  loadAlerts(): void {
    try {
      const savedAlerts = localStorage.getItem('priceAlerts');
      if (savedAlerts) {
        this.alerts = JSON.parse(savedAlerts);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      this.alerts = [];
    }
  }

  // Get active alerts for n8n
  getActiveAlerts(): PriceAlert[] {
    this.loadAlerts();
    return this.alerts.filter(alert => alert.active);
  }

  // Get alerts for specific symbol
  getAlertsForSymbol(symbol: string): PriceAlert[] {
    this.loadAlerts();
    return this.alerts.filter(alert => 
      alert.active && alert.symbol.toUpperCase() === symbol.toUpperCase()
    );
  }

  // Get all alerts (for debugging)
  getAllAlerts(): PriceAlert[] {
    this.loadAlerts();
    return this.alerts;
  }

  // Add alert
  addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): void {
    const newAlert: PriceAlert = {
      ...alert,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    this.alerts.push(newAlert);
    this.saveAlerts();
  }

  // Update alert
  updateAlert(id: string, updates: Partial<PriceAlert>): void {
    const index = this.alerts.findIndex(alert => alert.id === id);
    if (index !== -1) {
      this.alerts[index] = { ...this.alerts[index], ...updates };
      this.saveAlerts();
    }
  }

  // Delete alert
  deleteAlert(id: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== id);
    this.saveAlerts();
  }

  // Save alerts to localStorage
  private saveAlerts(): void {
    try {
      localStorage.setItem('priceAlerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  }

  // Create a simple HTTP endpoint simulation
  // This would normally be a real API endpoint
  createMockEndpoint(): void {
    // In a real app, this would be an Express.js endpoint
    // For now, we'll create a simple function that n8n can call
    console.log('Mock API endpoint created. In production, this would be a real HTTP endpoint.');
  }
}

// Export singleton instance
const priceAlertsAPI = new PriceAlertsAPI();
export default priceAlertsAPI;
