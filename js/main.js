// js/main.js
const GameState = {
    MENU: 0,
    PLAYING: 1,
    SETTINGS: 2,
    GAMEOVER: 3
};

const Game = {
    canvas: null,
    ctx: null,
    state: GameState.MENU,
    lastTime: 0,
    player: null,
    level: null,
    bullets: [],
    enemyBullets: [],
    camera: { x: 0, y: 0 },
    score: 0,
    levelNum: 1,
    timeScale: 1.0,
    slowMoTimer: 0,
    shakeX: 0,
    shakeY: 0,
    shakeIntensity: 0,
    
    settings: {
        soundEnabled: true,
        gravity: 1800,
        recoilForce: 1000,
        torque: 15,
        damping: 10,
        slowmoSpeed: 0.35,
        slowmoDuration: 0.6,
        slowmoEase: 2.5,
        globalSpeed: 1.0
    },
    audioCtx: null,

    init() {
        console.log("Game.init() called");
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error("Canvas not found!");
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        
        // HiDPI / Retina: масштабуємо канвас до фізичних пікселів
        this.dpr = window.devicePixelRatio || 1;
        if (this.dpr > 1) {
            this.canvas.width = 800 * this.dpr;
            this.canvas.height = 600 * this.dpr;
            this.ctx.scale(this.dpr, this.dpr);
        }
        
        Input.init(this.canvas);
        this.loadSettings();
        this.initUI();
        
        console.log("Game initialized, changing state to MENU");
        this.changeState(GameState.MENU);
        
        requestAnimationFrame((time) => this.loop(time));
    },

    loadSettings() {
        const saved = localStorage.getItem('recoilGameSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        const sndEl = document.getElementById('toggle-sound');
        if (sndEl) sndEl.checked = this.settings.soundEnabled;
        
        const setVal = (id, val) => {
            const el = document.getElementById(`slider-${id}`);
            if (el) { el.value = val; }
            const span = document.getElementById(`val-${id}`);
            if (span) span.textContent = val;
        };
        setVal('gravity',  this.settings.gravity);
        setVal('recoil',   this.settings.recoilForce);
        setVal('torque',   this.settings.torque);
        setVal('damping',  this.settings.damping  != null ? this.settings.damping  : 8);
        setVal('slowmo-speed',    this.settings.slowmoSpeed    != null ? this.settings.slowmoSpeed    : 0.35);
        setVal('slowmo-duration', this.settings.slowmoDuration != null ? this.settings.slowmoDuration : 0.6);
        setVal('slowmo-ease',     this.settings.slowmoEase     != null ? this.settings.slowmoEase     : 2.5);
        setVal('global-speed',    this.settings.globalSpeed    != null ? this.settings.globalSpeed    : 1.0);
    },

    saveSettings() {
        localStorage.setItem('recoilGameSettings', JSON.stringify(this.settings));
    },

    initUI() {
        document.getElementById('btn-play').addEventListener('click', () => {
            this.changeState(GameState.PLAYING);
        });
        
        // Аудіо на мобільних: створюємо контекст при першому дотику ДЕ ЗАВГОДНО
        document.addEventListener('touchstart', () => { this.ensureAudio(); }, { once: true });
        document.addEventListener('click', () => { this.ensureAudio(); }, { once: true });

        document.getElementById('btn-settings').addEventListener('click', () => {
            this.changeState(GameState.SETTINGS);
        });

        document.getElementById('btn-back').addEventListener('click', () => {
            this.changeState(GameState.MENU);
        });
        
        document.getElementById('btn-retry').addEventListener('click', () => {
            this.levelNum = 1;
            this.changeState(GameState.PLAYING);
        });
        document.getElementById('btn-retry-menu').addEventListener('click', () => {
            this.levelNum = 1;
            this.changeState(GameState.MENU);
        });
        
        document.getElementById('toggle-sound').addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            this.saveSettings();
        });
        
        const setupSlider = (id, key) => {
            const el = document.getElementById(`slider-${id}`);
            const span = document.getElementById(`val-${id}`);
            if (!el) return; // Пропускаємо, якщо слайдера немає в HTML
            el.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.settings[key] = val;
                this.saveSettings();
                if (span) span.textContent = val;
                if (this.player && key === 'gravity') {
                    this.player.gravity = val;
                }
            });
        };
        
        setupSlider('gravity',         'gravity');
        setupSlider('recoil',          'recoilForce');
        setupSlider('torque',          'torque');
        setupSlider('damping',         'damping');
        setupSlider('slowmo-speed',    'slowmoSpeed');
        setupSlider('slowmo-duration', 'slowmoDuration');
        setupSlider('slowmo-ease',     'slowmoEase');
        setupSlider('global-speed',    'globalSpeed');
    },

    ensureAudio() {
        if (!this.audioCtx) {
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch(e) { return null; }
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    },

    playSound(type) {
        if (!this.settings.soundEnabled) return;
        const ctx = this.ensureAudio();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (type === 'shoot') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'coin') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.setValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.2);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (e) {
            console.error("Audio error", e);
        }
    },

    changeState(newState) {
        this.state = newState;
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        const hudEl = document.getElementById('hud');
        if (hudEl) hudEl.classList.remove('active');
        if (this.canvas) this.canvas.style.display = 'none';

        if (newState === GameState.MENU) {
            document.getElementById('main-menu').classList.add('active');
        } else if (newState === GameState.SETTINGS) {
            document.getElementById('settings-menu').classList.add('active');
        } else if (newState === GameState.PLAYING) {
            if (hudEl) hudEl.classList.add('active');
            if (this.canvas) this.canvas.style.display = 'block';
            this.startLevel();
        } else if (newState === GameState.GAMEOVER) {
            document.getElementById('gameover-menu').classList.add('active');
        }
    },

    startLevel() {
        console.log("Starting level", this.levelNum);
        this.level = new Level(this.levelNum);
        this.player = new Player(100, 200);
        this.bullets = [];
        this.enemyBullets = [];
        this.camera = { x: 0, y: 0 };
        this.score = 0;
        this.timeScale = this.settings.globalSpeed ?? 1.0;
        this.slowMoTimer = 0;
    },

    update(dt) {
        if (this.state !== GameState.PLAYING) return;
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            const targetSpeed = this.settings.globalSpeed ?? 1.0;
            if (this.slowMoTimer <= 0) {
                this.timeScale = targetSpeed;
            } else {
                // Плавне повернення до цільової швидкості (ease out)
                const ease = (this.settings.slowmoEase != null ? this.settings.slowmoEase : 2.5);
                this.timeScale += (targetSpeed - this.timeScale) * ease * dt;
            }
        } else {
            // Якщо таймер не активний, переконуємось, що швидкість відповідає глобальній
            this.timeScale = this.settings.globalSpeed ?? 1.0;
        }
        const scaledDt = dt * this.timeScale;
        if (this.player && this.level) {
            this.player.update(scaledDt, this.level);
        }
        if (Input.mouse.down || Input.keys['Space']) {
            if (this.player) {
                const newBullets = this.player.shoot();
                if (newBullets && newBullets.length > 0) {
                    this.bullets.push(...newBullets);
                    this.playSound('shoot');
                }
            }
        }
        if (this.player && this.level) {
            const pr = 30;
            this.level.coins.forEach(c => {
                if (!c.collected && Math.hypot(this.player.x - c.x, this.player.y - c.y) < pr + c.radius) {
                    c.collected = true;
                    this.score += 10;
                    this.playSound('coin');
                }
            });
            this.level.upgrades.forEach(u => {
                if (!u.collected && Math.hypot(this.player.x - u.x, this.player.y - u.y) < pr + u.radius) {
                    u.collected = true;
                    this.playSound('coin');
                    const d = 5;
                    if (u.type === 'machinegun') this.player.buffs.machinegun = d;
                    else if (u.type === 'super_recoil') this.player.buffs.super_recoil = d;
                    else if (u.type === 'weak_recoil') this.player.buffs.weak_recoil = d;
                    else if (u.type === 'bazooka') this.player.buffs.bazooka = d;
                    else if (u.type === 'grenade') this.player.buffs.grenade = d;
                    else if (u.type === 'laser') this.player.buffs.laser = d;
                    else if (u.type === 'homing') this.player.buffs.homing = d;
                    else if (u.type === 'double_shot') this.player.buffs.double_shot = true;
                }
            });
        }
        if (this.level) this.level.update(scaledDt);
        if (this.level && this.player) {
            this.level.enemies.forEach(enemy => {
                if (enemy.active) {
                    const eBullet = enemy.update(scaledDt, this.level, this.player);
                    if (eBullet) this.enemyBullets.push(eBullet);
                }
            });
            if (this.level.boss) {
                const boss = this.level.boss;
                if (boss.active) {
                    if (this.player.x > this.level.width - 1200) {
                        const eBullet = boss.update(scaledDt, this.level, this.player);
                        if (eBullet) this.enemyBullets.push(eBullet);
                    }
                } else {
                    this.score += 500;
                    this.levelNum++;
                    if (this.levelNum > 15) {
                        alert("Вітаємо! Ви пройшли гру!");
                        this.changeState(GameState.MENU);
                    } else {
                        this.startLevel();
                    }
                    return;
                }
            }
        }
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(scaledDt, this.level, this.level.enemies);
            let bulletRemoved = false;
            let explosion = false;
            
            // ⏱ Сповільнення часу ПЕРЕД попаданням (bullet time)
            const SLOWMO_TRIGGER = 140; // дистанція до ворога для активації
            let nearEnemySlow = false;
            for (let enemy of this.level.enemies) {
                if (enemy.active) {
                    const dx = b.x - (enemy.x + enemy.w / 2);
                    const dy = b.y - (enemy.y + enemy.h / 2);
                    if (dx * dx + dy * dy < SLOWMO_TRIGGER * SLOWMO_TRIGGER) {
                        nearEnemySlow = true;
                        break;
                    }
                }
            }
            // Також перевіряємо боса
            if (!nearEnemySlow && this.level.boss && this.level.boss.active) {
                const bx = this.level.boss.x + this.level.boss.w / 2;
                const by = this.level.boss.y + this.level.boss.h / 2;
                if ((b.x - bx) * (b.x - bx) + (b.y - by) * (b.y - by) < (SLOWMO_TRIGGER * 1.5) * (SLOWMO_TRIGGER * 1.5)) {
                    nearEnemySlow = true;
                }
            }
            if (nearEnemySlow) {
                this.slowMoTimer = this.settings.slowmoDuration ?? 0.6;
                this.timeScale = this.settings.slowmoSpeed ?? 0.35;
            }
            if (this.level) {
                for (let enemy of this.level.enemies) {
                    if (enemy.active && b.x > enemy.x && b.x < enemy.x + enemy.w &&
                        b.y > enemy.y && b.y < enemy.y + enemy.h) {
                        enemy.hp -= b.damage || 1;
                        this.playSound('hit');
                        if (enemy.hp <= 0) {
                            enemy.active = false;
                            this.score += 50;
                            // Невеликий імпакт-фріз після вбивства
                            this.slowMoTimer = 0.15;
                            this.timeScale = this.settings.slowmoSpeed ?? 0.35;
                        }
                        if (b.type === 'grenade') explosion = true;
                        bulletRemoved = (b.type !== 'laser');
                        break;
                    }
                }
                if (!bulletRemoved && this.level.boss && this.level.boss.active) {
                    const boss = this.level.boss;
                    if (b.x > boss.x && b.x < boss.x + boss.w &&
                        b.y > boss.y && b.y < boss.y + boss.h) {
                        boss.hp -= 1;
                        this.playSound('hit');
                        if (boss.hp <= 0) {
                            boss.active = false;
                            this.slowMoTimer = 0.3;
                            this.timeScale = this.settings.slowmoSpeed ?? 0.35;
                        }
                        bulletRemoved = true;
                    }
                }
            }
            if (this.level && !bulletRemoved) {
                const obs = this.level.checkCollision(b.x, b.y, b.radius);
                if (obs) {
                    obs.hp -= b.damage || 1;
                    if (obs.hp <= 0) {
                        const idx = this.level.obstacles.indexOf(obs);
                        if (idx > -1) this.level.obstacles.splice(idx, 1);
                    }
                    if (b.type === 'grenade') explosion = true;
                    bulletRemoved = true; 
                }
                if (!bulletRemoved && b.y > this.level.getHeightAt(b.x)) {
                    if (b.type === 'grenade') explosion = true;
                    bulletRemoved = true;
                }
            }
            if (explosion) {
                const r = 150;
                this.level.enemies.forEach(e => {
                    if (e.active && Math.hypot(e.x - b.x, e.y - b.y) < r) {
                        e.hp -= 5;
                        if (e.hp <= 0) e.active = false;
                    }
                });
                if (this.level.boss && this.level.boss.active && Math.hypot(this.level.boss.x - b.x, this.level.boss.y - b.y) < r) {
                    this.level.boss.hp -= 5;
                }
            }
            if (bulletRemoved || !b.active || b.x > this.level.width || b.x < 0 || b.y < -500) {
                this.bullets.splice(i, 1);
            }
        }
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const eb = this.enemyBullets[i];
            eb.update(scaledDt);
            let bulletRemoved = false;
            if (this.player) {
                const dist = Math.hypot(this.player.x - eb.x, this.player.y - eb.y);
                if (dist < 30 + eb.radius) {
                    this.player.hp -= 10;
                    bulletRemoved = true;
                    this.playSound('hit');
                    this.shakeIntensity = Math.min(this.shakeIntensity + 8, 16);
                    if (this.player.hp <= 0) {
                        this.changeState(GameState.GAMEOVER);
                        return;
                    }
                }
            }
            if (this.level && eb.y > this.level.getHeightAt(eb.x)) bulletRemoved = true;
            if (bulletRemoved || eb.x < 0 || eb.x > this.level.width || eb.y < -500) {
                this.enemyBullets.splice(i, 1);
            }
        }
        if (this.player) {
            // Horizontal: гравець завжди по центру
            const targetCamX = this.player.x - this.canvas.width / 2;
            this.camera.x += (targetCamX - this.camera.x) * 8 * dt;
            if (this.camera.x < 0) this.camera.x = 0;
            if (this.camera.x > this.level.width - this.canvas.width) {
                this.camera.x = this.level.width - this.canvas.width;
            }
            // Vertical: гравець завжди по центру
            const targetCamY = this.player.y - this.canvas.height / 2;
            this.camera.y += (targetCamY - this.camera.y) * 8 * dt;
        }
    },

    draw() {
        if (this.state !== GameState.PLAYING) return;

        // ── Screen shake ──
        if (this.shakeIntensity > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.9;
            if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
            this.ctx.save();
            this.ctx.translate(this.shakeX, this.shakeY);
        } else if (this.shakeX !== 0) {
            this.ctx.restore();
            this.shakeX = 0;
            this.shakeY = 0;
        }
        
        // ── Небо / фон ──
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        skyGrad.addColorStop(0, '#5BB3D9');
        skyGrad.addColorStop(1, '#A8D8EA');
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ── Ігровий світ ──
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        if (this.level) this.level.draw(this.ctx);
        this.bullets.forEach(b => b.draw(this.ctx));
        this.enemyBullets.forEach(eb => eb.draw(this.ctx));
        if (this.player) this.player.draw(this.ctx);
        if (this.shakeIntensity > 0) {
            this.ctx.restore();
        }
        this.ctx.restore();

        // ── HUD (оновлення DOM) ──
        if (this.player) {
            const statsEl = document.querySelector('.stats');
            if (statsEl) {
                statsEl.textContent = `Очки: ${this.score}  |  Рівень: ${this.levelNum}  |  HP: ${Math.max(0, this.player.hp)}`;
            }
            const hpBar = document.getElementById('hp-bar');
            if (hpBar) {
                hpBar.style.width = `${(this.player.hp / this.player.maxHp * 100).toFixed(1)}%`;
            }
            const buffsList = document.getElementById('buffs-list');
            if (buffsList) {
                const bTypes = [
                    { id: 'machinegun',   label: 'Кулемет',       color: '#E91E63' },
                    { id: 'super_recoil', label: 'Супервіддача',   color: '#9C27B0' },
                    { id: 'weak_recoil',  label: 'Слабка',         color: '#3F51B5' },
                    { id: 'bazooka',      label: 'Базука',          color: '#FF9800' },
                    { id: 'grenade',      label: 'Гранатомет',     color: '#795548' },
                    { id: 'laser',        label: 'Лазер',           color: '#F5C518' },
                    { id: 'homing',       label: 'Самонавідні',    color: '#FF5722' },
                    { id: 'double_shot',  label: '×2 постріл',     color: '#4CAF50', isBool: true }
                ];
                buffsList.innerHTML = bTypes
                    .filter(bt => bt.isBool ? this.player.buffs[bt.id] : this.player.buffs[bt.id] > 0)
                    .map(bt => {
                        const time = bt.isBool ? '' : ` ${this.player.buffs[bt.id].toFixed(1)}с`;
                        return `<span class="buff-tag" style="background:${bt.color}">${bt.label}${time}</span>`;
                    })
                    .join('');
            }
        }
    },

    loop(time) {
        if (!this.lastTime) this.lastTime = time;
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (dt > 0.1) dt = 0.1;
        this.update(dt);
        this.draw();
        Input.clear();
        requestAnimationFrame((t) => this.loop(t));
    }
};

window.onload = () => {
    Game.init();
};
