class CrazyPage {
    constructor() {
        this.floatingImages = [];
        this.container = document.getElementById('random-image-container');
        this.audioPlayer = new AudioController();
        this.imageCache = new Map();
        this.isMobile = window.innerWidth < 768;
        this.init();
        this.setupSparkles();
        this.setupResizeHandler();
        
        // Handle browser history
        window.history.replaceState({page: 'crazy'}, '', '/');
        
        // Handle back button
        window.addEventListener('popstate', (event) => {
            if (!event.state || event.state.page !== 'crazy') {
                window.location.href = '/';
            }
        });
    }

    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.isMobile = window.innerWidth < 768;
                this.adjustForScreenSize();
            }, 250);
        });
    }

    adjustForScreenSize() {
        // Adjust number of images and sparkles based on screen size
        const numImages = this.isMobile ? 2 : 3;
        this.fetchRandomImages(numImages);
        this.updateSparkles();
    }

    setupSparkles() {
        const title = document.querySelector('.crazy-title');
        const sparkleSymbols = ['✨', '💫', '⭐', '🌟'];
        const numSparkles = this.isMobile ? 10 : 20;

        // Clear existing sparkles
        document.querySelectorAll('.sparkle').forEach(s => s.remove());

        for (let i = 0; i < numSparkles; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.textContent = sparkleSymbols[Math.floor(Math.random() * sparkleSymbols.length)];
            
            // Adjust positioning for mobile
            const topPosition = this.isMobile ? 
                Math.random() * 15 : // Less vertical space on mobile
                Math.random() * 20;
            
            sparkle.style.cssText = `
                position: absolute;
                left: ${Math.random() * 90 + 5}vw;
                top: ${topPosition}vh;
                font-size: ${this.isMobile ? '12px' : '16px'};
                animation: sparkle ${Math.random() * 2 + 1}s ease-in-out infinite;
                animation-delay: ${Math.random() * 2}s;
            `;
            document.body.appendChild(sparkle);
        }

        // Mobile-friendly hover effects using touch events
        title.addEventListener('touchstart', () => {
            title.style.transform = 'scale(1.1) rotate(5deg)';
        });
        title.addEventListener('touchend', () => {
            title.style.transform = 'scale(1) rotate(0)';
        });
    }

    async fetchRandomImages() {
        try {
            const response = await fetch('/api/random_images');
            const imageFiles = await response.json();
            
            // Preload images before showing them
            await this.preloadImages(imageFiles);
            
            this.container.innerHTML = '';
            
            imageFiles.forEach(file => {
                const img = document.createElement('img');
                img.src = this.imageCache.get(file) || `/static/images/${file}`;
                img.alt = file;
                img.classList.add('floating-image');
                img.style.top = `${Math.random() * 80}%`;
                img.style.left = `${Math.random() * 80}%`;
                this.container.appendChild(img);
            });
            
            this.floatingImages = this.container.querySelectorAll('.floating-image');
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    }

    preloadImages(imageFiles) {
        const preloadPromises = imageFiles.map(file => {
            // If image is already cached, skip preloading
            if (this.imageCache.has(file)) {
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.imageCache.set(file, img.src);
                    resolve();
                };
                img.onerror = reject;
                img.src = `/static/images/${file}`;
            });
        });

        return Promise.all(preloadPromises);
    }

    moveImages() {
        this.floatingImages.forEach(img => {
            img.style.top = `${Math.random() * 80}%`;
            img.style.left = `${Math.random() * 80}%`;
            const rotation = Math.random() * 360;
            const scale = 0.5 + Math.random() * 1.5;
            img.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        });
    }

    init() {
        this.fetchRandomImages();
        // Reduce the frequency of image updates
        setInterval(() => this.moveImages(), 2000);
        setInterval(() => this.fetchRandomImages(), 15000);
    }
}

class AudioController {
    constructor() {
        this.audio = null;
        this.hasInteracted = localStorage.getItem('userInteracted') === 'true';
        this.shouldAutoplay = localStorage.getItem('autoplayRequested') === 'true';
        this.isMobile = window.innerWidth < 768;
        this.createAudioButton();
        
        // Clear the autoplay flag after reading it
        localStorage.removeItem('autoplayRequested');
    }

    createAudioButton() {
        const button = document.createElement('button');
        button.innerHTML = this.shouldAutoplay ? '⌛ Loading...' : '🔇 Play Music';
        button.className = 'audio-button';  // Add class for easier styling
        button.style.cssText = `
            position: fixed;
            bottom: ${this.isMobile ? '10px' : '20px'};
            right: ${this.isMobile ? '10px' : '20px'};
            padding: ${this.isMobile ? '8px 16px' : '10px 20px'};
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: ${this.isMobile ? '14px' : '16px'};
            z-index: 2000;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        `;

        // Add touch feedback
        button.addEventListener('touchstart', () => {
            button.style.transform = 'scale(0.95)';
        });
        button.addEventListener('touchend', () => {
            button.style.transform = 'scale(1)';
        });

        button.addEventListener('click', () => this.handleButtonClick(button));
        document.body.appendChild(button);

        // Initialize audio element with error handling
        this.initAudio(button);
    }

    async initAudio(button) {
        try {
            // Test if audio file exists and is valid
            const response = await fetch(AUDIO_URL, { method: 'HEAD' });
            if (!response.ok) throw new Error('Audio file not found');

            this.audio = new Audio();
            this.audio.preload = 'auto';
            
            // Add error handling
            this.audio.addEventListener('error', (e) => {
                console.error('Audio error:', e);
                button.innerHTML = '❌ Audio Error';
                button.style.background = 'rgba(255, 0, 0, 0.7)';
            });

            // Add loading handler
            this.audio.addEventListener('canplaythrough', () => {
                console.log('Audio loaded and ready');
                if (this.shouldAutoplay) {
                    this.tryPlayAudio(button);
                } else if (this.hasInteracted && this.audio.paused) {
                    button.innerHTML = '🔇 Play Music';
                }
            });

            this.audio.src = AUDIO_URL;
            this.audio.loop = true;
            
        } catch (error) {
            console.error('Audio initialization error:', error);
            button.innerHTML = '❌ Audio Error';
            button.style.background = 'rgba(255, 0, 0, 0.7)';
        }
    }

    handleButtonClick(button) {
        if (!this.audio) return;

        if (this.audio.paused) {
            this.tryPlayAudio(button);
        } else {
            this.audio.pause();
            button.innerHTML = '🔇 Play Music';
        }
    }

    tryPlayAudio(button) {
        if (!this.audio) return;

        // Ensure audio is loaded
        if (this.audio.readyState < 2) { // HAVE_CURRENT_DATA
            button.innerHTML = '⌛ Loading...';
            this.audio.addEventListener('canplaythrough', () => {
                this.startPlayback(button);
            }, { once: true });
        } else {
            this.startPlayback(button);
        }
    }

    startPlayback(button) {
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                localStorage.setItem('userInteracted', 'true');
                this.hasInteracted = true;
                button.innerHTML = '🔊 Stop Music';
            }).catch(error => {
                console.log('Playback failed:', error);
                button.innerHTML = '❌ Audio Error';
                button.style.background = 'rgba(255, 0, 0, 0.7)';
                // Retry once on error
                setTimeout(() => {
                    this.tryPlayAudio(button);
                }, 1000);
            });
        }
    }
} 