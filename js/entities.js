// js/entities.js

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12 * (Game.scale || 1);
        this.collected = false;
        
        // Для анімації підстрибування
        this.startY = y;
        this.time = Math.random() * Math.PI * 2;
    }
    
    update(dt) {
        if (this.collected) return;
        this.time += dt * 3;
        this.y = this.startY + Math.sin(this.time) * 10;
    }
    
    draw(ctx) {
        if (this.collected) return;
        
        ctx.fillStyle = '#FFD700'; // Золотий
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#B8860B';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', this.x, this.y);
    }
}

class Upgrade {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = 15 * (Game.scale || 1);
        this.type = type; // 'machinegun', 'super_recoil', 'double_shot'
        this.collected = false;
        
        this.startY = y;
        this.time = Math.random() * Math.PI * 2;
    }
    
    update(dt) {
        if (this.collected) return;
        this.time += dt * 3;
        this.y = this.startY + Math.sin(this.time) * 10;
    }
    
    draw(ctx) {
        if (this.collected) return;
        
        let color = '#00BCD4';
        let symbol = '?';
        
        if (this.type === 'machinegun') {
            color = '#E91E63'; symbol = 'MG';
        } else if (this.type === 'super_recoil') {
            color = '#9C27B0'; symbol = 'SR';
        } else if (this.type === 'weak_recoil') {
            color = '#3F51B5'; symbol = 'WR';
        } else if (this.type === 'bazooka') {
            color = '#FF9800'; symbol = 'BZ';
        } else if (this.type === 'grenade') {
            color = '#795548'; symbol = 'GR';
        } else if (this.type === 'laser') {
            color = '#FFEB3B'; symbol = 'LS';
        } else if (this.type === 'homing') {
            color = '#FF5722'; symbol = 'HM';
        } else if (this.type === 'double_shot') {
            color = '#4CAF50'; symbol = 'x2';
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, this.x, this.y);
    }
}
