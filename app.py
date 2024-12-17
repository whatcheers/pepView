from flask import Flask, render_template, jsonify, send_file, send_from_directory, request
import os, random, mimetypes, re
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import requests
import json
from urllib.parse import urlparse
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import sqlite3
from sqlalchemy import desc

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
csrf = CSRFProtect(app)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Rate limiting with Redis storage
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[]  # Remove default limits
)

# Add proper MIME type for MP3
mimetypes.add_type('audio/mpeg', '.mp3')

# Add this function to handle logo downloads
def download_coin_logo(image_url, coin_id):
    # Add URL validation
    if not image_url or not urlparse(image_url).scheme:
        return None
        
    # Create images directory if it doesn't exist
    image_dir = os.path.join('static', 'images', 'coins')
    os.makedirs(image_dir, exist_ok=True)
    
    # Remove URL parameters and get clean extension
    clean_url = image_url.split('?')[0]
    ext = os.path.splitext(clean_url)[1]
    if not ext:
        ext = '.png'
    
    filename = f"{coin_id}{ext}"
    image_path = os.path.join(image_dir, filename)
    
    # Only download if we don't have it already
    if not os.path.exists(image_path):
        try:
            response = requests.get(image_url, timeout=10)  # Added timeout
            if response.status_code == 200:
                with open(image_path, 'wb') as f:
                    f.write(response.content)
            else:
                return None
        except Exception as e:
            print(f"Error downloading logo for {coin_id}: {e}")
            return None
            
    return f"/static/images/coins/{filename}"

# Add database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///pepe_data.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define models
class PepeCoin(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(100))
    symbol = db.Column(db.String(20))
    market_cap = db.Column(db.Float, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
class CoinData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    coin_id = db.Column(db.String(100), index=True)
    data = db.Column(db.JSON)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    @staticmethod
    def get_cached(coin_id, max_age_minutes=1440):
        """Get cached data if it exists and is fresh"""
        cached = CoinData.query.filter_by(coin_id=coin_id).first()
        if cached and datetime.utcnow() - cached.last_updated < timedelta(minutes=max_age_minutes):
            return cached.data
        return None

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True)
    slug = db.Column(db.String(100), unique=True)
    description = db.Column(db.Text)

class PepeCoinCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pepe_coin_id = db.Column(db.String(100), db.ForeignKey('pepe_coin.id'))
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
    
    # Add relationships
    pepe_coin = db.relationship('PepeCoin', backref='categories_link')
    category = db.relationship('Category', backref='coins_link')

@app.route('/')
def index():
    try:
        # Get coins from database, ordered by market cap
        pepe_coins = PepeCoin.query.order_by(desc(PepeCoin.market_cap)).all()
        
        # If database is empty or data is stale, refresh from API
        if not pepe_coins or (datetime.utcnow() - pepe_coins[0].last_updated) > timedelta(minutes=1440):
            with open(os.path.join(app.static_folder, 'data', 'pepe_coins.json'), 'r') as f:
                pepe_ids = json.load(f)
                
            try:
                response = requests.get('https://api.coingecko.com/api/v3/coins/markets', params={
                    'vs_currency': 'usd',
                    'ids': ','.join(pepe_ids),
                    'order': 'market_cap_desc',
                    'per_page': 250,
                    'page': 1,
                    'sparkline': False
                }, timeout=10)
                
                if response.ok:
                    market_data = {coin['id']: coin for coin in response.json()}
                    
                    # Update database with fresh data
                    for coin in market_data.values():
                        db_coin = PepeCoin.query.get(coin['id'])
                        if not db_coin:
                            db_coin = PepeCoin(id=coin['id'])
                        
                        db_coin.name = coin['name']
                        db_coin.symbol = coin['symbol']
                        db_coin.market_cap = coin.get('market_cap', 0)
                        db_coin.last_updated = datetime.utcnow()
                        db.session.add(db_coin)
                    
                    # Add coins without market data
                    for id in pepe_ids:
                        if id not in market_data:
                            db_coin = PepeCoin.query.get(id)
                            if not db_coin:
                                db_coin = PepeCoin(
                                    id=id,
                                    name=id.replace('-', ' ').title(),
                                    symbol=id,
                                    market_cap=0
                                )
                                db.session.add(db_coin)
                    
                    db.session.commit()
                    
                    # Get fresh list from database
                    pepe_coins = PepeCoin.query.order_by(desc(PepeCoin.market_cap)).all()
            
            except Exception as e:
                print(f"Error fetching market data: {e}")
        
        # Convert to dictionary format expected by template
        coins_list = [{
            'id': coin.id,
            'name': coin.name,
            'symbol': coin.symbol,
            'market_cap': coin.market_cap
        } for coin in pepe_coins]
        
        return render_template('index.html', pepes=coins_list)
        
    except Exception as e:
        print(f"Error in index: {e}")
        return render_template('index.html', pepes=[])

@app.route('/api/random_images')
@limiter.limit("30 per minute")
def random_images():
    """
    Returns 3 random image filenames from ./static/images/ in JSON.
    Uses caching to improve performance.
    """
    images_dir = os.path.abspath(os.path.join(app.static_folder, 'images'))
    if not os.path.exists(images_dir) or not images_dir.startswith(os.path.abspath(app.static_folder)):
        return jsonify([])

    if not hasattr(app, '_image_files'):
        app._image_files = [
            f for f in os.listdir(images_dir)
            if f.startswith('img_') and 
            os.path.isfile(os.path.join(images_dir, f)) and
            f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))
        ]

    if len(app._image_files) >= 3:
        random_imgs = random.sample(app._image_files, 3)
    else:
        random_imgs = app._image_files

    return jsonify(random_imgs)

@app.route('/audio/<filename>')
@limiter.limit("60 per minute")
def serve_audio(filename):
    """Serve audio files with proper headers"""
    if not re.match(r'^[a-zA-Z0-9_-]+\.mp3$', filename):
        return "Invalid filename", 400

    try:
        safe_filename = os.path.basename(filename)
        audio_path = os.path.join(app.static_folder, 'audio', safe_filename)
        if not os.path.abspath(audio_path).startswith(os.path.abspath(os.path.join(app.static_folder, 'audio'))):
            return "Invalid path", 400
            
        if not os.path.exists(audio_path):
            return "File not found", 404

        return send_file(
            audio_path,
            mimetype='audio/mpeg',
            conditional=True
        )
    except Exception as e:
        return str(e), 404

@app.after_request
def add_security_headers(response):
    # Existing headers
    if 'audio/mpeg' in response.mimetype:
        response.headers['Accept-Ranges'] = 'bytes'
    if 'image' in response.mimetype:
        response.headers['Cache-Control'] = 'public, max-age=31536000'
    
    # Security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://assets.coingecko.com; media-src 'self'"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    
    return response

@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    return "Rate limit exceeded. Please try again later.", 429

@app.route('/pepe-inspector')
def pepe_inspector():
    try:
        # Get coins from database, ordered by market cap
        pepe_coins = PepeCoin.query.order_by(desc(PepeCoin.market_cap)).all()
        
        # If database is empty or data is stale, refresh from API
        if not pepe_coins or (datetime.utcnow() - pepe_coins[0].last_updated) > timedelta(minutes=1440):
            with open(os.path.join(app.static_folder, 'data', 'pepe_coins.json'), 'r') as f:
                pepe_ids = json.load(f)
                
            try:
                response = requests.get('https://api.coingecko.com/api/v3/coins/markets', params={
                    'vs_currency': 'usd',
                    'ids': ','.join(pepe_ids),
                    'order': 'market_cap_desc',
                    'per_page': 250,
                    'page': 1,
                    'sparkline': False
                }, timeout=10)
                
                if response.ok:
                    market_data = {coin['id']: coin for coin in response.json()}
                    
                    # Update database with fresh data
                    for coin in market_data.values():
                        db_coin = PepeCoin.query.get(coin['id'])
                        if not db_coin:
                            db_coin = PepeCoin(id=coin['id'])
                        
                        db_coin.name = coin['name']
                        db_coin.symbol = coin['symbol']
                        db_coin.market_cap = coin.get('market_cap', 0)
                        db_coin.last_updated = datetime.utcnow()
                        db.session.add(db_coin)
                    
                    # Add coins without market data
                    for id in pepe_ids:
                        if id not in market_data:
                            db_coin = PepeCoin.query.get(id)
                            if not db_coin:
                                db_coin = PepeCoin(
                                    id=id,
                                    name=id.replace('-', ' ').title(),
                                    symbol=id,
                                    market_cap=0
                                )
                                db.session.add(db_coin)
                    
                    db.session.commit()
                    
                    # Get fresh list from database
                    pepe_coins = PepeCoin.query.order_by(desc(PepeCoin.market_cap)).all()
            
            except Exception as e:
                print(f"Error fetching market data: {e}")
        
        # Convert to dictionary format expected by template
        coins_list = [{
            'id': coin.id,
            'name': coin.name,
            'symbol': coin.symbol,
            'market_cap': coin.market_cap
        } for coin in pepe_coins]
        
        return render_template('pepe-inspector.html', pepes=coins_list)
        
    except Exception as e:
        print(f"Error in pepe_inspector: {e}")
        return render_template('pepe-inspector.html', pepes=[])

def is_local_request():
    """Check if the request is coming from localhost"""
    return request.remote_addr in ['127.0.0.1', 'localhost', '::1']

def get_coingecko_rate_limit():
    """Get the appropriate rate limit for CoinGecko API"""
    if is_local_request():
        return "100 per minute"  # Higher limit for local development
    return "50 per minute"  # Normal limit for production

@app.route('/api/pepe-info/<coin_id>')
def get_pepe_info(coin_id):
    try:
        # Skip rate limiting for local requests
        if is_local_request():
            limiter.exempt = True

        # Sanitize coin_id
        coin_id = coin_id.lower().strip()
        
        # Check if local JSON file exists first
        json_path = os.path.join('static', 'data', 'coins', f'{coin_id}.json')
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                return jsonify(json.load(f))

        # Check cache next
        cached_data = CoinData.get_cached(coin_id)
        if cached_data:
            return jsonify(cached_data)
        
        # If no cache, fetch from API
        try:
            # Apply rate limit only for CoinGecko API calls
            if not limiter.exempt:
                rate_limit = get_coingecko_rate_limit()
                limiter.limit(rate_limit)(lambda: None)()
            
            response = requests.get(
                f'https://api.coingecko.com/api/v3/coins/{coin_id}',
                timeout=5  # Add timeout
            )
            response.raise_for_status()
            data = response.json()
            
            # Cache the response
            coin_data = CoinData(
                coin_id=coin_id,
                data=data,
                last_updated=datetime.utcnow()
            )
            db.session.add(coin_data)
            db.session.commit()
            
            # Also save to local JSON file
            os.makedirs(os.path.dirname(json_path), exist_ok=True)
            with open(json_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            return jsonify(data)
            
        except requests.exceptions.RequestException as e:
            print(f"API request failed for {coin_id}: {str(e)}")
            return jsonify({
                'error': 'Failed to fetch data from API',
                'details': str(e)
            }), 503  # Service Unavailable
            
    except Exception as e:
        print(f"Error in get_pepe_info for {coin_id}: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/save-pepe-data', methods=['POST'])
def save_pepe_data():
    try:
        data = request.json
        coin_id = data['coinId']
        
        # Validate coin_id
        if not re.match(r'^[a-zA-Z0-9_-]+$', coin_id):
            return jsonify({'error': 'Invalid coin ID'}), 400
            
        # Ensure directories exist
        os.makedirs(os.path.join(app.static_folder, 'data', 'coins'), exist_ok=True)
        os.makedirs(os.path.join(app.static_folder, 'images', 'coins'), exist_ok=True)
        
        coin_data = data['data']
        
        # Save JSON data with safe path joining
        json_path = os.path.join(app.static_folder, 'data', 'coins', f'{coin_id}.json')
        with open(json_path, 'w') as f:
            json.dump(coin_data, f, indent=2)
            
        # Download image if it exists
        if coin_data.get('image', {}).get('large'):
            image_url = coin_data['image']['large']
            if urlparse(image_url).scheme:  # Validate URL
                response = requests.get(image_url, timeout=10)  # Add timeout
                if response.status_code == 200:
                    image_path = os.path.join(app.static_folder, 'images', 'coins', f'{coin_id}.png')
                    with open(image_path, 'wb') as f:
                        f.write(response.content)
                    
        # Handle categories
        if coin_data.get('categories'):
            for cat_name in coin_data['categories']:
                slug = cat_name.lower().replace(' ', '-')
                category = Category.query.filter_by(slug=slug).first()
                if not category:
                    category = Category(name=cat_name, slug=slug)
                    db.session.add(category)
                
                link = PepeCoinCategory.query.filter_by(
                    pepe_coin_id=coin_id,
                    category_id=category.id
                ).first()
                
                if not link:
                    link = PepeCoinCategory(pepe_coin_id=coin_id, category_id=category.id)
                    db.session.add(link)
        
        db.session.commit()
        
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Error saving data: {e}")
        return jsonify({'error': str(e)}), 400

@app.route('/category/<slug>')
def category_view(slug):
    try:
        # Find category
        category = Category.query.filter_by(slug=slug).first_or_404()
        
        # Get all coins in this category
        coins = (PepeCoin.query
                .join(PepeCoinCategory)
                .join(Category)
                .filter(Category.id == category.id)
                .order_by(desc(PepeCoin.market_cap))
                .all())
        
        coins_list = [{
            'id': coin.id,
            'name': coin.name,
            'symbol': coin.symbol,
            'market_cap': coin.market_cap
        } for coin in coins]
        
        return render_template('category.html', 
                             category=category, 
                             coins=coins_list)
    except Exception as e:
        print(f"Error in category view: {e}")
        return render_template('404.html'), 404

# Add this to create tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    if os.environ.get('FLASK_ENV') == 'production':
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['SESSION_COOKIE_HTTPONLY'] = True
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.run(host='127.0.0.1', port=5001)
    else:
        app.run(host='127.0.0.1', port=5001, debug=True)