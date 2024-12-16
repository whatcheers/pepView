class PepeInspector {
    constructor() {
        this.select = document.getElementById('pepeSelect');
        this.dataContainer = document.getElementById('pepeData');
        this.init();
    }

    init() {
        this.select.addEventListener('change', () => {
            this.loadPepeInfo();
            // Show loading state
            this.dataContainer.innerHTML = '<div class="loading">LOADING PEPE DATA...</div>';
        });
    }

    async loadPepeInfo() {
        const pepeId = this.select.value;
        if (!pepeId) {
            this.dataContainer.innerHTML = '<div class="message">SELECT A PEPE TO BEGIN</div>';
            return;
        }

        try {
            const response = await fetch(`/api/pepe-info/${pepeId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.displayPepeData(data);
        } catch (error) {
            console.error('Error loading pepe info:', error);
            this.dataContainer.innerHTML = `
                <div class="error">
                    <h2>ERROR FETCHING PEPE DATA</h2>
                    <div>PLEASE TRY AGAIN LATER</div>
                </div>
            `;
        }
    }

    displayPepeData(data) {
        const html = `
            <div class="section">
                <h2>■ LINKS</h2>
                <div class="subsection">
                    <div class="label">HOMEPAGE:</div>
                    ${this.generateHomeLinks(data.links?.homepage)}
                    
                    <div class="label">SOCIAL:</div>
                    <div class="social-links">
                        ${this.generateSocialLinks(data.links)}
                    </div>
                    
                    <div class="label">CODE:</div>
                    <div class="code-links">
                        ${this.generateCodeLinks(data.links)}
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ MARKET METRICS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">CURRENT PRICE:</div>
                        <div class="value">$${data.market_data?.current_price?.usd?.toFixed(8) || 'N/A'}</div>
                    </div>

                    <div class="metric">
                        <div class="label">MARKET CAP:</div>
                        <div class="value">$${this.formatNumber(data.market_data?.market_cap?.usd)} (#${data.market_cap_rank || 'N/A'})</div>
                    </div>

                    <div class="metric">
                        <div class="label">24H VOLUME:</div>
                        <div class="value">$${this.formatNumber(data.market_data?.total_volume?.usd)}</div>
                    </div>

                    <div class="metric">
                        <div class="label">VOL/MCAP RATIO:</div>
                        <div class="value">${this.calculateMcapVolumeRatio(data.market_data)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ SUPPLY METRICS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">CIRCULATING:</div>
                        <div class="value">${this.formatNumber(data.market_data?.circulating_supply)}</div>
                    </div>
                    <div class="metric">
                        <div class="label">TOTAL:</div>
                        <div class="value">${this.formatNumber(data.market_data?.total_supply)}</div>
                    </div>
                    <div class="metric">
                        <div class="label">MAX SUPPLY:</div>
                        <div class="value">${data.market_data?.max_supply_infinite ? '∞ (INFINITE)' : this.formatNumber(data.market_data?.max_supply)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ PRICE HISTORY</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">ALL TIME HIGH:</div>
                        <div class="value">$${data.market_data?.ath?.usd?.toFixed(8) || 'N/A'}</div>
                        <div class="value change ${this.getChangeClass(data.market_data?.ath_change_percentage?.usd)}">(${this.formatPercentage(data.market_data?.ath_change_percentage?.usd)})</div>
                    </div>
                    <div class="metric">
                        <div class="label">ALL TIME LOW:</div>
                        <div class="value">$${data.market_data?.atl?.usd?.toFixed(8) || 'N/A'}</div>
                        <div class="value change ${this.getChangeClass(data.market_data?.atl_change_percentage?.usd)}">(${this.formatPercentage(data.market_data?.atl_change_percentage?.usd)})</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ PRICE CHANGES</h2>
                <div class="subsection">
                    ${this.generatePriceChanges(data.market_data)}
                </div>
            </div>

            <div class="section">
                <h2>■ COMMUNITY METRICS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">TWITTER:</div>
                        <div class="value">${this.formatNumber(data.community_data?.twitter_followers)} FOLLOWERS</div>
                    </div>
                    <div class="metric">
                        <div class="label">TELEGRAM:</div>
                        <div class="value">${this.formatNumber(data.community_data?.telegram_channel_user_count)} MEMBERS</div>
                    </div>
                    <div class="metric">
                        <div class="label">SENTIMENT:</div>
                        <div class="value ${this.getSentimentClass(data)}">
                            ${data.sentiment_votes_up_percentage?.toFixed(1) || 0}% POSITIVE
                        </div>
                    </div>
                    <div class="metric">
                        <div class="label">WATCHLIST:</div>
                        <div class="value">${this.formatNumber(data.watchlist_portfolio_users)} USERS</div>
                    </div>
                </div>
            </div>
        `;
        this.dataContainer.innerHTML = html;
    }

    generateHomeLinks(homepageLinks) {
        if (!homepageLinks?.length) return 'N/A';
        return homepageLinks
            .filter(url => url)
            .map(url => `<a href="${url}" target="_blank" class="link">🌐 ${this.formatUrl(url)}</a>`)
            .join(' ');
    }

    generateSocialLinks(links) {
        const socialLinks = [
            { key: 'twitter_screen_name', icon: '🐦', prefix: 'https://twitter.com/' },
            { key: 'telegram_channel_identifier', icon: '📱', prefix: 'https://t.me/' },
            { key: 'subreddit_url', icon: '📢', label: 'Reddit' },
            { key: 'chat_url', icon: '💬', label: 'Discord' }
        ];

        return socialLinks
            .map(({ key, icon, prefix, label }) => {
                const value = links[key];
                if (!value) return '';
                const url = prefix ? prefix + value : value;
                return `<a href="${url}" target="_blank" class="link">${icon} ${label || value}</a>`;
            })
            .filter(link => link)
            .join(' ');
    }

    generateCodeLinks(links) {
        if (!links?.repos_url?.github?.length) return 'N/A';
        return links.repos_url.github
            .map(url => `<a href="${url}" target="_blank" class="link">⬡ GitHub</a>`)
            .join(' ');
    }

    generatePriceChanges(marketData) {
        const periods = [
            { label: '1 HOUR', key: 'price_change_percentage_1h_in_currency.usd' },
            { label: '24 HOURS', key: 'price_change_percentage_24h' },
            { label: '7 DAYS', key: 'price_change_percentage_7d' }
        ];

        return periods.map(period => {
            const value = this.getNestedValue(marketData, period.key);
            const colorClass = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
            return `
                <div class="metric">
                    <div class="label">${period.label}:</div>
                    <div class="value ${colorClass}">${this.formatPercentage(value)}</div>
                </div>
            `;
        }).join('');
    }

    formatUrl(url) {
        return url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30) + (url.length > 30 ? '...' : '');
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    formatPercentage(value) {
        if (!value) return 'N/A';
        const formatted = value.toFixed(2);
        return `${formatted}%`;
    }

    formatNumber(num) {
        if (!num) return 'N/A';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    calculatePercentage(value, total) {
        if (!value || !total) return '0.00';
        return ((value / total) * 100).toFixed(2);
    }

    formatSentiment(data) {
        const upPercentage = data.sentiment_votes_up_percentage;
        const downPercentage = data.sentiment_votes_down_percentage;
        if (!upPercentage && !downPercentage) return 'N/A';
        const sentimentClass = upPercentage > downPercentage ? 'positive' : 'negative';
        return `<span class="${sentimentClass}">${upPercentage.toFixed(1)}% POSITIVE</span>`;
    }

    formatCategories(categories) {
        if (!categories?.length) return 'N/A';
        return categories.join(' • ');
    }

    calculateMcapVolumeRatio(marketData) {
        if (!marketData?.market_cap?.usd || !marketData?.total_volume?.usd) return 'N/A';
        const ratio = marketData.market_cap.usd / marketData.total_volume.usd;
        return ratio.toFixed(2);
    }

    getChangeClass(value) {
        if (!value) return '';
        return value > 0 ? 'positive' : 'negative';
    }

    getSentimentClass(data) {
        if (!data.sentiment_votes_up_percentage) return '';
        return data.sentiment_votes_up_percentage >= 50 ? 'positive' : 'negative';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PepeInspector();
});