// js/input.js
const Input = {
    keys: {},
    mouse: { x: 0, y: 0, clicked: false, down: false },
    touch: { active: false, x: 0, y: 0 },

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
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            updateMousePos(touch.clientX, touch.clientY);
            this.touch.active = true;
            this.touch.x = this.mouse.x;
            this.touch.y = this.mouse.y;
            this.mouse.clicked = true;
            this.mouse.down = true;
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            updateMousePos(touch.clientX, touch.clientY);
            this.touch.active = true;
            this.touch.x = this.mouse.x;
            this.touch.y = this.mouse.y;
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.mouse.down = false;
            this.touch.active = false;
        }, { passive: false });
        
        // Обробка контекстного меню (щоб не заважало при кліках)
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    },

    clear() {
        this.mouse.clicked = false;
    }
};
