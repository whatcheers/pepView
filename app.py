from flask import Flask, render_template, jsonify, send_file, send_from_directory
import os, random, mimetypes
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Add proper MIME type for MP3
mimetypes.add_type('audio/mpeg', '.mp3')

# Configure static folder in the same directory as app.py
# By default, Flask expects "./static" if present
# Make sure you have a "static/images/" and "static/audio/" subfolder with your files.

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/crazy')
def crazy_page():
    return render_template('crazy.html')

@app.route('/api/random_images')
def random_images():
    """
    Returns 3 random image filenames from ./static/images/ in JSON.
    Uses caching to improve performance.
    """
    images_dir = os.path.join(app.static_folder, 'images')
    if not os.path.exists(images_dir):
        return jsonify([])

    # Cache the file list
    if not hasattr(app, '_image_files'):
        app._image_files = [
            f for f in os.listdir(images_dir)
            if f.startswith('img_') and os.path.isfile(os.path.join(images_dir, f))
        ]

    if len(app._image_files) >= 3:
        random_imgs = random.sample(app._image_files, 3)
    else:
        random_imgs = app._image_files

    return jsonify(random_imgs)

@app.route('/audio/<filename>')
def serve_audio(filename):
    """Serve audio files with proper headers"""
    try:
        audio_path = os.path.join(app.static_folder, 'audio', filename)
        return send_file(
            audio_path,
            mimetype='audio/mpeg',
            conditional=True  # Enable partial content
        )
    except Exception as e:
        return str(e), 404

@app.after_request
def add_header(response):
    if 'audio/mpeg' in response.mimetype:
        response.headers['Accept-Ranges'] = 'bytes'
    if 'image' in response.mimetype:
        response.headers['Cache-Control'] = 'public, max-age=31536000'
    return response

if __name__ == '__main__':
    # Only use debug mode when developing locally
    app.run(host='127.0.0.1', port=5001)
