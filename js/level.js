// js/level.js
class Level {
    constructor(levelNum = 1) {
        this.levelNum = levelNum;
        this.width = 4000;
        this.height = 600;
        this.generateFloor();
        this.generateObstacles();
    }
    
    generateFloor() {
        this.floorPoints = [];
        const segmentWidth = 200; // кожні 200 пікселів нова точка висоти
        let currentY = 500;
        
        for (let x = 0; x <= this.width + segmentWidth; x += segmentWidth) {
            this.floorPoints.push({ x: x, y: currentY });
            
            // Випадкова зміна висоти для наступної точки
            currentY += (Math.random() - 0.5) * 150;
            
            // Обмежуємо висоту підлоги
            if (currentY < 300) currentY = 300;
            if (currentY > 580) currentY = 580;
        }
    }
    
    getHeightAt(x) {
        if (x <= 0) return this.floorPoints[0].y;
        if (x >= this.width) return this.floorPoints[this.floorPoints.length - 2].y; // передостання точка - це кінець рівня
        
        // Знайдемо відрізок, в який потрапляє x
        for (let i = 0; i < this.floorPoints.length - 1; i++) {
            const p1 = this.floorPoints[i];
            const p2 = this.floorPoints[i+1];
            if (x >= p1.x && x < p2.x) {
                // Лінійна інтерполяція для плавного схилу
                const t = (x - p1.x) / (p2.x - p1.x);
                return p1.y + t * (p2.y - p1.y);
            }
        }
        return 550; // fallback
    }

    generateObstacles() {
        this.obstacles = [];
        this.coins = [];
        this.upgrades = [];
        this.enemies = [];
        
        // 1. Дерев'яні ящики та кам'яні блоки (дерев'яні 3 HP, кам'яні 10 HP)
        const obstacleCount = 15 + this.levelNum * 2;
        for (let i = 0; i < obstacleCount; i++) {
            const x = 500 + Math.random() * 3200;
            const isStone = this.levelNum >= 10 && Math.random() > 0.5;
            const s = Game.scale || 1;
            const w = 40 * s;
            const h = 40 * s;
            const y = this.getHeightAt(x + w/2) - h;
            
            this.obstacles.push({
                x: x, y: y, w: w, h: h, 
                hp: isStone ? 10 : 3, 
                maxHp: isStone ? 10 : 3, 
                type: isStone ? 'stone' : 'box'
            });
        }
        
        // 2. Сталактити
        const stalactiteCount = 10 + this.levelNum;
        for (let i = 0; i < stalactiteCount; i++) {
            const x = 800 + Math.random() * 3000;
            const s = Game.scale || 1;
            const w = 30 * s;
            const h = (80 + Math.random() * 150) * s;
            
            this.obstacles.push({
                x: x, y: 0, w: w, h: h, 
                hp: 1, maxHp: 1, type: 'stalactite'
            });
        }
        
        // 3. Монетки
        for (let i = 0; i < 30 + this.levelNum * 2; i++) {
            const x = 300 + Math.random() * 3500;
            const y = this.getHeightAt(x) - 80 - Math.random() * 150;
            this.coins.push(new Coin(x, y));
        }
        
        // 4. Тимчасові та постійні апгрейди
        // Типи з ТЗ: кулемет, супервіддача, слабка віддача, базука, гранатомет, лазер, самонавідні
        const upgradeTypes = ['machinegun', 'super_recoil', 'weak_recoil', 'bazooka', 'grenade', 'laser', 'homing'];
        const upgradeCount = 4 + Math.floor(this.levelNum / 3);
        
        for (let i = 0; i < upgradeCount; i++) {
            const x = 600 + Math.random() * 3000;
            const y = this.getHeightAt(x) - 150;
            const type = upgradeTypes[Math.floor(Math.random() * upgradeTypes.length)];
            this.upgrades.push(new Upgrade(x, y, type));
        }
        
        // Постійний апгрейд (подвійний постріл) - один на рівень
        this.upgrades.push(new Upgrade(400 + Math.random() * 400, this.getHeightAt(600) - 150, 'double_shot'));
        
        // 5. Вороги з прогресією:
        // Рівень 1+: normal
        // Рівень 3+: jumping
        // Рівень 5+: flying
        // Рівень 8+: armored
        const enemyCount = 10 + this.levelNum * 2;
        for (let i = 0; i < enemyCount; i++) {
            const x = 800 + Math.random() * 2800;
            const y = this.getHeightAt(x) - 100;
            
            let type = 'normal';
            if (this.levelNum >= 8 && Math.random() > 0.7) type = 'armored';
            else if (this.levelNum >= 5 && Math.random() > 0.6) type = 'flying';
            else if (this.levelNum >= 3 && Math.random() > 0.5) type = 'jumping';
            
            this.enemies.push(new Enemy(x, y, type));
        }
        
        // 6. Бос
        this.boss = new Boss(this.width - 400, this.getHeightAt(this.width - 400) - 200, this.levelNum);
    }
    
    checkCollision(x, y, radius) {
        // Перевірка колізії кола (радіус) з прямокутниками перешкод
        for (let obs of this.obstacles) {
            // Найближча точка прямокутника до центру кола
            let closestX = Math.max(obs.x, Math.min(x, obs.x + obs.w));
            let closestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
            
            let distanceX = x - closestX;
            let distanceY = y - closestY;
            let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
            
            if (distanceSquared < (radius * radius)) {
                return obs;
            }
        }
        return null;
    }
    
    update(dt) {
        // Оновлення логіки рівня (наприклад рухомих платформ)
        this.coins.forEach(c => c.update(dt));
        this.upgrades.forEach(u => u.update(dt));
    }
    
    draw(ctx) {
        // Малюємо підлогу
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.moveTo(0, this.height + 200); // Знизу екрану
        
        for (let p of this.floorPoints) {
            ctx.lineTo(p.x, p.y);
        }
        
        ctx.lineTo(this.width, this.height + 200);
        ctx.closePath();
        ctx.fill();
        
        // Обводка підлоги (трава)
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        // Малюємо стелю
        ctx.fillStyle = '#555';
        ctx.fillRect(0, -200, this.width, 200);

        // Малюємо ліву межу
        ctx.fillRect(-100, -200, 100, this.height + 400);
        
        // Малюємо перешкоди
        for (let obs of this.obstacles) {
            if (obs.type === 'box') {
                ctx.fillStyle = '#8D6E63'; // Коричневий ящик
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#3E2723';
                ctx.lineWidth = 2;
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                
                if (obs.hp < obs.maxHp) {
                    ctx.beginPath();
                    ctx.moveTo(obs.x + 5, obs.y + 5);
                    ctx.lineTo(obs.x + obs.w - 5, obs.y + obs.h - 5);
                    if (obs.hp === 1) {
                        ctx.moveTo(obs.x + obs.w - 5, obs.y + 5);
                        ctx.lineTo(obs.x + 5, obs.y + obs.h - 5);
                    }
                    ctx.stroke();
                }
            } else if (obs.type === 'stone') {
                ctx.fillStyle = '#455A64'; // Темний камінь
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeStyle = '#263238';
                ctx.lineWidth = 3;
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                if (obs.hp < obs.maxHp) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#fff';
                    ctx.moveTo(obs.x + 10, obs.y + 10);
                    ctx.lineTo(obs.x + obs.w - 10, obs.y + obs.h - 10);
                    ctx.stroke();
                }
            } else if (obs.type === 'stalactite') {
                ctx.fillStyle = '#777';
                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y);
                ctx.lineTo(obs.x + obs.w, obs.y);
                ctx.lineTo(obs.x + obs.w / 2, obs.y + obs.h);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        
        // Малюємо монетки та апгрейди
        this.coins.forEach(c => c.draw(ctx));
        this.upgrades.forEach(u => u.draw(ctx));
        
        // Малюємо ворогів
        this.enemies.forEach(e => e.draw(ctx));
        
        // Малюємо боса
        if (this.boss) {
            this.boss.draw(ctx);
        }

        // Малюємо "фініш" рівня
        ctx.fillStyle = '#f44336';
        ctx.fillRect(this.width - 50, this.getHeightAt(this.width - 50) - 200, 50, 200);
    }
}
