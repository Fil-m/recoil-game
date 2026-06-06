// js/boss.js
class Boss {
    constructor(x, y, levelNum) {
        this.x = x;
        this.y = y;
        const s = Game.scale || 1;
        this.w = 120 * s;
        this.h = 120 * s;
        this.levelNum = levelNum;
        
        // Здоров'я залежить від рівня
        this.maxHp = 10 + levelNum * 10;
        this.hp = this.maxHp;
        this.active = true;
        
        // Патрулювання/Стрибки
        this.vx = 0;
        this.vy = 0;
        this.timer = 0;
        this.state = 'idle';
        
        this.fireCooldown = 1;
    }
    
    update(dt, level, player) {
        if (!this.active) return null;
        
        this.timer += dt;
        
        // Гравітація
        this.vy += 1800 * dt;
        
        // Поведінка залежить від рівня (поки що шаблон для всіх)
        if (this.state === 'idle') {
            // Бос стоїть і стріляє 2 секунди
            if (this.timer > 2) {
                this.state = 'jump';
                this.timer = 0;
                this.vy = -1000; // Стрибок
                // Стрибок в бік гравця
                if (player.x < this.x) this.vx = -300;
                else this.vx = 300;
            }
        } else if (this.state === 'jump') {
            if (this.vy === 0) { // Приземлився
                this.state = 'idle';
                this.timer = 0;
                this.vx = 0;
            }
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Колізія з підлогою
        const floorY = level.getHeightAt(this.x + this.w / 2);
        if (this.y + this.h > floorY) {
            this.y = floorY - this.h;
            this.vy = 0;
        }
        
        // Обмеження арени боса (останні 800 пікселів рівня)
        if (this.x < level.width - 800) {
            this.x = level.width - 800;
            this.vx *= -1;
        }
        if (this.x > level.width - this.w) {
            this.x = level.width - this.w;
            this.vx *= -1;
        }
        
        // Стрільба
        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0) {
            // Чим вище рівень, тим частіше стріляє
            this.fireCooldown = Math.max(0.3, 1.5 - this.levelNum * 0.1); 
            
            const dx = player.x - (this.x + this.w / 2);
            const dy = player.y - (this.y + this.h / 2);
            const angle = Math.atan2(dy, dx);
            
            return new EnemyBullet(this.x + this.w / 2, this.y + this.h / 2, angle);
        }
        
        return null;
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        // Тіло боса (Великий фіолетовий квадрат)
        ctx.fillStyle = '#673AB7'; // Глибокий фіолетовий
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        ctx.strokeStyle = '#311B92';
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        
        // Очі (злі)
        ctx.fillStyle = '#f44336';
        if (this.state === 'idle') {
            ctx.fillRect(this.x + 20, this.y + 30, 30, 10);
            ctx.fillRect(this.x + 70, this.y + 30, 30, 10);
        } else {
            // У стрибку очі ширші
            ctx.fillRect(this.x + 20, this.y + 20, 30, 20);
            ctx.fillRect(this.x + 70, this.y + 20, 30, 20);
        }
        
        // Смужка здоров'я (велика над босом)
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x, this.y - 25, this.w, 12);
        ctx.fillStyle = '#E91E63'; // Яскраво рожевий для боса
        ctx.fillRect(this.x + 2, this.y - 23, (this.w - 4) * (this.hp / this.maxHp), 8);
    }
}
