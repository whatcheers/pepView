async function fetchPepeData(coinId) {
    try {
        const response = await fetch(`/api/pepe-info/${coinId}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        displayPepeData(data);
    } catch (error) {
        document.getElementById('pepeData').innerHTML = `
            <div class="section">
                <div class="subsection">
                    <div class="error">Error loading data: ${error.message}</div>
                </div>
            </div>`;
    }
}

function displayPepeData(data) {
    const content = `
        <div class="section">
            <h2>Overview</h2>
            <div class="subsection">
                <div class="metric">
                    <span class="label">Description:</span>
                    <span class="value">${data.description?.en || 'No description available'}</span>
                </div>
                <div class="metric">
                    <span class="label">Categories:</span>
                    <span class="value">${data.categories?.join(', ') || 'N/A'}</span>
                </div>
                <div class="metric">
                    <span class="label">Platform:</span>
                    <span class="value">${data.asset_platform_id || 'Independent Chain'}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Market Data</h2>
            <div class="subsection">
                <div class="metric">
                    <span class="label">Current Price:</span>
                    <span class="value">$${data.market_data.current_price.usd.toFixed(8)}</span>
                </div>
                <div class="metric">
                    <span class="label">Market Cap Rank:</span>
                    <span class="value">#${data.market_cap_rank}</span>
                </div>
                <div class="metric">
                    <span class="label">Market Cap:</span>
                    <span class="value">$${formatNumber(data.market_data.market_cap.usd)}</span>
                </div>
                <div class="metric">
                    <span class="label">24h Volume:</span>
                    <span class="value">$${formatNumber(data.market_data.total_volume.usd)}</span>
                </div>
                <div class="metric">
                    <span class="label">Circulating Supply:</span>
                    <span class="value">${formatNumber(data.market_data.circulating_supply)} ${data.symbol.toUpperCase()}</span>
                </div>
                <div class="metric">
                    <span class="label">Max Supply:</span>
                    <span class="value">${data.market_data.max_supply_infinite ? '∞' : formatNumber(data.market_data.max_supply)}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Price Changes</h2>
            <div class="subsection">
                <div class="metric">
                    <span class="label">1h Change:</span>
                    <span class="value ${getValueClass(data.market_data.price_change_percentage_1h_in_currency?.usd)}">
                        ${formatPercentage(data.market_data.price_change_percentage_1h_in_currency?.usd)}
                    </span>
                </div>
                <div class="metric">
                    <span class="label">24h Change:</span>
                    <span class="value ${getValueClass(data.market_data.price_change_percentage_24h)}">
                        ${formatPercentage(data.market_data.price_change_percentage_24h)}
                    </span>
                </div>
                <div class="metric">
                    <span class="label">7d Change:</span>
                    <span class="value ${getValueClass(data.market_data.price_change_percentage_7d)}">
                        ${formatPercentage(data.market_data.price_change_percentage_7d)}
                    </span>
                </div>
                <div class="metric">
                    <span class="label">30d Change:</span>
                    <span class="value ${getValueClass(data.market_data.price_change_percentage_30d)}">
                        ${formatPercentage(data.market_data.price_change_percentage_30d)}
                    </span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>All-Time Statistics</h2>
            <div class="subsection">
                <div class="metric">
                    <span class="label">All-Time High:</span>
                    <span class="value">$${data.market_data.ath.usd.toFixed(8)} (${formatDate(data.market_data.ath_date.usd)})</span>
                </div>
                <div class="metric">
                    <span class="label">ATH Change %:</span>
                    <span class="value ${getValueClass(data.market_data.ath_change_percentage.usd)}">
                        ${formatPercentage(data.market_data.ath_change_percentage.usd)}
                    </span>
                </div>
                <div class="metric">
                    <span class="label">All-Time Low:</span>
                    <span class="value">$${data.market_data.atl.usd.toFixed(8)} (${formatDate(data.market_data.atl_date.usd)})</span>
                </div>
                <div class="metric">
                    <span class="label">ATL Change %:</span>
                    <span class="value ${getValueClass(data.market_data.atl_change_percentage.usd)}">
                        ${formatPercentage(data.market_data.atl_change_percentage.usd)}
                    </span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Community & Development</h2>
            <div class="subsection">
                <div class="metric">
                    <span class="label">Twitter Followers:</span>
                    <span class="value">${formatNumber(data.community_data?.twitter_followers || 0)}</span>
                </div>
                <div class="metric">
                    <span class="label">Telegram Users:</span>
                    <span class="value">${formatNumber(data.community_data?.telegram_channel_user_count || 0)}</span>
                </div>
                <div class="metric">
                    <span class="label">Sentiment (Up):</span>
                    <span class="value ${getValueClass(data.sentiment_votes_up_percentage)}">
                        ${formatPercentage(data.sentiment_votes_up_percentage)}
                    </span>
                </div>
                <div class="metric">
                    <span class="label">Github Activity:</span>
                    <span class="value">${data.developer_data?.commit_count_4_weeks || 0} commits in 4 weeks</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pepeData').innerHTML = content;
}

function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US').format(num);
}

function formatPercentage(value) {
    if (!value) return 'N/A';
    return `${value.toFixed(2)}%`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function getValueClass(value) {
    if (!value) return '';
    return value > 0 ? 'positive' : 'negative';
}

// Event Listeners
document.getElementById('pepeSelect').addEventListener('change', (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
        document.getElementById('pepeData').innerHTML = '<div class="loading">Loading...</div>';
        fetchPepeData(selectedId);
    } else {
        document.getElementById('pepeData').innerHTML = '';
    }
});