const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 设置画布尺寸为更合适的尺寸
canvas.width = 400;
canvas.height = 800;

// 添加音效和背景音乐
const shootSound = new Audio('./resource/audio/shoot.mp3');
shootSound.volume = 0.2;
const missileSound = new Audio('./resource/audio/shoot.mp3'); // 暂时使用相同音效，音量和音调不同
missileSound.volume = 0.3;
missileSound.playbackRate = 0.8; // 降低音调使其听起来更重
const hitSound = new Audio('./resource/audio/explosion2.wav'); // 使用新的爆炸音效
hitSound.volume = 0.35; // 适当调整音量
const powerUpSound = new Audio('./resource/audio/powerup.mp3');
powerUpSound.volume = 0.5;
const backgroundMusic = new Audio('./resource/audio/background.mp3');
backgroundMusic.volume = 0.3;
backgroundMusic.loop = true;

// 添加新的音效
const playerHitSound = new Audio('./resource/audio/player_hit.mp3');
playerHitSound.volume = 0.45;
const bossDeathSound = new Audio('./resource/audio/boss_death.mp3');
bossDeathSound.volume = 0.6;

// 添加图片资源
const images = {
    health: new Image(),
    weapon: new Image(),
    shield: new Image(),
    missile: new Image()
};

images.health.src = './resource/images/医疗包.svg';
images.weapon.src = './resource/images/导弹.svg';
images.shield.src = './resource/images/子弹.svg';
images.missile.src = './resource/images/导弹.svg';

// 音频控制器
const AudioController = {
    fadeInterval: null,
    fadeStep: 0.05,
    fadeTime: 500,
    
    // 创建新的音效实例
    createAudioInstance: function(audio) {
        const newAudio = new Audio(audio.src);
        newAudio.volume = audio.volume;
        newAudio.playbackRate = audio.playbackRate || 1;
        return newAudio;
    },
    
    // 播放一次性音效
    playOneShot: function(audio) {
        const audioInstance = this.createAudioInstance(audio);
        audioInstance.play().catch(e => console.error('音频播放失败:', e));
        // 播放完成后自动清理实例
        audioInstance.onended = () => {
            audioInstance.remove();
        };
    },

    // 防止音效重叠播放
    playWithDebounce: function(audio, debounceTime = 50) {
        if (audio.currentTime > 0 && audio.currentTime < debounceTime / 1000) {
            return; // 如果音效正在播放的开始阶段，则不重复播放
        }
        audio.currentTime = 0;
        audio.play().catch(e => console.error('音频播放失败:', e));
    },

    // 音量渐入
    fadeIn: function(audio, duration = this.fadeTime) {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }
        
        const targetVolume = parseFloat(audio.dataset.targetVolume) || 1;
        const step = this.fadeStep;
        audio.volume = 0;
        audio.play();
        
        this.fadeInterval = setInterval(() => {
            if (audio.volume + step <= targetVolume) {
                audio.volume += step;
            } else {
                audio.volume = targetVolume;
                clearInterval(this.fadeInterval);
            }
        }, duration * step);
    },

    // 音量渐出
    fadeOut: function(audio, duration = this.fadeTime) {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }
        
        const step = this.fadeStep;
        const fadeOutInterval = setInterval(() => {
            if (audio.volume - step >= 0) {
                audio.volume -= step;
            } else {
                audio.volume = 0;
                audio.pause();
                clearInterval(fadeOutInterval);
            }
        }, duration * step);
    },

    // 停止所有音频
    stopAll: function() {
        [backgroundMusic, shootSound, hitSound, powerUpSound, playerHitSound, bossDeathSound].forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }
};

// 保存每个音频的目标音量
[backgroundMusic, shootSound, hitSound, powerUpSound, playerHitSound, bossDeathSound].forEach(audio => {
    audio.dataset.targetVolume = audio.volume;
});

// 添加星星数组
const stars = Array.from({length: 100}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 2 + 1
}));

let keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // ESC键暂停功能
    if (e.code === 'Escape') {
        togglePause();
    }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// 修改游戏状态对象
let gameState = {
    level: 1,
    score: 0,
    lives: 3,
    maxLives: 5,
    difficulty: 1,
    powerUpActive: false,
    powerUpTimer: null,
    weaponLevel: 1,
    hasShield: false,
    shieldTimer: null,
    levelStartTime: Date.now(), // 关卡开始时间
    bossSpawned: false, // 当前关卡是否已生成BOSS
    currentBoss: null // 当前BOSS引用
};

// 修改BOSS相关的常量和状态
const BOSS_STATES = {
    ENTER: 'enter',
    IDLE: 'idle',
    ATTACK1: 'attack1',
    ATTACK2: 'attack2',
    ATTACK3: 'attack3'
};

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.speed = 5;
        this.baseSpeed = 5;
        this.normalShootingSpeed = 350;
        this.missileShootingSpeed = 700;
        this.lastNormalShot = 0;
        this.lastMissileShot = 0;
        this.engineFlame = 0;
        this.wingAngle = 0;
        this.isInvincible = false; // 新增无敌状态
        this.invincibleTimer = 0; // 无敌计时器
        this.blinkInterval = 0; // 闪烁间隔
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.speed = 5;
        this.baseSpeed = 5;
        this.normalShootingSpeed = 350; // 普通子弹射速
        this.missileShootingSpeed = 700; // 导弹射速（普通子弹的一半）
        this.lastNormalShot = 0;
        this.lastMissileShot = 0;
        this.engineFlame = 0;
        this.wingAngle = 0; // 添加机翼动画
    }

    draw() {
        // 无敌状态下闪烁效果
        if (this.isInvincible && this.blinkInterval < 5) {
            return;
        }
        if (gameState.powerUpActive) {
            ctx.save();
            ctx.shadowColor = 'gold';
            ctx.shadowBlur = 20;
        }

        ctx.save();
        ctx.translate(this.x, this.y + this.height * 0.5);

        // 更新机翼动画
        this.wingAngle = Math.sin(Date.now() / 200) * 0.1;
        ctx.rotate(this.wingAngle);

        // 绘制机身主体
        const gradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
        gradient.addColorStop(0, gameState.powerUpActive ? '#ffd700' : '#4488ff');
        gradient.addColorStop(1, gameState.powerUpActive ? '#ffaa00' : '#2266dd');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -this.height * 0.5);
        ctx.bezierCurveTo(
            this.width * 0.2, -this.height * 0.4,
            this.width * 0.2, this.height * 0.4,
            0, this.height * 0.5
        );
        ctx.bezierCurveTo(
            -this.width * 0.2, this.height * 0.4,
            -this.width * 0.2, -this.height * 0.4,
            0, -this.height * 0.5
        );
        ctx.fill();

        // 绘制机翼
        ctx.fillStyle = gameState.powerUpActive ? '#ffaa00' : '#2266dd';
        
        // 主机翼
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.7, 0);
        ctx.lineTo(this.width * 0.7, 0);
        ctx.lineTo(this.width * 0.3, -this.height * 0.3);
        ctx.lineTo(-this.width * 0.3, -this.height * 0.3);
        ctx.closePath();
        ctx.fill();

        // 尾翼
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.3, this.height * 0.3);
        ctx.lineTo(this.width * 0.3, this.height * 0.3);
        ctx.lineTo(0, this.height * 0.5);
        ctx.closePath();
        ctx.fill();

        // 机舱玻璃
        const cockpitGradient = ctx.createLinearGradient(0, -this.height * 0.3, 0, -this.height * 0.1);
        cockpitGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        cockpitGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.ellipse(0, -this.height * 0.2, this.width * 0.15, this.height * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // 装甲细节
        ctx.strokeStyle = gameState.powerUpActive ? '#ffffff' : '#99ccff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.1, -this.height * 0.3);
        ctx.lineTo(-this.width * 0.1, this.height * 0.3);
        ctx.moveTo(this.width * 0.1, -this.height * 0.3);
        ctx.lineTo(this.width * 0.1, this.height * 0.3);
        ctx.stroke();

        // 发动机喷射
        this.engineFlame = (this.engineFlame + 1) % 12;
        const flameHeight = 20 + this.engineFlame + Math.random() * 5;
        
        // 左发动机
        this.drawEngine(-this.width * 0.2, this.height * 0.5, flameHeight);
        // 右发动机
        this.drawEngine(this.width * 0.2, this.height * 0.5, flameHeight);

        ctx.restore();

        if (gameState.powerUpActive) {
            ctx.restore();
        }

        // 绘制生命值指示器
        this.drawHealthIndicator();

        // 如果有护盾，绘制护盾效果
        if (gameState.hasShield) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y + this.height/2, this.width * 0.8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(68, 68, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // 护盾能量波动效果
            ctx.beginPath();
            ctx.arc(this.x, this.y + this.height/2, 
                this.width * 0.8 + Math.sin(Date.now() / 200) * 5, 
                0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(68, 68, 255, 0.2)';
            ctx.stroke();
            ctx.restore();
        }
    }

    drawEngine(x, y, flameHeight) {
        // 发动机外壳
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.ellipse(x, y, this.width * 0.1, this.height * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();

        // 发动机火焰
        const flameGradient = ctx.createLinearGradient(x, y, x, y + flameHeight);
        flameGradient.addColorStop(0, '#ff4444');
        flameGradient.addColorStop(0.3, '#ff8844');
        flameGradient.addColorStop(0.6, '#ffff44');
        flameGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.moveTo(x - this.width * 0.08, y);
        ctx.quadraticCurveTo(
            x, y + flameHeight * 0.8,
            x, y + flameHeight
        );
        ctx.quadraticCurveTo(
            x, y + flameHeight * 0.8,
            x + this.width * 0.08, y
        );
        ctx.closePath();
        ctx.fill();
    }

    drawHealthIndicator() {
        const heartSpacing = 35;  // 心形间距
        const heartSize = 25;     // 心形大小
        
        for (let i = 0; i < gameState.lives; i++) {
            const heartX = 30 + i * heartSpacing;
            const heartY = 80;    // 调整Y坐标，使其紧贴在得分和关卡信息下方
            
            // 心形渐变
            const heartGradient = ctx.createRadialGradient(
                heartX, heartY,
                0,
                heartX, heartY,
                heartSize/2
            );
            heartGradient.addColorStop(0, '#ff8888');
            heartGradient.addColorStop(0.5, '#ff4444');
            heartGradient.addColorStop(1, '#ff0000');
            
            ctx.fillStyle = heartGradient;
            ctx.beginPath();
            ctx.moveTo(heartX, heartY + heartSize/4);
            
            // 绘制心形
            ctx.bezierCurveTo(
                heartX - heartSize/2, heartY,
                heartX - heartSize/2, heartY - heartSize/2,
                heartX, heartY - heartSize/2
            );
            ctx.bezierCurveTo(
                heartX + heartSize/2, heartY - heartSize/2,
                heartX + heartSize/2, heartY,
                heartX, heartY + heartSize/4
            );
            ctx.fill();

            // 添加光晕效果
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    update() {
        // 更新无敌状态
        if (this.isInvincible) {
            this.invincibleTimer++;
            this.blinkInterval = (this.blinkInterval + 1) % 10;
            
            if (this.invincibleTimer >= 120) { // 2秒无敌时间(60fps)
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }
        // 调整边界检测以适应新的竖屏尺寸
        if (keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if (keys['ArrowDown'] && this.y < canvas.height - this.height) this.y += this.speed;
        if (keys['ArrowLeft'] && this.x > this.width / 2) this.x -= this.speed;
        if (keys['ArrowRight'] && this.x < canvas.width - this.width / 2) this.x += this.speed;
    }

    shoot() {
        const now = Date.now();
        
        if (gameState.weaponLevel <= 5) {
            // 普通子弹逻辑
            if (now - this.lastNormalShot >= this.normalShootingSpeed) {
                this.lastNormalShot = now;
                this.createNormalBullets();
            }
        } else {
            // 同时发射普通子弹和导弹
            if (now - this.lastNormalShot >= this.normalShootingSpeed) {
                this.lastNormalShot = now;
                this.createNormalBullets();
            }
            if (now - this.lastMissileShot >= this.missileShootingSpeed) {
                this.lastMissileShot = now;
                this.createMissiles();
            }
        }
    }

    createNormalBullets() {
        const bulletSpread = 10; // 子弹间距
        const bulletCount = gameState.weaponLevel;
        const totalWidth = (bulletCount - 1) * bulletSpread;
        const startX = this.x - totalWidth / 2;

        for (let i = 0; i < bulletCount; i++) {
            bullets.push(new Bullet(startX + i * bulletSpread, this.y));
            // 为每颗子弹播放独立的射击音效
            AudioController.playOneShot(shootSound);
        }
    }

    createMissiles() {
        const bulletSpread = 10; // 子弹间距
        const missileSpread = 20; // 导弹间距
        const missileCount = gameState.weaponLevel - 5;
        const bulletCount = 3; // 固定3颗普通子弹

        // 发射普通子弹
        const bulletTotalWidth = (bulletCount - 1) * bulletSpread;
        const bulletStartX = this.x - bulletTotalWidth / 2;
        for (let i = 0; i < bulletCount; i++) {
            bullets.push(new Bullet(bulletStartX + i * bulletSpread, this.y));
            // 为每颗普通子弹播放独立的射击音效
            AudioController.playOneShot(shootSound);
        }

        // 发射导弹
        const missileTotalWidth = (missileCount - 1) * missileSpread;
        const missileStartX = this.x - missileTotalWidth / 2;
        for (let i = 0; i < missileCount; i++) {
            // 找到最近的敌人作为目标
            let nearestEnemy = null;
            let minDistance = Infinity;
            enemies.forEach(enemy => {
                const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemy;
                }
            });
            bullets.push(new Bullet(missileStartX + i * missileSpread, this.y, 'missile', nearestEnemy));
            // 为每枚导弹播放独立的发射音效
            AudioController.playOneShot(missileSound);
        }
    }
}

const player = new Player(canvas.width / 2 - 25, canvas.height - 100);

class Bullet {
    constructor(x, y, type = 'normal', targetEnemy = null) {
        this.x = x - 2.5;
        this.y = y;
        this.type = type;
        this.targetEnemy = targetEnemy;
        this.rotationAngle = 0;
        this.initialX = x; // 记录初始位置用于绘制弧线
        this.initialY = y;
        this.arcProgress = 0; // 弧线进度
        
        if (type === 'normal') {
            this.width = 5;
            this.height = 10;
            this.speed = 7;
            this.damage = 1;
        } else if (type === 'missile') {
            this.width = 20;
            this.height = 40;
            this.speed = 5;
            this.damage = 5; // 导弹伤害为普通子弹的10倍
            this.turnSpeed = 0.1;
            this.lifetime = 0;
            this.maxLifetime = 200;
        }
    }

    draw() {
        // 无敌状态下闪烁效果
        if (this.isInvincible && this.blinkInterval < 5) {
            return;
        }
        ctx.save();
        if (this.type === 'normal') {
            // 普通子弹
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(1, '#ff8800');
            
            // 新的子弹形状 - 前端尖形，后端平形
            ctx.fillStyle = gradient;
            
            // 绘制子弹主体
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height); // 左下角(底部)
            ctx.lineTo(this.x + this.width, this.y + this.height); // 右下角(底部)
            ctx.lineTo(this.x + this.width/2, this.y); // 顶部中心点(尖端)
            ctx.closePath();
            ctx.fill();
            
            // 子弹尾焰 - 在底部(平的一端)添加
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height);
            ctx.lineTo(this.x + this.width/2, this.y + this.height + 5);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.fillStyle = '#ff4400';
            ctx.fill();
        } else if (this.type === 'missile') {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(this.rotationAngle);

            // 导弹主体 - 更改为蓝色系配色方案
            const bodyGradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
            bodyGradient.addColorStop(0, '#0066cc'); // 深蓝色
            bodyGradient.addColorStop(0.5, '#4488dd'); // 中蓝色
            bodyGradient.addColorStop(1, '#0044aa'); // 深蓝色
            
            // 导弹头部
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2);
            ctx.lineTo(this.width/4, -this.height/4);
            ctx.lineTo(this.width/4, this.height/4);
            ctx.lineTo(0, this.height/2);
            ctx.lineTo(-this.width/4, this.height/4);
            ctx.lineTo(-this.width/4, -this.height/4);
            ctx.closePath();
            ctx.fillStyle = bodyGradient;
            ctx.fill();
            
            // 导弹翼
            ctx.beginPath();
            ctx.moveTo(0, -this.height/4);
            ctx.lineTo(this.width/2, 0);
            ctx.lineTo(0, this.height/4);
            ctx.moveTo(0, -this.height/4);
            ctx.lineTo(-this.width/2, 0);
            ctx.lineTo(0, this.height/4);
            ctx.fillStyle = '#0055bb'; // 更深的蓝色
            ctx.fill();

            // 导弹尾焰 - 保持炙热的橙红色调
            const flameHeight = 20 + Math.random() * 5;
            const flameGradient = ctx.createLinearGradient(0, this.height/2, 0, this.height/2 + flameHeight);
            flameGradient.addColorStop(0, '#ff4400'); // 深橙色
            flameGradient.addColorStop(0.5, '#ff8800'); // 中橙色
            flameGradient.addColorStop(1, 'rgba(255, 255, 0, 0)'); // 淡黄色渐变至透明
            
            ctx.fillStyle = flameGradient;
            ctx.beginPath();
            ctx.moveTo(-this.width/4, this.height/2);
            ctx.lineTo(0, this.height/2 + flameHeight);
            ctx.lineTo(this.width/4, this.height/2);
            ctx.closePath();
            ctx.fill();

            // 添加导弹光晕效果 - 蓝色光晕
            ctx.shadowColor = '#66aaff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(50, 150, 255, 0.2)'; // 半透明的蓝色光晕
            ctx.fill();
        }
        ctx.restore();
    }

    update() {
        // 更新无敌状态
        if (this.isInvincible) {
            this.invincibleTimer++;
            this.blinkInterval = (this.blinkInterval + 1) % 10;
            
            if (this.invincibleTimer >= 120) { // 2秒无敌时间(60fps)
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }
        if (this.type === 'normal') {
            this.y -= this.speed;
        } else if (this.type === 'missile') {
            this.lifetime++;
            
            if (!this.targetEnemy || this.targetEnemy.health <= 0) {
                // 没有目标时，按照正常子弹的轨迹运行（直线向上）
                this.y -= this.speed;
                this.rotationAngle = -Math.PI/2; // 保持向上的方向（竖直方向）
            } else {
                // 正常追踪目标
                const dx = this.targetEnemy.x - this.x;
                const dy = this.targetEnemy.y - this.y;
                const angle = Math.atan2(dy, dx);
                this.rotationAngle = angle + Math.PI/2;
                
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }
        }
    }
}

class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'boss' ? 200 : 50;  // BOSS尺寸翻倍
        this.height = type === 'boss' ? 200 : 50; // BOSS尺寸翻倍
        
        // 从静态属性或原型属性获取生命值，如果不存在则使用默认值
        if (type === 'boss') {
            this.health = Enemy.prototype.bossBaseHealth || 100; // BOSS的初始生命值
            this.maxHealth = Enemy.prototype.bossBaseHealth || 100;
        } else {
            this.health = Enemy.prototype.baseHealth || 1; // 普通敌人的初始生命值
            this.maxHealth = Enemy.prototype.baseHealth || 1;
        }
        
        this.speed = this.getSpeed();
        this.points = this.getPoints();
        this.engineFlame = 0;
        
        // BOSS特有属性
        if (type === 'boss') {
            this.state = BOSS_STATES.ENTER;
            this.targetY = canvas.height / 5; // 固定在屏幕上方1/5位置
            this.moveDirection = 1;
            this.attackTimer = 0;
            this.attackInterval = 120;
            this.currentAttack = 0;
            this.bulletPattern = 0;
        }
    }

    getSpeed() {
        switch(this.type) {
            case 'fast': return 4 * enemySpeedFactor;
            case 'boss': return 1 * enemySpeedFactor;
            default: return 2 * enemySpeedFactor;
        }
    }

    getPoints() {
        switch(this.type) {
            case 'fast': return 20;
            case 'boss': return 50;
            default: return 10;
        }
    }

    draw() {
        // 无敌状态下闪烁效果
        if (this.isInvincible && this.blinkInterval < 5) {
            return;
        }
        
        if (this.type === 'boss') {
            this.drawBoss();
            // 绘制BOSS血条
            this.drawBossHealthBar();
        } else {
            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            this.drawNormalEnemy();
            ctx.restore();
        }
    }

    drawBoss() {
        ctx.save();
        // 将坐标系统转换到BOSS的中心位置
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        // Boss主体 - 六边形装甲
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 3);
            
            // 装甲板渐变
            const armorGradient = ctx.createLinearGradient(
                -this.width/2, 0,
                this.width/2, 0
            );
            armorGradient.addColorStop(0, '#880088');
            armorGradient.addColorStop(0.5, '#ff44ff');
            armorGradient.addColorStop(1, '#880088');
            
            ctx.fillStyle = armorGradient;
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2);
            ctx.lineTo(this.width/3, 0);
            ctx.lineTo(0, this.height/2);
            ctx.lineTo(-this.width/3, 0);
            ctx.closePath();
            ctx.fill();

            // 装甲纹理
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-this.width/4, -this.height/4);
            ctx.lineTo(this.width/4, -this.height/4);
            ctx.moveTo(-this.width/4, this.height/4);
            ctx.lineTo(this.width/4, this.height/4);
            ctx.stroke();
            ctx.restore();
        }

        // 能量核心
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/3);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.3, '#ff88ff');
        coreGradient.addColorStop(0.6, '#ff44ff');
        coreGradient.addColorStop(1, '#880088');
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.width/3, 0, Math.PI * 2);
        ctx.fill();

        // 能量波动效果
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, this.width/3 + Math.sin(Date.now() / 100) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Boss发动机效果
        this.drawBossEngines();
        
        ctx.restore();
    }

    drawNormalEnemy() {
        const isfast = this.type === 'fast';
        const mainColor = isfast ? '#ff8800' : '#ff4444';
        const secondaryColor = isfast ? '#ffaa00' : '#ff6666';

        // 机身渐变
        const bodyGradient = ctx.createLinearGradient(
            0, -this.height/2,
            0, this.height/2
        );
        bodyGradient.addColorStop(0, mainColor);
        bodyGradient.addColorStop(1, secondaryColor);

        // 主体
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2);
        ctx.bezierCurveTo(
            this.width * 0.3, -this.height * 0.3,
            this.width * 0.3, this.height * 0.3,
            0, this.height/2
        );
        ctx.bezierCurveTo(
            -this.width * 0.3, this.height * 0.3,
            -this.width * 0.3, -this.height * 0.3,
            0, -this.height/2
        );
        ctx.fill();

        // 机翼
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.6, this.height * 0.1);
        ctx.lineTo(this.width * 0.6, this.height * 0.1);
        ctx.lineTo(this.width * 0.3, -this.height * 0.2);
        ctx.lineTo(-this.width * 0.3, -this.height * 0.2);
        ctx.closePath();
        ctx.fill();

        // 装甲细节
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.2, -this.height * 0.3);
        ctx.lineTo(-this.width * 0.2, this.height * 0.3);
        ctx.moveTo(this.width * 0.2, -this.height * 0.3);
        ctx.lineTo(this.width * 0.2, this.height * 0.3);
        ctx.stroke();

        // 驾驶舱
        const cockpitGradient = ctx.createLinearGradient(
            0, -this.height * 0.2,
            0, 0
        );
        cockpitGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        cockpitGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.ellipse(0, -this.height * 0.1, this.width * 0.15, this.height * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 发动机效果
        this.drawEnemyEngines();
    }

    drawBossHealthBar() {
        const barWidth = 200;
        const barHeight = 20;
        const x = this.x + (this.width - barWidth) / 2;
        const y = this.y - 60; // 将血条上移

        // 血条背景
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // 当前血量
        const healthPercentage = this.health / this.maxHealth;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, barWidth * healthPercentage, barHeight);

        // 血条边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // 显示血量数值
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.health}/${this.maxHealth}`, x + barWidth/2, y + barHeight/2 + 5);
    }

    drawBossEngines() {
        const enginePositions = [
            {x: -this.width * 0.4, y: 0},
            {x: this.width * 0.4, y: 0},
            {x: 0, y: -this.height * 0.4},
            {x: 0, y: this.height * 0.4}
        ];

        enginePositions.forEach(pos => {
            // 发动机外壳
            ctx.fillStyle = '#660066';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.width * 0.1, 0, Math.PI * 2);
            ctx.fill();

            // 发动机光芒
            const engineGlow = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, this.width * 0.15
            );
            engineGlow.addColorStop(0, '#ff88ff');
            engineGlow.addColorStop(1, 'rgba(255, 136, 255, 0)');
            
            ctx.fillStyle = engineGlow;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.width * 0.15, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawEnemyEngines() {
        this.engineFlame = (this.engineFlame + 1) % 12;
        const flameHeight = 15 + this.engineFlame + Math.random() * 5;

        [-this.width * 0.2, this.width * 0.2].forEach(x => {
            // 发动机外壳
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.arc(x, this.height * 0.4, this.width * 0.08, 0, Math.PI * 2);
            ctx.fill();

            // 发动机火焰
            const flameGradient = ctx.createLinearGradient(
                x, this.height * 0.4,
                x, this.height * 0.4 + flameHeight
            );
            flameGradient.addColorStop(0, '#ff8844');
            flameGradient.addColorStop(0.5, '#ffaa44');
            flameGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            
            ctx.fillStyle = flameGradient;
            ctx.beginPath();
            ctx.moveTo(x - this.width * 0.06, this.height * 0.4);
            ctx.quadraticCurveTo(
                x, this.height * 0.4 + flameHeight * 0.8,
                x, this.height * 0.4 + flameHeight
            );
            ctx.quadraticCurveTo(
                x, this.height * 0.4 + flameHeight * 0.8,
                x + this.width * 0.06, this.height * 0.4
            );
            ctx.closePath();
            ctx.fill();
        });
    }

    update() {
        // 更新无敌状态
        if (this.isInvincible) {
            this.invincibleTimer++;
            this.blinkInterval = (this.blinkInterval + 1) % 10;
            
            if (this.invincibleTimer >= 120) { // 2秒无敌时间(60fps)
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }
        if (this.type === 'boss') {
            this.updateBoss();
        } else {
            this.y += this.speed;
        }
    }

    updateBoss() {
        // 确保目标位置始终是屏幕上方1/5
        this.targetY = canvas.height / 5;
        
        switch (this.state) {
            case BOSS_STATES.ENTER:
                // 入场动画
                if (this.y < this.targetY) {
                    this.y += this.speed * 2; // 加快入场速度
                } else {
                    this.y = this.targetY; // 确保精确到达目标位置
                    this.state = BOSS_STATES.IDLE;
                }
                break;

            case BOSS_STATES.IDLE:
                // 在上方区域左右移动
                this.x += this.speed * this.moveDirection;
                
                // 确保BOSS不会超出屏幕边界
                if (this.x <= 0) {
                    this.x = 0;
                    this.moveDirection = 1;
                } else if (this.x >= canvas.width - this.width) {
                    this.x = canvas.width - this.width;
                    this.moveDirection = -1;
                }
                
                // 确保BOSS始终保持在目标Y位置
                this.y = this.targetY;
                
                // 攻击计时
                this.attackTimer++;
                if (this.attackTimer >= this.attackInterval) {
                    this.attackTimer = 0;
                    this.currentAttack = (this.currentAttack + 1) % 3;
                    this.state = `attack${this.currentAttack + 1}`;
                    this.bulletPattern = (this.bulletPattern + 1) % 3;
                }
                break;

            case BOSS_STATES.ATTACK1:
            case BOSS_STATES.ATTACK2:
            case BOSS_STATES.ATTACK3:
                // 在攻击状态下仍然保持在固定Y位置
                this.y = this.targetY;
                
                // 执行攻击
                if (this.state === BOSS_STATES.ATTACK1) {
                    this.fireBulletPattern1();
                } else if (this.state === BOSS_STATES.ATTACK2) {
                    this.fireBulletPattern2();
                } else if (this.state === BOSS_STATES.ATTACK3) {
                    this.fireBulletPattern3();
                }
                
                // 攻击完毕后回到IDLE状态
                this.state = BOSS_STATES.IDLE;
                break;
        }
    }

    fireBulletPattern1() {
        // 圆形弹幕
        const bulletCount = 12;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i / bulletCount) * Math.PI * 2;
            const bullet = new EnemyBullet(
                this.x + this.width/2,
                this.y + this.height/2,
                Math.cos(angle) * 4,
                Math.sin(angle) * 4,
                'circle'
            );
            enemyBullets.push(bullet);
        }
    }

    fireBulletPattern2() {
        // 追踪导弹
        const bulletCount = 3;
        for (let i = 0; i < bulletCount; i++) {
            const bullet = new EnemyBullet(
                this.x + this.width/2 - 10 + i * 20,
                this.y + this.height,
                0,
                3,
                'tracking'
            );
            enemyBullets.push(bullet);
        }
    }

    fireBulletPattern3() {
        // 散射攻击
        const bulletCount = 5;
        const spreadAngle = Math.PI / 4; // 45度散射角
        for (let i = 0; i < bulletCount; i++) {
            const angle = -spreadAngle/2 + (spreadAngle / (bulletCount-1)) * i + Math.PI/2;
            const bullet = new EnemyBullet(
                this.x + this.width/2,
                this.y + this.height/2,
                Math.cos(angle) * 5,
                Math.sin(angle) * 5,
                'spread'
            );
            enemyBullets.push(bullet);
        }
    }
}

class EnemyBullet {
    constructor(x, y, speedX, speedY, type) {
        this.x = x;
        this.y = y;
        this.speedX = speedX;
        this.speedY = speedY;
        this.type = type;
        this.width = 10;
        this.height = 10;
        this.damage = 1;
        this.lifetime = 0;
    }

    draw() {
        // 无敌状态下闪烁效果
        if (this.isInvincible && this.blinkInterval < 5) {
            return;
        }
        ctx.save();
        ctx.translate(this.x, this.y);

        switch(this.type) {
            case 'circle':
                // 圆形子弹
                const circleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
                circleGradient.addColorStop(0, '#ff88ff');
                circleGradient.addColorStop(1, '#ff00ff');
                ctx.fillStyle = circleGradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'tracking':
                // 追踪导弹
                ctx.fillStyle = '#ff0066';
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.lineTo(this.width/2, this.height/2);
                ctx.lineTo(-this.width/2, this.height/2);
                ctx.closePath();
                ctx.fill();
                break;

            case 'spread':
                // 散射子弹
                const spreadGradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
                spreadGradient.addColorStop(0, '#ff00ff');
                spreadGradient.addColorStop(1, '#880088');
                ctx.fillStyle = spreadGradient;
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                break;
        }

        ctx.restore();
    }

    update() {
        // 更新无敌状态
        if (this.isInvincible) {
            this.invincibleTimer++;
            this.blinkInterval = (this.blinkInterval + 1) % 10;
            
            if (this.invincibleTimer >= 120) { // 2秒无敌时间(60fps)
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }
        this.lifetime++;
        
        if (this.type === 'tracking' && this.lifetime < 120) {
            // 追踪玩家
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const angle = Math.atan2(dy, dx);
            this.speedX += Math.cos(angle) * 0.1;
            this.speedY += Math.sin(angle) * 0.1;
            
            // 限制最大速度
            const speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
            if (speed > 5) {
                this.speedX = (this.speedX / speed) * 5;
                this.speedY = (this.speedY / speed) * 5;
            }
        }

        this.x += this.speedX;
        this.y += this.speedY;
    }
}

let bullets = [];
let enemies = [];
let powerUps = [];
let enemyBullets = [];

// 添加物资包生成逻辑
function spawnPowerUp(x, y) {
    // 设置各种资源包的出现概率：武器升级包(30%)、护盾(10%)、血包(10%)
    const random = Math.random();
    let type;
    
    if (random < 0.3) { // 30% 概率为武器升级包
        type = 'weapon';
    } else if (random < 0.4) { // 10% 概率为护盾
        type = 'shield';
    } else if (random < 0.5) { // 10% 概率为血包
        type = 'health';
    } else { // 50% 概率不生成任何物品
        return; // 如果没有物品生成，则直接返回
    }
    
    powerUps.push(new PowerUp(x, y, type));
}

// 添加物资包与玩家的碰撞检测函数
function checkCollisionWithPlayer(powerUp) {
    return (
        player.x - player.width/2 < powerUp.x + powerUp.width &&
        player.x + player.width/2 > powerUp.x &&
        player.y < powerUp.y + powerUp.height &&
        player.y + player.height > powerUp.y
    );
}

// 修改敌人死亡时的逻辑
function handleEnemyDeath(enemy) {
    // 计算得分
    gameState.score += enemy.points;
    
    // 生成物资包的总体概率
    if (enemy.type !== 'boss' && Math.random() < 0.3) { // 30%的概率触发物资包生成
        spawnPowerUp(enemy.x + enemy.width/2, enemy.y);
    }

    // 如果是BOSS，确保生成多个物资包并进入下一关
    if (enemy.type === 'boss') {
        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 100;
            // 直接创建物资包，不进行概率判断
            // 为BOSS掉落创建特殊的生成函数，保证一定会生成物品
            spawnBossPowerUp(enemy.x + enemy.width/2 + offsetX, enemy.y);
        }
        gameState.bossSpawned = false; // 重置BOSS状态
        gameState.currentBoss = null;  // 确保清除当前BOSS引用
        
        // 调用startNextLevel函数进入下一关
        startNextLevel();
    }

    // 播放爆炸音效
    AudioController.playWithDebounce(hitSound, 100);
}

// 添加BOSS物资包生成逻辑，确保100%生成物品
function spawnBossPowerUp(x, y) {
    // 设置BOSS掉落的物资包类型概率：武器升级包(50%)、护盾(25%)、血包(25%)
    const random = Math.random();
    let type;
    
    if (random < 0.5) { // 50% 概率为武器升级包
        type = 'weapon';
    } else if (random < 0.75) { // 25% 概率为护盾
        type = 'shield';
    } else { // 25% 概率为血包
        type = 'health';
    }
    
    powerUps.push(new PowerUp(x, y, type));
}

// 添加背景绘制函数
function drawBackground() {
    // 创建深色渐变背景
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#0a0a2a');
    bgGradient.addColorStop(1, '#1a1a4a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 更新和绘制星星
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        
        // 添加星星闪烁效果
        const twinkle = 0.5 + Math.sin(Date.now() / 1000 + star.x) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        
        // 绘制更漂亮的星星
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 修改游戏循环函数
function gameLoop() {
    if (isPaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    // 只在背景音乐完全停止时才重新开始播放
    if (backgroundMusic.paused && !isPaused) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(e => console.error('背景音乐播放失败:', e));
    }

    // 自动射击
    player.shoot();

    // 更新和绘制玩家
    player.update();
    player.draw();

    // 更新和绘制子弹
    bullets = bullets.filter((bullet, index) => {
        bullet.update();
        bullet.draw();
        return bullet.y > 0;
    });

    // 更新和绘制敌机
    enemies = enemies.filter((enemy, index) => {
        enemy.update();
        enemy.draw();
        if (enemy.y > canvas.height) {
            if (enemy === gameState.currentBoss) {
                gameState.currentBoss = null;
            }
            return false;
        }
        return true;
    });

    // 更新和绘制物资包
    powerUps = powerUps.filter(powerUp => {
        powerUp.update();
        powerUp.draw();
        
        // 检查是否超出屏幕
        if (powerUp.y > canvas.height) {
            return false;
        }
        
        // 检查与玩家的碰撞
        if (checkCollisionWithPlayer(powerUp)) {
            powerUp.applyEffect(player);
            return false;
        }
        
        return true;
    });

    // 更新和绘制敌人子弹
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.update();
        bullet.draw();
        return bullet.x >= 0 && bullet.x <= canvas.width && 
               bullet.y >= 0 && bullet.y <= canvas.height &&
               bullet.lifetime < 300; // 限制子弹最大存活时间
    });

    // 碰撞检测
    checkCollisions();

    // 显示游戏信息
    drawGameInfo();

    // 检查是否需要进入下一关
    if (gameState.bossSpawned && !gameState.currentBoss) {
        startNextLevel();
    }

    animationId = requestAnimationFrame(gameLoop);
}

// 添加全局变量
let enemySpawnBaseInterval = 1000; // 基础敌人生成间隔（毫秒）
let enemySpawnInterval = enemySpawnBaseInterval; // 当前敌人生成间隔
let maxEnemies = 10; // 屏幕上最大敌人数量
let enemySpeedFactor = 1; // 敌人速度因子

// 修改生成敌机的逻辑
function spawnEnemies() {
    // 清除之前的定时器（如果存在）
    if (window.enemySpawnTimer) {
        clearInterval(window.enemySpawnTimer);
    }
    
    // 创建新的定时器
    window.enemySpawnTimer = setInterval(() => {
        if (isPaused) return;
        
        // 如果敌人数量已达到最大值，不再生成
        if (enemies.length >= maxEnemies) return;

        const levelTime = (Date.now() - gameState.levelStartTime) / 1000 / 60;

        if (levelTime >= 0.5 && !gameState.bossSpawned) { // 修改为30秒出现（0.5分钟）
            const x = (canvas.width - 200) / 2; // 适应新的BOSS尺寸
            // 从画布上方生成BOSS
            const boss = new Enemy(x, -200, 'boss'); // 从画布上方进入
            enemies.push(boss);
            gameState.currentBoss = boss;
            gameState.bossSpawned = true;
            return;
        }

        // 如果BOSS已经生成，暂停生成普通敌人
        if (gameState.bossSpawned && gameState.currentBoss) return;

        // 生成普通敌机
        const x = Math.random() * (canvas.width - 50);
        const random = Math.random();
        
        // 根据游戏难度调整快速敌机的生成概率
        const fastEnemyChance = 0.2 + (gameState.level - 1) * 0.05; // 每关增加5%的快速敌机概率
        
        if (random < fastEnemyChance) {
            enemies.push(new Enemy(x, -50, 'fast'));
        } else {
            enemies.push(new Enemy(x, -50, 'normal'));
        }
    }, enemySpawnInterval); // 使用动态间隔时间
}

// 修改碰撞检测函数
function checkCollisions() {
    // 子弹与敌机的碰撞检测
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                enemy.health -= bullet.damage || 1; // 确保有伤害值
                bullets.splice(bulletIndex, 1);
                
                if (enemy.health <= 0) {
                    enemies.splice(enemyIndex, 1);
                    handleEnemyDeath(enemy);
                }
            }
        });
    });

    // 敌机与玩家的碰撞检测
    if (!player.isInvincible) { // 仅在非无敌状态下检测碰撞
        enemies.forEach((enemy, index) => {
            if (
                player.x - player.width/2 < enemy.x + enemy.width &&
                player.x + player.width/2 > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
                // 根据敌人类型处理不同的碰撞逻辑
                if (enemy.type === 'boss') {
                    // BOSS碰撞：扣除BOSS 50点血量，不移除BOSS
                    enemy.health -= 50;
                    
                    // 如果BOSS血量为0或以下，才移除
                    if (enemy.health <= 0) {
                        enemies.splice(index, 1);
                        handleEnemyDeath(enemy);
                    }
                } else {
                    // 普通敌人碰撞：直接移除敌人
                    enemies.splice(index, 1);
                }
                
                // 处理玩家受伤逻辑
                if (gameState.hasShield) {
                    AudioController.playWithDebounce(powerUpSound, 100);
                    gameState.hasShield = false;
                } else {
                    AudioController.playWithDebounce(playerHitSound, 100);
                    gameState.lives--;
                    player.isInvincible = true; // 设置无敌状态
                    player.invincibleTimer = 0; // 重置无敌计时器

                    if (gameState.lives <= 0) {
                        gameOver();
                    }
                }
            }
        });
    }

    // 敌人子弹与玩家的碰撞检测
    if (!player.isInvincible) { // 仅在非无敌状态下检测碰撞
        enemyBullets.forEach((bullet, index) => {
            if (
                player.x - player.width/2 < bullet.x + bullet.width/2 &&
                player.x + player.width/2 > bullet.x - bullet.width/2 &&
                player.y < bullet.y + bullet.height/2 &&
                player.y + player.height > bullet.y - bullet.height/2
            ) {
                enemyBullets.splice(index, 1);
                
                if (gameState.hasShield) {
                    AudioController.playWithDebounce(powerUpSound, 100);
                    gameState.hasShield = false;
                } else {
                    AudioController.playWithDebounce(playerHitSound, 100);
                    gameState.lives--;
                    player.isInvincible = true; // 设置无敌状态
                    player.invincibleTimer = 0; // 重置无敌计时器

                    if (gameState.lives <= 0) {
                        gameOver();
                    }
                }
            }
        });
    }
}

let isPaused = false; // 暂停状态标志
const pauseButton = document.getElementById('pauseButton');

let animationId = null; // 新增变量用于存储动画帧ID

function togglePause() {
    if (isPaused) {
        // 恢复游戏
        isPaused = false;
        pauseButton.innerText = '暂停';
        AudioController.fadeIn(backgroundMusic);
        gameLoop();
    } else {
        // 暂停游戏
        isPaused = true;
        pauseButton.innerText = '继续';
        
        // 淡出背景音乐并停止其他音效
        AudioController.fadeOut(backgroundMusic);
        [shootSound, hitSound, powerUpSound, playerHitSound, bossDeathSound].forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        cancelAnimationFrame(animationId);
        
        // 显示暂停界面
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '20px Arial';
        ctx.fillText(`当前得分: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.font = '16px Arial';
        ctx.fillText('按 ESC 键或点击继续按钮恢复游戏', canvas.width / 2, canvas.height / 2 + 40);
    }
}

// 修改暂停按钮事件监听器
pauseButton.addEventListener('click', togglePause);

// 优化音频事件监听
[backgroundMusic, shootSound, hitSound, powerUpSound, playerHitSound, bossDeathSound].forEach(audio => {
    // 添加错误处理
    audio.addEventListener('error', (e) => {
        console.error('音频加载错误:', e);
    });
    
    // 确保音频在暂停时立即停止
    audio.addEventListener('play', () => {
        if (isPaused) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
});

// 启动生成敌机
spawnEnemies();

// 初始化游戏时的音频控制
backgroundMusic.volume = 0;
backgroundMusic.play().catch(() => {
    console.log('等待用户交互后播放背景音乐');
});

gameLoop();

// 修改游戏信息显示
function drawGameInfo() {
    // 绘制半透明的信息背景面板
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(10, 10, 180, 100);  // 增加高度以容纳生命值指示器

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    
    // 在同一行显示得分和关卡信息
    ctx.fillText(`得分: ${gameState.score}  关卡: ${gameState.level}`, 20, 45);
    
    // 如果BOSS已生成，显示"BOSS战"标志
    if (gameState.bossSpawned && gameState.currentBoss) {
        const bossTextGradient = ctx.createLinearGradient(
            canvas.width/2 - 100, 80,
            canvas.width/2 + 100, 80
        );
        bossTextGradient.addColorStop(0, '#ff0000');
        bossTextGradient.addColorStop(0.5, '#ff6666');
        bossTextGradient.addColorStop(1, '#ff0000');

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = bossTextGradient;
        ctx.textAlign = 'center';
        ctx.fillText('BOSS战', canvas.width/2, 85);

        // 添加发光效果
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.fillText('BOSS战', canvas.width/2, 85);
        ctx.shadowBlur = 0;
    }
}

// 修改暂停按钮样式
function createPauseButton() {
    const pauseButton = document.getElementById('pauseButton');
    if (!pauseButton) return;

    pauseButton.style.position = 'absolute'; // 改回absolute定位
    pauseButton.style.right = '20px'; // 右对齐
    pauseButton.style.top = '20px';
    pauseButton.style.transform = 'none'; // 移除居中偏移
    pauseButton.style.padding = '8px 20px';
    pauseButton.style.fontSize = '16px';
    pauseButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    pauseButton.style.color = 'white';
    pauseButton.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    pauseButton.style.borderRadius = '20px';
    pauseButton.style.cursor = 'pointer';
    pauseButton.style.transition = 'all 0.3s ease';
    pauseButton.style.outline = 'none';
    pauseButton.style.zIndex = '1000';
    pauseButton.style.fontFamily = 'Arial, sans-serif';
    pauseButton.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    pauseButton.style.backdropFilter = 'blur(5px)';
    pauseButton.style.webkitBackdropFilter = 'blur(5px)';
    pauseButton.style.width = '80px'; // 固定宽度
    pauseButton.style.textAlign = 'center'; // 文字居中

    // 修改悬停效果
    pauseButton.onmouseover = () => {
        pauseButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        pauseButton.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        pauseButton.style.transform = 'scale(1.05)';
    };
    pauseButton.onmouseout = () => {
        pauseButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        pauseButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        pauseButton.style.transform = 'scale(1)';
    };
}

// 在游戏初始化时调用
createPauseButton();

// 添加进入下一关的函数
function startNextLevel() {
    gameState.level++;
    gameState.bossSpawned = false;
    gameState.levelStartTime = Date.now();
    gameState.currentBoss = null;
    
    // 增加难度
    increaseGameDifficulty();
    
    // 重新设置敌人生成计时器
    spawnEnemies();
    
    // 显示过关信息
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#44ff44';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${gameState.level - 1} 关完成！`, canvas.width/2, canvas.height/2 - 40);
    ctx.font = '24px Arial';
    ctx.fillText(`准备进入第 ${gameState.level} 关`, canvas.width/2, canvas.height/2 + 20);
}

// 添加增加游戏难度的函数
function increaseGameDifficulty() {
    const difficultyFactor = 1 + (0.2 * (gameState.level - 1)); // 每级难度增加20%
    
    // 设置敌人基础生命值
    Enemy.prototype.baseHealth = Math.ceil(1 * difficultyFactor);
    Enemy.prototype.bossBaseHealth = Math.ceil(1000 * difficultyFactor);
    
    // 减少敌人生成间隔（更快地生成敌人）
    enemySpawnInterval = Math.max(30, Math.floor(enemySpawnBaseInterval / difficultyFactor));
    
    // 增加敌人最大数量
    maxEnemies = Math.min(15, Math.floor(10 * difficultyFactor));
    
    // 增加敌人速度
    enemySpeedFactor = 1 + (0.15 * (gameState.level - 1)); // 每级敌人速度增加15%
    
    console.log(`难度已增加到级别${gameState.level}：敌人生命=${Enemy.prototype.baseHealth}，BOSS生命=${Enemy.prototype.bossBaseHealth}，生成间隔=${enemySpawnInterval}，最大敌人数=${maxEnemies}`);
}

// 添加武器升级特效
function showWeaponUpgradeEffect() {
    const text = `武器等级 ${gameState.weaponLevel}`;
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    
    // 创建渐变文字
    const gradient = ctx.createLinearGradient(x - 100, y, x + 100, y);
    gradient.addColorStop(0, '#44ff44');
    gradient.addColorStop(0.5, '#88ff88');
    gradient.addColorStop(1, '#44ff44');
    
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
}

// 添加PowerUp类
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.rotation = 0;
        this.glowIntensity = 0;
        this.glowDirection = 0.05;
        this.parachuteColor = this.getParachuteColor();
    }

    draw() {
        // 无敌状态下闪烁效果
        if (this.isInvincible && this.blinkInterval < 5) {
            return;
        }
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        // 不再旋转资源包
        // this.rotation += 0.02;
        // ctx.rotate(this.rotation);

        // 光晕效果
        this.glowIntensity += this.glowDirection;
        if (this.glowIntensity >= 1 || this.glowIntensity <= 0) {
            this.glowDirection *= -1;
        }
        
        ctx.shadowBlur = 15 + this.glowIntensity * 5;
        ctx.shadowColor = this.getColor();

        // 绘制降落伞和连接线
        this.drawParachute();

        // 绘制物资包
        ctx.save();
        // 创建圆形裁剪区域
        ctx.beginPath();
        ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
        ctx.clip();
        
        // 手绘物资包
        switch(this.type) {
            case 'health':
                this.drawHealthPack();
                break;
            case 'weapon':
                this.drawWeaponPack();
                break;
            case 'shield':
                this.drawShieldPack();
                break;
        }

        // 添加边框和光晕效果
        ctx.strokeStyle = this.getColor();
        ctx.lineWidth = 2;
        ctx.stroke();

        // 添加内部纹理
        this.drawPackageTexture();

        ctx.restore();
        ctx.restore();
    }

    drawHealthPack() {
        // 医疗包背景
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
        gradient.addColorStop(0, '#ffeeee');
        gradient.addColorStop(1, '#ff4444');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 十字标志
        ctx.beginPath();
        ctx.moveTo(-this.width/4, 0);
        ctx.lineTo(this.width/4, 0);
        ctx.moveTo(0, -this.width/4);
        ctx.lineTo(0, this.width/4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    drawWeaponPack() {
        // 武器包背景
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
        gradient.addColorStop(0, '#eeffee');
        gradient.addColorStop(1, '#44ff44');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 子弹图标
        ctx.beginPath();
        ctx.moveTo(-this.width/4, -this.height/4);
        ctx.lineTo(this.width/4, this.height/4);
        ctx.moveTo(this.width/4, -this.height/4);
        ctx.lineTo(-this.width/4, this.height/4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 中心点
        ctx.beginPath();
        ctx.arc(0, 0, this.width/8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    drawShieldPack() {
        // 护盾包背景
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
        gradient.addColorStop(0, '#eeeeff');
        gradient.addColorStop(1, '#4444ff');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 盾牌图标
        ctx.beginPath();
        ctx.moveTo(0, -this.height/3);
        ctx.lineTo(this.width/3, 0);
        ctx.lineTo(0, this.height/3);
        ctx.lineTo(-this.width/3, 0);
        ctx.closePath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    drawPackageTexture() {
        // 添加反光效果
        const highlight = ctx.createLinearGradient(
            -this.width/2, -this.height/2,
            this.width/2, this.height/2
        );
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
        
        ctx.fillStyle = highlight;
        ctx.fill();
    }

    drawParachute() {
        const parachuteHeight = this.height * 1.5;
        const parachuteWidth = this.width * 2;
        
        // 降落伞绳
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        
        // 绘制多根降落伞绳，创造立体感
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI;
            const xOffset = Math.cos(angle) * (this.width/2);
            ctx.moveTo(xOffset, 0);
            ctx.lineTo(Math.cos(angle) * parachuteWidth/2, -parachuteHeight);
        }
        ctx.stroke();
        
        // 降落伞主体
        ctx.beginPath();
        ctx.moveTo(-parachuteWidth/2, -parachuteHeight);
        ctx.quadraticCurveTo(0, -parachuteHeight - 20, parachuteWidth/2, -parachuteHeight);
        
        // 使用物资类型对应的颜色创建渐变
        const gradient = ctx.createLinearGradient(0, -parachuteHeight - 20, 0, -parachuteHeight + 10);
        gradient.addColorStop(0, this.parachuteColor);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
        
        ctx.strokeStyle = this.parachuteColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 填充降落伞
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 降落伞内部纹理
        ctx.beginPath();
        for (let i = 1; i < 6; i++) {
            const x = -parachuteWidth/2 + (parachuteWidth/6) * i;
            ctx.moveTo(x, -parachuteHeight);
            ctx.lineTo(x - 5, -parachuteHeight + 15);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    getColor() {
        switch(this.type) {
            case 'health': return '#ff4444';
            case 'weapon': return '#44ff44';
            case 'shield': return '#4444ff';
            default: return 'white';
        }
    }

    getParachuteColor() {
        switch(this.type) {
            case 'health': return 'rgba(255, 68, 68, 0.8)';
            case 'weapon': return 'rgba(68, 255, 68, 0.8)';
            case 'shield': return 'rgba(68, 68, 255, 0.8)';
            default: return 'rgba(255, 255, 255, 0.8)';
        }
    }

    update() {
        // 更新无敌状态
        if (this.isInvincible) {
            this.invincibleTimer++;
            this.blinkInterval = (this.blinkInterval + 1) % 10;
            
            if (this.invincibleTimer >= 120) { // 2秒无敌时间(60fps)
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }
        this.y += this.speed;
    }

    applyEffect(player) {
        powerUpSound.play();
        switch(this.type) {
            case 'health':
                if (gameState.lives < gameState.maxLives) {
                    gameState.lives++;
                }
                break;
            case 'weapon':
                if (gameState.weaponLevel < 8) {
                    gameState.weaponLevel++;
                    // 添加武器升级提示
                    showWeaponUpgradeEffect();
                }
                break;
            case 'shield':
                if (!gameState.hasShield) {
                    gameState.hasShield = true;
                    // 设置护盾持续时间
                    if (gameState.shieldTimer) clearTimeout(gameState.shieldTimer);
                    gameState.shieldTimer = setTimeout(() => {
                        gameState.hasShield = false;
                    }, 10000); // 10秒后护盾消失
                }
                break;
        }
    }
}

// 添加游戏结束函数
function gameOver() {
    isPaused = true;
    cancelAnimationFrame(animationId);
    
    // 停止所有音频
    AudioController.stopAll();
    
    // 绘制游戏结束界面
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 游戏结束标题
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width/2, canvas.height/2 - 60);
    
    // 显示最终得分
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${gameState.score}`, canvas.width/2, canvas.height/2);
    ctx.fillText(`达到等级: ${gameState.level}`, canvas.width/2, canvas.height/2 + 40);
    
    // 重新开始提示
    ctx.font = '20px Arial';
    ctx.fillText('按空格键重新开始', canvas.width/2, canvas.height/2 + 100);
    
    // 添加空格键重新开始的事件监听
    const restartHandler = (e) => {
        if (e.code === 'Space') {
            window.removeEventListener('keydown', restartHandler);
            resetGame();
            isPaused = false;
            gameLoop();
        }
    };
    window.addEventListener('keydown', restartHandler);
}

// 添加重置游戏函数
function resetGame() {
    // 重置游戏状态
    gameState = {
        level: 1,
        score: 0,
        lives: 3,
        maxLives: 5,
        difficulty: 1,
        powerUpActive: false,
        powerUpTimer: null,
        weaponLevel: 1,
        hasShield: false,
        shieldTimer: null,
        levelStartTime: Date.now(),
        bossSpawned: false,
        currentBoss: null
    };
    
    // 清空所有数组
    bullets = [];
    enemies = [];
    powerUps = [];
    enemyBullets = [];
    
    // 重置玩家位置
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 100;
    player.normalShootingSpeed = 350;
    player.missileShootingSpeed = 700;
    
    // 重新开始背景音乐
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(e => console.error('背景音乐播放失败:', e));
}