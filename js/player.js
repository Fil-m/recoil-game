// js/player.js
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;

        // Кут пістолета (радіани). 0 = дуло вправо.
        this.angle = 0;
        // Кутова швидкість (рад/с). Починаємо зі слабким постійним обертанням.
        this.angularVelocity = 0;
        this.onGround = false;

        this.barrelWidth = 60;
        this.barrelHeight = 16;
        this.gripWidth  = 16;
        this.gripHeight = 40;
        this.s = 1; // буде встановлено в update

        this.fireCooldown = 0;
        
        // Для прицілювання: коли гравець торкається/клікає — цілимо туди
        this.targetAngle = null;
        this.aimStrength = 0.15; // Як швидко пістолет повертається до цілі
        
        this.buffs = {
            machinegun:   0,
            super_recoil: 0,
            weak_recoil:  0,
            bazooka:      0,
            grenade:      0,
            laser:        0,
            homing:       0,
            double_shot:  false
        };

        this.hp = 100;
        this.maxHp = 100;

        // Колізійний радіус
        this.collisionRadius = 24;
    }

    update(dt, level) {
        this.s = Game.scale || 1;
        this.collisionRadius = 24 * this.s;
        this.onGround = false;
        // ── Таймери ──
        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        for (let key in this.buffs) {
            if (typeof this.buffs[key] === 'number' && this.buffs[key] > 0) {
                this.buffs[key] -= dt;
            }
        }

        // ── Гравітація ──
        const gravity = (Game.settings && Game.settings.gravity != null)
            ? Game.settings.gravity : 1800;
        this.vy += gravity * (this.s || 1) * dt;

        // ── Рух ──
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // ── Обмеження швидкості ──
        const maxVy = 3500 * (this.s || 1), maxVx = 3000 * (this.s || 1);
        if (this.vy >  maxVy) this.vy =  maxVy;
        if (this.vy < -maxVy) this.vy = -maxVy;
        if (this.vx >  maxVx) this.vx =  maxVx;
        if (this.vx < -maxVx) this.vx = -maxVx;

        // ── Лінійне тертя обертання у повітрі ──
        // damping = "гальмування" (рад/с²). 0 = без тертя, 100 = дуже різко.
        const friction = (Game.settings && Game.settings.damping != null)
            ? Game.settings.damping : 8;
        if (this.angularVelocity > 0) {
            this.angularVelocity = Math.max(0, this.angularVelocity - friction * dt);
        } else if (this.angularVelocity < 0) {
            this.angularVelocity = Math.min(0, this.angularVelocity + friction * dt);
        }

        // ── Обертання ──
        this.angle += this.angularVelocity * dt;
        
        // ── Прицілювання по дотику/миші ──
        let isAiming = false;
        let aimX = 0, aimY = 0;

        if (Input.touchAim.active) {
            isAiming = true;
            aimX = Input.touchAim.x + (Game.camera ? Game.camera.x : 0);
            aimY = Input.touchAim.y + (Game.camera ? Game.camera.y : 0);
        } else if (Input.mouse.down) {
            aimX = Input.mouse.x + (Game.camera ? Game.camera.x : 0);
            aimY = Input.mouse.y + (Game.camera ? Game.camera.y : 0);
            isAiming = Math.hypot(aimX - this.x, aimY - this.y) > 30;
        }
        
        if (isAiming) {
            const dxAim = aimX - this.x;
            const dyAim = aimY - this.y;
            this.targetAngle = Math.atan2(dyAim, dxAim);
        } else {
            this.targetAngle = null;
        }
        
        // Плавне повертання до цілі (з урахуванням фізики)
        if (this.targetAngle !== null) {
            let diff = this.targetAngle - this.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            // М'яке притягування до цілі (сильніше якщо палець на екрані)
            const pull = Input.touchAim.active ? 0.12 : 0.06;
            this.angularVelocity += diff * pull * 60 * dt;
        }

        // ── Колізії з рівнем ──
        if (level) {
            const R = this.collisionRadius * this.s;

            // Ліва межа рівня
            if (this.x - R < 0) {
                this.x = R;
                this.vx = Math.abs(this.vx) * 0.4;
            }
            // Права межа рівня
            if (this.x + R > level.width) {
                this.x = level.width - R;
                this.vx = -Math.abs(this.vx) * 0.4;
            }

            // Підлога — розумний відскок залежно від швидкості та кута
            const floorY = level.getHeightAt(this.x);
            if (this.y + R > floorY) {
                this.y = floorY - R;
                const impactVy = this.vy; // швидкість удару (+ = падіння)

                this.onGround = true;

                if (impactVy > 120) {
                    // Падіння з достатньою силою → відскок + крутний момент
                    const restitution = 0.45;
                    this.vy = -impactVy * restitution;

                    const cx = Math.cos(this.angle);
                    const landingTorque = cx * impactVy * 0.009;
                    this.angularVelocity += landingTorque;

                    this.angularVelocity *= 0.65;
                    this.vx *= 0.82;
                } else {
                    // Повільне приземлення → просто зупиняємось
                    this.vy = 0;
                    this.vx *= 0.80;
                    this.angularVelocity *= 0.3;
                }
            }

            // Перешкоди
            const obs = level.checkCollision(this.x, this.y, R);
            if (obs) {
                this.vx = -this.vx * 0.5;
                this.vy = -this.vy * 0.5;
                this.angularVelocity *= 0.5;
                // Виштовхування з перешкоди
                const cx = obs.x + obs.w / 2;
                this.x += (this.x < cx) ? -3 : 3;
            }
        }
    }

    shoot() {
        if (this.fireCooldown > 0) return null;

        // ── Вибір типу ──
        const isMachineGun = this.buffs.machinegun > 0;
        const isLaser      = this.buffs.laser > 0;
        this.fireCooldown = isMachineGun ? 0.06 : (isLaser ? 0.03 : 0.18);

        // ── Сила відштовхування ──
        let recoilForce = ((Game.settings && Game.settings.recoilForce != null)
            ? Game.settings.recoilForce : 1000) * (this.s || 1);
        if (this.buffs.super_recoil > 0) recoilForce *= 2.0;
        if (this.buffs.weak_recoil  > 0) recoilForce *= 0.5;

        // ── Векторна фізика відкиду (Gun Sprint стиль) ──
        // Постріл відштовхує рівно в протилежний бік від дула.
        const cx = Math.cos(this.angle);
        const cy = Math.sin(this.angle);
        this.vx -= cx * recoilForce;
        this.vy -= cy * recoilForce;

        // ── Вертикальний "вольт" — завжди додає підйом залежно від горизонтальної компоненти ──
        // Чим більше дуло дивиться горизонтально, тим сильніший підйом.
        // Це дозволяє стріляти по горизонталі і летіти вгору — як у Flip The Gun.
        const liftFactor = 0.55;
        this.vy -= Math.abs(cx) * recoilForce * liftFactor;

        // ── Крутний момент ──
        const baseTorque = (Game.settings && Game.settings.torque != null)
            ? Game.settings.torque : 12;

        // Визначаємо напрямок обертання:
        // - При пострілі вправо (cx > 0) -> відкидає вліво -> пістолет крутиться проти год. стрілки (від'ємний)
        // - При пострілі вліво (cx < 0) -> відкидає вправо -> за годинниковою (позитивний)
        const torqueDir = cx > 0 ? -1 : 1;

        // Soft cap: чим швидше вже крутиться — тим менше додає новий постріл.
        // Починає діяти вже при angularVelocity > baseTorque*1.2 (набагато раніше)
        const sameDirSpin = (this.angularVelocity * torqueDir > 0);
        const softCapFactor = sameDirSpin
            ? Math.max(0.05, 1.0 - Math.abs(this.angularVelocity) / (baseTorque * 1.2))
            : 0.7; // протилежний напрямок теж гальмуємо трохи

        this.angularVelocity += torqueDir * baseTorque * softCapFactor;

        // Жорсткий ліміт — пістолет не може крутитись швидше ±18 рад/с
        const maxSpin = 18;
        if (this.angularVelocity >  maxSpin) this.angularVelocity =  maxSpin;
        if (this.angularVelocity < -maxSpin) this.angularVelocity = -maxSpin;

        // ── Відскок від землі при пострілі ──
        // Якщо recoil штовхає вниз (vy > 0) і пістолет на землі — відбиваємо вгору
        if (this.onGround && this.vy > 0) {
            // Відбиваємо вертикальний компонент recoil'у вгору
            this.vy = -this.vy * 0.9;
            // Додатковий torque — пістолет крутиться при відскоку від землі
            this.angularVelocity += torqueDir * baseTorque * 1.2;
            this.onGround = false;
        }

        // ── Позиція кінця ствола ──
        const tipX = this.x + cx * this.barrelWidth;
        const tipY = this.y + cy * this.barrelWidth;

        // ── Вибір типу кулі ──
        let bulletType = 'normal';
        if (this.buffs.bazooka > 0) bulletType = 'bazooka';
        else if (this.buffs.grenade > 0) bulletType = 'grenade';
        else if (isLaser) bulletType = 'laser';
        else if (this.buffs.homing > 0) bulletType = 'homing';

        const result = [new Bullet(tipX, tipY, this.angle, bulletType)];
        if (this.buffs.double_shot) {
            result.push(new Bullet(tipX, tipY, this.angle + 0.15, bulletType));
        }
        return result;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Тінь/свічення
        ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
        ctx.shadowBlur = 10;

        // Дуло (горизонтальна частина Г)
        ctx.fillStyle = '#78909C';
        ctx.fillRect(-10, -this.barrelHeight / 2, this.barrelWidth, this.barrelHeight);

        // Деталізація дула
        ctx.fillStyle = '#546E7A';
        ctx.fillRect(this.barrelWidth - 14, -this.barrelHeight / 2, 10, this.barrelHeight);

        // Рукоятка (вертикальна частина Г)
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(-10, this.barrelHeight / 2, this.gripWidth, this.gripHeight);

        // Контури
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 2;
        ctx.strokeRect(-10, -this.barrelHeight / 2, this.barrelWidth, this.barrelHeight);
        ctx.strokeRect(-10, this.barrelHeight / 2, this.gripWidth, this.gripHeight);

        // Курок
        ctx.fillStyle = '#263238';
        ctx.fillRect(2, 6, 8, 14);

        ctx.restore();
    }
}
