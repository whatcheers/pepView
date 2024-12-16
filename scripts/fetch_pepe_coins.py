import requests
import json
import os
from time import sleep

def fetch_pepe_coins():
    url = "https://api.coingecko.com/api/v3/coins/list"
    headers = {
        'accept': 'application/json',
        'x-cg-demo-api-key': 'CG-coYwgfJ1r2wHMS7ma7zBsZ5b'
    }

    try:
        response = requests.get(url, headers=headers)
        all_coins = response.json()
        
        pepe_coins = []
        for coin in all_coins:
            if 'pepe' in coin['id'].lower() or 'pepe' in coin['name'].lower():
                detail_url = f"https://api.coingecko.com/api/v3/coins/{coin['id']}"
                try:
                    detail_response = requests.get(detail_url, headers=headers)
                    if detail_response.status_code == 200:
                        coin_detail = detail_response.json()
                        
                        # Extract all relevant fields
                        coin_data = {
                            'id': coin['id'],
                            'symbol': coin['symbol'],
                            'name': coin['name'],
                            'image': {
                                'thumb': coin_detail.get('image', {}).get('thumb'),
                                'small': coin_detail.get('image', {}).get('small'),
                                'large': coin_detail.get('image', {}).get('large')
                            },
                            'market_cap_rank': coin_detail.get('market_cap_rank'),
                            'market_data': {
                                'current_price': coin_detail.get('market_data', {}).get('current_price', {}),
                                'ath': coin_detail.get('market_data', {}).get('ath', {}),
                                'ath_change_percentage': coin_detail.get('market_data', {}).get('ath_change_percentage', {}),
                                'atl': coin_detail.get('market_data', {}).get('atl', {}),
                                'atl_change_percentage': coin_detail.get('market_data', {}).get('atl_change_percentage', {}),
                                'market_cap': coin_detail.get('market_data', {}).get('market_cap', {}),
                                'total_volume': coin_detail.get('market_data', {}).get('total_volume', {}),
                                'price_change_24h': coin_detail.get('market_data', {}).get('price_change_24h'),
                                'price_change_percentage_24h': coin_detail.get('market_data', {}).get('price_change_percentage_24h'),
                                'price_change_percentage_7d': coin_detail.get('market_data', {}).get('price_change_percentage_7d'),
                                'price_change_percentage_30d': coin_detail.get('market_data', {}).get('price_change_percentage_30d'),
                                'circulating_supply': coin_detail.get('market_data', {}).get('circulating_supply'),
                                'total_supply': coin_detail.get('market_data', {}).get('total_supply'),
                                'max_supply': coin_detail.get('market_data', {}).get('max_supply'),
                            },
                            
                            'contract_address': coin_detail.get('contract_address'),
                            'platform': coin_detail.get('asset_platform_id'),
                            'hashing_algorithm': coin_detail.get('hashing_algorithm'),
                            
                            'links': {
                                'homepage': coin_detail.get('links', {}).get('homepage', []),
                                'blockchain_site': coin_detail.get('links', {}).get('blockchain_site', []),
                                'official_forum_url': coin_detail.get('links', {}).get('official_forum_url', []),
                                'chat_url': coin_detail.get('links', {}).get('chat_url', []),
                                'announcement_url': coin_detail.get('links', {}).get('announcement_url', []),
                                'twitter_screen_name': coin_detail.get('links', {}).get('twitter_screen_name'),
                                'telegram_channel_identifier': coin_detail.get('links', {}).get('telegram_channel_identifier'),
                                'github': coin_detail.get('links', {}).get('repos_url', {}).get('github', []),
                            },
                            
                            'community_data': coin_detail.get('community_data', {}),
                            'developer_data': coin_detail.get('developer_data', {}),
                            
                            'sentiment_votes_up_percentage': coin_detail.get('sentiment_votes_up_percentage'),
                            'sentiment_votes_down_percentage': coin_detail.get('sentiment_votes_down_percentage'),
                            'public_notice': coin_detail.get('public_notice'),
                            'additional_notices': coin_detail.get('additional_notices', []),
                            
                            'tickers': coin_detail.get('tickers', [])
                        }
                        
                        pepe_coins.append(coin_data)
                        print(f"Found Pepe coin: {coin['name']} (Rank: {coin_data['market_cap_rank'] or 'Unranked'})")
                    
                    sleep(1)
                except Exception as e:
                    print(f"Error fetching details for {coin['id']}: {e}")
                    continue

        # Sort by market cap rank (None values at the end)
        pepe_coins.sort(key=lambda x: (x['market_cap_rank'] is None, x['market_cap_rank']))

        # Create data directory if it doesn't exist
        os.makedirs('data', exist_ok=True)

        # Save to JSON file
        with open('data/pepe_coins.json', 'w') as f:
            json.dump(pepe_coins, f, indent=4)

        print(f"Successfully saved {len(pepe_coins)} Pepe coins to data/pepe_coins.json")

    except Exception as e:
        print(f"Error fetching Pepe coins: {e}")

if __name__ == "__main__":
    fetch_pepe_coins() 