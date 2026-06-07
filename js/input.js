// js/input.js
const Input = {
    keys: {},
    mouse: { x: 0, y: 0, clicked: false, down: false },
    touchAim: { active: false, x: 0, y: 0 },
    touchFire: { active: false, clicked: false },

    init(canvas) {
        // Обробка клавіатури
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Обробка миші
        const updateMousePos = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const logW = Game.logicalW || canvas.width;
            const logH = Game.logicalH || canvas.height;
            const scaleX = logW / rect.width;
            const scaleY = logH / rect.height;
            this.mouse.x = (clientX - rect.left) * scaleX;
            this.mouse.y = (clientY - rect.top) * scaleY;
        };

        canvas.addEventListener('mousemove', (e) => {
            updateMousePos(e.clientX, e.clientY);
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.clicked = true;
                this.mouse.down = true;
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.down = false;
            }
        });

        // Обробка тач-подій (для мобільних)
        const handleTouches = (e) => {
            let aimActive = false;
            let fireActive = false;
            
            const rect = canvas.getBoundingClientRect();
            const logW = Game.logicalW || canvas.width;
            const logH = Game.logicalH || canvas.height;
            const scaleX = logW / rect.width;
            const scaleY = logH / rect.height;

            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                // Ліва половина екрана — прицілювання
                if (touch.clientX < window.innerWidth / 2) {
                    aimActive = true;
                    this.touchAim.x = (touch.clientX - rect.left) * scaleX;
                    this.touchAim.y = (touch.clientY - rect.top) * scaleY;
                } else {
                    // Права половина — стрільба
                    if (!this.touchFire.active) {
                        this.touchFire.clicked = true;
                    }
                    fireActive = true;
                }
            }
            
            this.touchAim.active = aimActive;
            this.touchFire.active = fireActive;
        };

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleTouches(e);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handleTouches(e);
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleTouches(e);
        }, { passive: false });
        
        canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            handleTouches(e);
        }, { passive: false });

        // Обробка контекстного меню (щоб не заважало при кліках)
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    },

    clear() {
        this.mouse.clicked = false;
        this.touchFire.clicked = false;
    }
};
