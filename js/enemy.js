class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        const s = Game.scale || 1;
        this.w = 50 * s;
        this.h = 72 * s;
        this.hp = 1;
        this.maxHp = 1;
        this.active = true;
        this.type = type;
        
        // Патрулювання
        this.vx = (Math.random() > 0.5 ? 1 : -1) * 60 * s;
        this.vy = 0;
        
        // Стрільба (кожні 5-10 секунд)
        this.fireCooldown = Math.random() * 5 + 5;
        
        this.gravity = 1800;
        
        if (type === 'armored') {
            this.hp = 1;
            this.maxHp = 1;
            this.w = 40;
            this.h = 60;
            this.vx *= 0.5; // Повільніший
        } else if (type === 'flying') {
            this.hp = 1;
            this.maxHp = 1;
            this.y -= 200; // Літає високо
            this.vy = 0;
            this.gravity = 0; // Не падає
        } else if (type === 'jumping') {
            this.hp = 1;
            this.maxHp = 1;
            this.vx *= 1.5; // Швидший
        }
    }
    
    update(dt, level, player) {
        if (!this.active) return null;
        
        // Гравітація
        this.vy += this.gravity * dt;
        
        if (this.type === 'jumping' && this.vy === 0 && Math.random() < 0.02) {
            this.vy = -700; // Стрибок
        }
        
        if (this.type === 'flying') {
            // Плавання у повітрі
            this.y += Math.sin(Date.now() / 200) * 2;
            // Переслідування по висоті, якщо гравець близько
            if (Math.abs(this.x - player.x) < 600) {
                this.y += (player.y - 150 - this.y) * 2 * dt;
            }
        }
        
        // Рух
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        if (this.type !== 'flying') {
            // Колізія з підлогою
            const floorY = level.getHeightAt(this.x + this.w / 2);
            if (this.y + this.h > floorY) {
                this.y = floorY - this.h;
                this.vy = 0;
            }
        }
        
        // Розвертання на перешкодах або межах
        const obs = level.checkCollision(this.x + this.w / 2, this.y + this.h / 2, 15);
        if (obs || Math.random() < 0.01 || this.x < 0 || this.x > level.width) {
            this.vx *= -1;
        }
        
        // Стрільба
        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0) {
            this.fireCooldown = 5 + Math.random() * 5; // Наступний постріл
            
            // Стріляємо в бік гравця
            const dx = player.x - (this.x + this.w / 2);
            const dy = player.y - (this.y + this.h / 2);
            const angle = Math.atan2(dy, dx);
            
            // Якщо гравець далеко, не стріляємо
            if (Math.hypot(dx, dy) < 800 * (Game.scale || 1)) {
                return new EnemyBullet(this.x + this.w / 2, this.y + this.h / 2, angle);
            }
        }
        
        return null;
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        // Тіло ворога
        if (this.type === 'armored') ctx.fillStyle = '#607D8B';
        else if (this.type === 'flying') ctx.fillStyle = '#03A9F4';
        else if (this.type === 'jumping') ctx.fillStyle = '#FF9800';
        else ctx.fillStyle = '#E53935'; // normal
        
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        // Броня
        if (this.type === 'armored') {
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
        }
        
        // Очі
        ctx.fillStyle = '#fff';
        if (this.vx > 0) {
            ctx.fillRect(this.x + this.w / 2 - 8, this.y + 15, 7, 7);
            ctx.fillRect(this.x + this.w / 2 + 6, this.y + 15, 7, 7);
        } else {
            ctx.fillRect(this.x + 8, this.y + 15, 7, 7);
            ctx.fillRect(this.x + 26, this.y + 15, 7, 7);
        }
        
        // Смужка здоров'я
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x, this.y - 12, this.w, 6);
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(this.x + 1, this.y - 11, (this.w - 2) * (this.hp / this.maxHp), 4);
    }
}

class EnemyBullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.radius = 6;
        
        // Повільні снаряди (200-300 пікселів за секунду)
        const speed = 250; 
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.active = true;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#FF5722'; // Оранжевий
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
