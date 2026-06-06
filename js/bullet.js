// js/bullet.js
class Bullet {
    constructor(x, y, angle, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;
        
        let speed = 1500;
        this.radius = 4;
        this.damage = 1;
        
        if (type === 'bazooka') {
            speed = 800;
            this.radius = 12;
            this.damage = 10;
        } else if (type === 'grenade') {
            speed = 600;
            this.radius = 8;
            this.damage = 5;
        } else if (type === 'laser') {
            speed = 5000;
            this.radius = 2;
            this.damage = 2;
        } else if (type === 'homing') {
            speed = 1000;
            this.radius = 5;
        }
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }
    
    update(dt, level, enemies) {
        if (this.type === 'homing' && enemies) {
            // Пошук найближчого ворога
            let nearest = null;
            let minDist = 600;
            enemies.forEach(e => {
                if (e.active) {
                    let d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < minDist) {
                        minDist = d;
                        nearest = e;
                    }
                }
            });
            if (nearest) {
                let targetAngle = Math.atan2(nearest.y + 25 - this.y, nearest.x + 15 - this.x);
                let currentAngle = Math.atan2(this.vy, this.vx);
                let speed = Math.hypot(this.vx, this.vy);
                // Плавне повертання до цілі
                let diff = targetAngle - currentAngle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                currentAngle += diff * dt * 5;
                this.vx = Math.cos(currentAngle) * speed;
                this.vy = Math.sin(currentAngle) * speed;
            }
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    
    draw(ctx) {
        if (this.type === 'laser') {
            ctx.strokeStyle = '#FFEB3B';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.x - this.vx * 0.02, this.y - this.vy * 0.02);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            return;
        }
        
        ctx.fillStyle = this.type === 'bazooka' ? '#FF9800' : (this.type === 'grenade' ? '#795548' : '#ffeb3b');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = this.radius * 2;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
