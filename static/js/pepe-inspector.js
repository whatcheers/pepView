class PepeInspector {
    constructor() {
        this.pepeSelect = document.getElementById('pepeSelect');
        this.pepeData = document.getElementById('pepeData');
        this.setupEventListeners();
        console.log('PepeInspector initialized');
    }

    setupEventListeners() {
        this.pepeSelect.addEventListener('change', () => this.handlePepeSelection());
    }

    async handlePepeSelection() {
        const selectedPepe = this.pepeSelect.value;
        if (!selectedPepe) return;
        
        console.log('Selected Pepe:', selectedPepe);
        
        try {
            const response = await fetch(`/api/pepe-info/${selectedPepe}`);
            console.log('API Response:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Pepe Data:', data);
            this.displayPepeData(data);
        } catch (error) {
            console.error('Error fetching pepe data:', error);
            this.pepeData.innerHTML = `<p class="error">Error loading Pepe data: ${error.message}</p>`;
        }
    }

    displayPepeData(data) {
        if (!data) {
            this.pepeData.innerHTML = '<p class="error">No data available</p>';
            return;
        }

        const marketData = data.market_data || {};
        const html = `
            <div class="data-grid">
                <div class="data-section">
                    <h3>Market Data</h3>
                    <p>Current Price: $${this.formatNumber(marketData.current_price?.usd)}</p>
                    <p>Market Cap: $${this.formatNumber(marketData.market_cap?.usd)}</p>
                    <p>24h Volume: $${this.formatNumber(marketData.total_volume?.usd)}</p>
                    <p>24h High: $${this.formatNumber(marketData.high_24h?.usd)}</p>
                    <p>24h Low: $${this.formatNumber(marketData.low_24h?.usd)}</p>
                </div>
                
                <div class="data-section">
                    <h3>Price Changes</h3>
                    <p>1h: ${this.formatNumber(marketData.price_change_percentage_1h_in_currency?.usd)}%</p>
                    <p>24h: ${this.formatNumber(marketData.price_change_percentage_24h)}%</p>
                    <p>7d: ${this.formatNumber(marketData.price_change_percentage_7d)}%</p>
                    <p>30d: ${this.formatNumber(marketData.price_change_percentage_30d)}%</p>
                </div>

                <div class="data-section">
                    <h3>Supply Information</h3>
                    <p>Circulating Supply: ${this.formatNumber(marketData.circulating_supply)}</p>
                    <p>Total Supply: ${this.formatNumber(marketData.total_supply)}</p>
                    <p>Max Supply: ${this.formatNumber(marketData.max_supply)}</p>
                </div>
            </div>
        `;

        this.pepeData.innerHTML = html;
    }

    formatNumber(num) {
        if (num === null || num === undefined) return 'N/A';
        if (num === 0) return '0';
        
        const absNum = Math.abs(num);
        if (absNum < 0.000001) return num.toExponential(2);
        if (absNum < 1) return num.toFixed(6);
        if (absNum < 1000) return num.toFixed(2);
        if (absNum < 1000000) return (num/1000).toFixed(2) + 'K';
        if (absNum < 1000000000) return (num/1000000).toFixed(2) + 'M';
        return (num/1000000000).toFixed(2) + 'B';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PepeInspector();
});