async function fetchPepeData(coinId) {
    try {
        // First try to get local data
        console.log('Checking for local data...');
        const localResponse = await fetch(`/static/data/coins/${coinId}.json`);
        
        if (localResponse.ok) {
            console.log('Found local data, using it');
            const data = await localResponse.json();
            displayPepeData(data);
            return;
        }

        console.log('No local data found, making API call...');
        const response = await fetch(`/api/pepe-info/${coinId}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        console.log('API Response:', response.status);
        console.log('API Data:', JSON.stringify(data, null, 2));
        
        console.log('Saving API response...');
        const saveResponse = await fetch('/api/save-pepe-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify({
                coinId: coinId,
                data: data
            })
        });
        
        const saveResult = await saveResponse.text();
        console.log('Save Response:', saveResponse.status, saveResult);
        
        displayPepeData(data);
    } catch (error) {
        console.error('Full Error:', error);
        document.getElementById('pepeData').innerHTML = `
            <div class="section">
                <div class="subsection">
                    <div class="error">Error loading data: ${error.message}</div>
                </div>
            </div>`;
    }
}

function displayPepeData(data) {
    const description = data.description?.en
        ? data.description.en
            .replace(/\\r\\n/g, '\n')
            .replace(/\r\n/g, '\n')
            .replace(/\\n/g, '\n')
        : 'No description available';

    const content = `
        <div class="section">
            <h2>Overview</h2>
            <div class="subsection">
                <div class="coin-header">
                    <img src="/static/images/coins/${data.id}.png" alt="${data.name}" class="coin-icon">
                    <h3>${data.name} (${data.symbol.toUpperCase()})</h3>
                </div>
                <div class="metric" title="Detailed description of the token, its purpose, and key features">
                    <span class="label">Description:</span>
                    <span class="value">${description}</span>
                </div>
                <div class="metric" title="Classification categories that help position the token in specific sectors (e.g., Meme, Proof of Work, Smart Contract Platform)">
                    <span class="label">Categories:</span>
                    <span class="value">${data.categories?.join(', ') || 'N/A'}</span>
                </div>
                <div class="metric" title="The blockchain platform where the token operates. Independent Chain means it has its own blockchain">
                    <span class="label">Platform:</span>
                    <span class="value">${data.asset_platform_id || 'Independent Chain'}</span>
                </div>
                <div class="metric" title="The cryptographic algorithm used for mining or transaction validation, determines security protocols and compatibility with mining/staking ecosystems">
                    <span class="label">Hashing Algorithm:</span>
                    <span class="value">${data.hashing_algorithm || 'N/A'}</span>
                </div>
                <div class="metric" title="The unique blockchain address where the token's smart contract is deployed, critical for smart contract platforms">
                    <span class="label">Contract Address:</span>
                    <span class="value">${data.contract_address || 'N/A'}</span>
                </div>
                <div class="metric" title="The number of decimal places supported by the token, determines the precision of transactions">
                    <span class="label">Decimal Places:</span>
                    <span class="value">${data.detail_platforms?.decimal_place || 'N/A'}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Market Data</h2>
            <div class="subsection">
                <div class="metric" title="The current market price of the token in USD, representing its real-time value">
                    <span class="label">Current Price:</span>
                    <span class="value">$${data.market_data.current_price.usd.toFixed(8)}</span>
                </div>
                <div class="metric" title="The token's ranking by market capitalization among all cryptocurrencies, indicating its relative market position">
                    <span class="label">Market Cap Rank:</span>
                    <span class="value">#${data.market_cap_rank}</span>
                </div>
                <div class="metric" title="Total market value of the token (Current Price × Circulating Supply), indicates the overall valuation">
                    <span class="label">Market Cap:</span>
                    <span class="value">$${formatNumber(data.market_data.market_cap.usd)}</span>
                </div>
                <div class="metric" title="Total trading volume in the last 24 hours, indicates market liquidity and trading activity">
                    <span class="label">24h Volume:</span>
                    <span class="value">$${formatNumber(data.market_data.total_volume.usd)}</span>
                </div>
                <div class="metric" title="Number of tokens currently in circulation and available to the public">
                    <span class="label">Circulating Supply:</span>
                    <span class="value">${formatNumber(data.market_data.circulating_supply)} ${data.symbol.toUpperCase()}</span>
                </div>
                <div class="metric" title="Total amount of tokens that currently exist, including both circulating and locked tokens">
                    <span class="label">Total Supply:</span>
                    <span class="value">${formatNumber(data.market_data.total_supply) || 'N/A'}</span>
                </div>
                <div class="metric" title="Maximum number of tokens that can ever exist. Infinity (∞) indicates no maximum limit">
                    <span class="label">Max Supply:</span>
                    <span class="value">${data.market_data.max_supply_infinite ? '∞' : formatNumber(data.market_data.max_supply)}</span>
                </div>
                <div class="metric" title="Difference between the best buy and sell prices as a percentage, indicates market liquidity and trading efficiency">
                    <span class="label">Bid-Ask Spread %:</span>
                    <span class="value">${data.tickers?.[0]?.bid_ask_spread_percentage?.toFixed(2) || 'N/A'}%</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Price Changes</h2>
            <div class="subsection">
                <div class="metric" title="Percentage price change in the last hour, indicates very short-term price movement">
                    <span class="label">1h Change:</span>
                    <span class="value ${getValueClass(data.market_data.price_change_percentage_1h_in_currency?.usd)}">
                        ${formatPercentage(data.market_data.price_change_percentage_1h_in_currency?.usd)}
                    </span>
                </div>
                <div class="metric" title="Percentage price change in the last 24 hours, indicates short-term price movement and daily volatility">
                    <span class="label">24h Change:</span>
                    <span class="value ${getValueClass(data.market_data.price_change_percentage_24h)}">
                        ${formatPercentage(data.market_data.price_change_percentage_24h)}
                    </span>
                </div>
                <div class="metric" title="Percentage price change in the last 7 days, indicates medium-term price trend">
                    <span class="label">7d Change:</span>
                    <span class="value ${getValueClass(data.market_data.price_change_percentage_7d)}">
                        ${formatPercentage(data.market_data.price_change_percentage_7d)}
                    </span>
                </div>
                <div class="metric" title="Percentage price change in the last 30 days, indicates longer-term price trend">
                    <span class="label">30d Change:</span>
                    <span class="value ${getValueClass(data.market_data.price_change_percentage_30d)}">
                        ${formatPercentage(data.market_data.price_change_percentage_30d)}
                    </span>
                </div>
                <div class="metric" title="Current price in Bitcoin (BTC), useful for comparing value against the leading cryptocurrency">
                    <span class="label">Price in BTC:</span>
                    <span class="value">${data.market_data.current_price.btc?.toFixed(8) || 'N/A'} BTC</span>
                </div>
                <div class="metric" title="Current price in Ethereum (ETH), useful for comparing value against the leading smart contract platform">
                    <span class="label">Price in ETH:</span>
                    <span class="value">${data.market_data.current_price.eth?.toFixed(8) || 'N/A'} ETH</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>All-Time Statistics</h2>
            <div class="subsection">
                <div class="metric" title="Highest price ever reached in USD and the date it occurred, indicates maximum historical value">
                    <span class="label">All-Time High:</span>
                    <span class="value">$${data.market_data.ath.usd.toFixed(8)} (${formatDate(data.market_data.ath_date.usd)})</span>
                </div>
                <div class="metric" title="Percentage change from the all-time high, indicates how far the current price is from the peak">
                    <span class="label">ATH Change %:</span>
                    <span class="value ${getValueClass(data.market_data.ath_change_percentage.usd)}">
                        ${formatPercentage(data.market_data.ath_change_percentage.usd)}
                    </span>
                </div>
                <div class="metric" title="Lowest price ever reached in USD and the date it occurred, indicates minimum historical value">
                    <span class="label">All-Time Low:</span>
                    <span class="value">$${data.market_data.atl.usd.toFixed(8)} (${formatDate(data.market_data.atl_date.usd)})</span>
                </div>
                <div class="metric" title="Percentage change from the all-time low, indicates how far the current price has risen from the bottom">
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
                <div class="metric" title="Number of Twitter followers, indicates social media presence and community size">
                    <span class="label">Twitter Followers:</span>
                    <span class="value">${formatNumber(data.community_data?.twitter_followers || 0)}</span>
                </div>
                <div class="metric" title="Number of Telegram channel members, indicates community engagement on messaging platforms">
                    <span class="label">Telegram Users:</span>
                    <span class="value">${formatNumber(data.community_data?.telegram_channel_user_count || 0)}</span>
                </div>
                <div class="metric" title="Percentage of positive sentiment votes from the community, indicates market confidence">
                    <span class="label">Sentiment (Up):</span>
                    <span class="value ${getValueClass(data.sentiment_votes_up_percentage)}">
                        ${formatPercentage(data.sentiment_votes_up_percentage)}
                    </span>
                </div>
                <div class="metric" title="Percentage of negative sentiment votes from the community, indicates market concerns">
                    <span class="label">Sentiment (Down):</span>
                    <span class="value ${getValueClass(-data.sentiment_votes_down_percentage)}">
                        ${formatPercentage(data.sentiment_votes_down_percentage)}
                    </span>
                </div>
                <div class="metric" title="Number of GitHub commits in the last 4 weeks, indicates active development and maintenance">
                    <span class="label">Github Activity:</span>
                    <span class="value">${data.developer_data?.commit_count_4_weeks || 0} commits in 4 weeks</span>
                </div>
                <div class="metric" title="Timestamp of the most recent trade, indicates trading activity recency">
                    <span class="label">Last Traded:</span>
                    <span class="value">${data.tickers?.[0]?.last_traded_at ? formatDate(data.tickers[0].last_traded_at) : 'N/A'}</span>
                </div>
                <div class="metric" title="Exchange reliability score, indicates the confidence level in trading data (higher is better)">
                    <span class="label">Trust Score:</span>
                    <span class="value">${data.tickers?.[0]?.trust_score || 'N/A'}</span>
                </div>
                <div class="metric" title="Indicates whether the trading data is current or outdated">
                    <span class="label">Data Status:</span>
                    <span class="value">${data.tickers?.[0]?.is_stale ? 'Stale' : 'Current'}</span>
                </div>
                ${data.public_notice ? `
                <div class="metric" title="Official announcements or notices about the token">
                    <span class="label">Public Notice:</span>
                    <span class="value">${data.public_notice}</span>
                </div>
                ` : ''}
                ${data.additional_notices?.length ? `
                <div class="metric" title="Additional important information or warnings about the token">
                    <span class="label">Additional Notices:</span>
                    <span class="value">${data.additional_notices.join(', ')}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    document.getElementById('pepeData').innerHTML = content;
    
    // Setup calculator after new data is displayed
    setupCalculator();
    
    // Trigger recalculation with existing amount
    const coinAmount = document.getElementById('coinAmount');
    if (coinAmount) {
        coinAmount.dispatchEvent(new Event('input'));
    }
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

function updateSliderRange() {
    const price = getCurrentPrice();
    if (!price) return;

    // Calculate relative range based on price magnitude
    let range;
    if (price >= 1) {
        // For prices $1 and up, use ±10%
        range = price * 0.1;
    } else {
        // For smaller prices, find the first significant digit and use that for scale
        const magnitude = Math.floor(Math.log10(price));
        range = Math.pow(10, magnitude) * 2;
    }

    const min = Math.max(0, price - range);
    const max = price + range;
    const step = range / 100; // 100 steps across the range

    priceSlider.min = min;
    priceSlider.max = max;
    priceSlider.step = step;
    priceSlider.value = price;
    priceInput.value = price;

    // Update the slider's aria label for accessibility
    priceSlider.setAttribute('aria-label', `Price range from $${min.toFixed(8)} to $${max.toFixed(8)}`);
}

function getCurrentPrice() {
    const priceElement = document.querySelector('.metric[title*="current market price"] .value');
    if (priceElement) {
        const priceText = priceElement.textContent;
        // Remove '$' and any commas, then parse
        return parseFloat(priceText.replace(/[$,]/g, '')) || 0;
    }
    return 0;
}

function setupCalculator() {
    const whatIfToggle = document.getElementById('whatIfToggle');
    const whatIfControls = document.getElementById('whatIfControls');
    const priceSlider = document.getElementById('priceSlider');
    const priceInput = document.getElementById('priceInput');
    const coinAmount = document.getElementById('coinAmount');
    const calculatedValue = document.getElementById('calculatedValue');
    let currentPrice = 0;

    function updateCalculation() {
        const amount = parseFloat(coinAmount.value) || 0;
        const price = whatIfToggle.checked ? 
            (parseFloat(priceInput.value) || currentPrice) : 
            currentPrice;
        
        const value = amount * price;
        calculatedValue.textContent = `$${value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        })}`;
    }

    whatIfToggle.addEventListener('change', () => {
        whatIfControls.style.display = whatIfToggle.checked ? 'block' : 'none';
        document.body.classList.toggle('dream-mode', whatIfToggle.checked);
        updateCalculation();
    });

    coinAmount.addEventListener('input', updateCalculation);

    priceSlider.addEventListener('input', (e) => {
        priceInput.value = parseFloat(e.target.value).toFixed(8);
        updateCalculation();
    });

    priceInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            priceSlider.value = value;
            updateCalculation();
        }
    });

    // Watch for price updates
    const observer = new MutationObserver(() => {
        currentPrice = getCurrentPrice();
        updateSliderRange();
        updateCalculation();
    });

    const priceElement = document.querySelector('.metric[title*="current market price"] .value');
    if (priceElement) {
        observer.observe(priceElement, { childList: true, characterData: true, subtree: true });
        currentPrice = getCurrentPrice();
        updateSliderRange();
    }
}

// Initial setup
setupCalculator();
