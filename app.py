from flask import Flask, render_template, jsonify, send_file, send_from_directory
import os, random, mimetypes, re
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import requests
import json
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
csrf = CSRFProtect(app)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Add proper MIME type for MP3
mimetypes.add_type('audio/mpeg', '.mp3')

# Add this function to handle logo downloads
def download_coin_logo(image_url, coin_id):
    if not image_url:
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
            response = requests.get(image_url)
            if response.status_code == 200:
                with open(image_path, 'wb') as f:
                    f.write(response.content)
            else:
                return None
        except Exception as e:
            print(f"Error downloading logo for {coin_id}: {e}")
            return None
            
    return f"/static/images/coins/{filename}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/crazy')
def crazy_page():
    return render_template('crazy.html')

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
        # Load Pepe coins from JSON file
        with open('data/pepe_coins.json', 'r') as f:
            pepe_coins = json.load(f)
        return render_template('pepe-inspector.html', pepes=pepe_coins)
    except Exception as e:
        print(f"Error loading Pepe coins: {e}")
        return render_template('pepe-inspector.html', pepes=[])

@app.route('/api/pepe-info/<coin_id>')
@limiter.limit("30 per minute")
def get_pepe_info(coin_id):
    try:
        response = requests.get(f'https://api.coingecko.com/api/v3/coins/{coin_id}')
        response.raise_for_status()
        data = response.json()
        
        # Download and save the large logo
        if data.get('image', {}).get('large'):
            local_path = download_coin_logo(data['image']['large'], coin_id)
            if local_path:
                data['image']['local_path'] = local_path
        
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if os.environ.get('FLASK_ENV') == 'production':
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['SESSION_COOKIE_HTTPONLY'] = True
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.run(host='127.0.0.1', port=5001)
    else:
        app.run(host='127.0.0.1', port=5001, debug=True)