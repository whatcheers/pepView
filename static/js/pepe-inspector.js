class PepeInspector {
    constructor() {
        this.select = document.getElementById('pepeSelect');
        this.dataContainer = document.getElementById('pepeData');
        this.init();
    }

    init() {
        this.select.addEventListener('change', () => {
            if (this.select.value) {
                this.dataContainer.innerHTML = '<div class="loading">LOADING PEPE DATA...</div>';
                this.loadPepeInfo();
            } else {
                this.dataContainer.innerHTML = '<div class="message">SELECT A PEPE TO BEGIN</div>';
            }
        });
    }

    async loadPepeInfo() {
        const pepeId = this.select.value;
        if (!pepeId) return;

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
        // Update header with coin name and symbol
        document.querySelector('.header').innerHTML = `
            <div class="coin-info">
                <div class="coin-logo-container">
                    <div class="logo-label">${data.name.toUpperCase()} LOGO</div>
                    <img src="${data.image?.large}" alt="${data.name} logo" class="coin-logo">
                </div>
                <div class="coin-title">
                    <div class="coin-name">${data.name}</div>
                    <div class="coin-symbol">${data.symbol?.toUpperCase()}</div>
                </div>
            </div>
        `;

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
                        <div class="value">${this.formatNumber(data.market_data?.max_supply)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ PRICE HISTORY</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">ALL TIME HIGH:</div>
                        <div class="value">$${data.market_data?.ath?.usd?.toFixed(8) || 'N/A'}</div>
                        <div class="value change ${this.getChangeClass(data.market_data?.ath_change_percentage?.usd)}">
                            (${this.formatPercentage(data.market_data?.ath_change_percentage?.usd)})
                        </div>
                    </div>
                    <div class="metric">
                        <div class="label">ALL TIME LOW:</div>
                        <div class="value">$${data.market_data?.atl?.usd?.toFixed(8) || 'N/A'}</div>
                        <div class="value change ${this.getChangeClass(data.market_data?.atl_change_percentage?.usd)}">
                            (${this.formatPercentage(data.market_data?.atl_change_percentage?.usd)})
                        </div>
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
                        <div class="label">REDDIT SUBS:</div>
                        <div class="value">${this.formatNumber(data.community_data?.reddit_subscribers)} MEMBERS</div>
                    </div>
                    <div class="metric">
                        <div class="label">REDDIT ACTIVE:</div>
                        <div class="value">${this.formatNumber(data.community_data?.reddit_accounts_active_48h)} USERS</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ DEVELOPER METRICS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">GITHUB STARS:</div>
                        <div class="value">${this.formatNumber(data.developer_data?.stars)}</div>
                    </div>
                    <div class="metric">
                        <div class="label">TOTAL COMMITS:</div>
                        <div class="value">${this.formatNumber(data.developer_data?.total_commits)}</div>
                    </div>
                    <div class="metric">
                        <div class="label">RECENT COMMITS:</div>
                        <div class="value">${this.formatNumber(data.developer_data?.commit_count_4_weeks)} (4W)</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ TRADING METRICS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">BTC PRICE:</div>
                        <div class="value">${data.market_data?.current_price?.btc?.toFixed(8) || 'N/A'} BTC</div>
                    </div>
                    <div class="metric">
                        <div class="label">ETH PRICE:</div>
                        <div class="value">${data.market_data?.current_price?.eth?.toFixed(8) || 'N/A'} ETH</div>
                    </div>
                    <div class="metric">
                        <div class="label">TRUST SCORE:</div>
                        <div class="value">${data.tickers?.[0]?.trust_score || 'N/A'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">BID/ASK SPREAD:</div>
                        <div class="value">${data.tickers?.[0]?.bid_ask_spread_percentage?.toFixed(2) || 'N/A'}%</div>
                    </div>
                    <div class="metric">
                        <div class="label">LAST TRADED:</div>
                        <div class="value">${this.formatDate(data.tickers?.[0]?.last_traded_at)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ TECHNICAL DETAILS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">CONTRACT:</div>
                        <div class="value">${data.contract_address || 'N/A'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">PLATFORM:</div>
                        <div class="value">${data.asset_platform_id || 'N/A'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">HASH ALGO:</div>
                        <div class="value">${data.hashing_algorithm || 'N/A'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">DECIMALS:</div>
                        <div class="value">${data.detail_platforms?.decimal_place || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ VALIDITY METRICS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">DATA ANOMALY:</div>
                        <div class="value">${data.is_anomaly ? 'YES' : 'NO'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">DATA STALE:</div>
                        <div class="value">${data.is_stale ? 'YES' : 'NO'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">PUBLIC NOTICE:</div>
                        <div class="value">${data.public_notice || 'NONE'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">CATEGORIES:</div>
                        <div class="value">${this.formatCategories(data.categories)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ SENTIMENT METRICS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">POSITIVE VOTES:</div>
                        <div class="value">${data.sentiment_votes_up_percentage?.toFixed(2) || 'N/A'}%</div>
                    </div>
                    <div class="metric">
                        <div class="label">NEGATIVE VOTES:</div>
                        <div class="value">${data.sentiment_votes_down_percentage?.toFixed(2) || 'N/A'}%</div>
                    </div>
                    <div class="metric">
                        <div class="label">WATCHLIST USERS:</div>
                        <div class="value">${this.formatNumber(data.watchlist_portfolio_users)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ PLATFORM INFO</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">PLATFORM:</div>
                        <div class="value">${data.asset_platform_id || 'N/A'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">BLOCK TIME:</div>
                        <div class="value">${data.block_time_in_minutes || 'N/A'} MINUTES</div>
                    </div>
                    <div class="metric">
                        <div class="label">CATEGORIES:</div>
                        <div class="value">${data.categories?.join(' • ') || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ MARKET DETAILS</h2>
                <div class="subsection">
                    <div class="metric">
                        <div class="label">MARKET CAP RANK:</div>
                        <div class="value">#${data.market_cap_rank || 'N/A'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">MCAP/TVL RATIO:</div>
                        <div class="value">${data.market_data?.mcap_to_tvl_ratio || 'N/A'}</div>
                    </div>
                    <div class="metric">
                        <div class="label">FDV/TVL RATIO:</div>
                        <div class="value">${data.market_data?.fdv_to_tvl_ratio || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>■ EXCHANGE INFO</h2>
                <div class="subsection">
                    ${this.generateExchangeInfo(data.tickers)}
                </div>
            </div>
        `;
        
        this.dataContainer.innerHTML = html;
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

    formatUrl(url) {
        return url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30) + (url.length > 30 ? '...' : '');
    }

    formatNumber(num) {
        if (!num) return 'N/A';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    calculateMcapVolumeRatio(marketData) {
        if (!marketData?.market_cap?.usd || !marketData?.total_volume?.usd) return 'N/A';
        const ratio = marketData.market_cap.usd / marketData.total_volume.usd;
        return ratio.toFixed(2);
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    formatPercentage(value) {
        if (!value) return 'N/A';
        const formatted = value.toFixed(2);
        return `${formatted}%`;
    }

    getChangeClass(value) {
        if (!value) return '';
        return value > 0 ? 'positive' : 'negative';
    }

    formatDate(date) {
        if (!date) return 'N/A';
        const formattedDate = new Date(date).toLocaleString();
        return formattedDate;
    }

    formatCategories(categories) {
        if (!categories?.length) return 'N/A';
        return categories.join(' • ');
    }

    generateExchangeInfo(tickers) {
        if (!tickers?.length) return '<div class="value">NO EXCHANGE DATA</div>';
        
        return tickers.slice(0, 3).map(ticker => `
            <div class="exchange-info">
                <div class="metric">
                    <div class="label">EXCHANGE:</div>
                    <div class="value">${ticker.market.name}</div>
                </div>
                <div class="metric">
                    <div class="label">PAIR:</div>
                    <div class="value">${ticker.base}/${ticker.target}</div>
                </div>
                <div class="metric">
                    <div class="label">PRICE:</div>
                    <div class="value">$${ticker.converted_last.usd?.toFixed(8) || 'N/A'}</div>
                </div>
                <div class="metric">
                    <div class="label">24H VOLUME:</div>
                    <div class="value">$${this.formatNumber(ticker.converted_volume.usd)}</div>
                </div>
                <div class="metric">
                    <div class="label">TRUST SCORE:</div>
                    <div class="value ${ticker.trust_score || 'neutral'}">${ticker.trust_score?.toUpperCase() || 'N/A'}</div>
                </div>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PepeInspector();
});