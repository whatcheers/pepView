from app import app, db, PepeCoin, CoinData, Category
from datetime import datetime
import json

def query_database():
    # Get all Pepe coins
    print("\n=== Pepe Coins ===")
    pepe_coins = PepeCoin.query.all()
    for coin in pepe_coins:
        print(f"Name: {coin.name}, Symbol: {coin.symbol}, Market Cap: {coin.market_cap}")

    # Get specific coin data
    print("\n=== Pepe Coin Data ===")
    coin_data = CoinData.query.filter_by(coin_id='pepe').first()
    if coin_data:
        print(f"Coin ID: {coin_data.coin_id}")
        print(f"Last Updated: {coin_data.last_updated}")
        print("Data:", json.dumps(coin_data.data, indent=2))

    # Get categories
    print("\n=== Categories ===")
    categories = Category.query.all()
    for cat in categories:
        print(f"Category: {cat.name}")

if __name__ == "__main__":
    with app.app_context():
        query_database()
