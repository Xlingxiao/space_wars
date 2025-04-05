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
        // Base shooting intervals (will be decreased at level 13+)
        this.baseNormalShootingSpeed = 350;
        this.baseMissileShootingSpeed = 500;
        // Current shooting intervals
        this.normalShootingSpeed = this.baseNormalShootingSpeed;
        this.missileShootingSpeed = this.baseMissileShootingSpeed;
        this.lastNormalShot = 0;
        this.lastMissileShot = 0;
        this.lastDiagonalShot = 0; // Timer for diagonal bullets
        this.speed = 5;
        this.engineFlame = 0;
        this.wingAngle = 0;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.blinkInterval = 0;
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
        if (keys['ArrowLeft'] && this.x > this.width / 2) this.x -= this.speed; // Corrected boundary check for left
        if (keys['ArrowRight'] && this.x < canvas.width - this.width / 2) this.x += this.speed; // Corrected boundary check for right
    }

    shoot() {
        const now = Date.now();
        let normalBulletCount = 0;
        let missileCount = 0;
        let diagonalBulletCountPerSide = 0;

        // Determine weapon configuration based on level
        const level = gameState.weaponLevel;
        if (level === 1) {
            normalBulletCount = 1;
        } else if (level === 2) {
            normalBulletCount = 2;
        } else if (level === 3) {
            normalBulletCount = 3;
        } else if (level === 4) {
            normalBulletCount = 4;
        } else if (level === 5) {
            normalBulletCount = 5;
        } else if (level === 6) {
            normalBulletCount = 5;
            missileCount = 1;
        } else if (level === 7) {
            normalBulletCount = 5;
            missileCount = 2;
        } else if (level === 8) {
            normalBulletCount = 5;
            missileCount = 3;
        } else if (level === 9) {
            normalBulletCount = 5;
            missileCount = 4;
        } else if (level === 10) {
            normalBulletCount = 5;
            missileCount = 4;
            diagonalBulletCountPerSide = 1;
        } else if (level === 11) {
            normalBulletCount = 5;
            missileCount = 4;
            diagonalBulletCountPerSide = 2;
        } else if (level >= 12) { // Level 12 and above
            normalBulletCount = 5;
            missileCount = 4;
            diagonalBulletCountPerSide = 3;
            // Speed increase is handled by PowerUp.applyEffect modifying player attributes
        }

        // Fire normal and diagonal bullets based on normal shooting timer
        if (now - this.lastNormalShot >= this.normalShootingSpeed) {
            this.lastNormalShot = now;
            if (normalBulletCount > 0) {
                this.createNormalBullets(normalBulletCount);
            }
            if (diagonalBulletCountPerSide > 0) {
                this.createDiagonalBullets(diagonalBulletCountPerSide);
            }
             // Play sound only once per volley
            if (normalBulletCount > 0 || diagonalBulletCountPerSide > 0) {
                 AudioController.playOneShot(shootSound);
            }
        }

        // Fire missiles based on missile shooting timer
        if (missileCount > 0 && now - this.lastMissileShot >= this.missileShootingSpeed) {
            this.lastMissileShot = now;
            this.createMissiles(missileCount);
             // Play sound for missiles
            AudioController.playOneShot(missileSound);
        }
    }

    createNormalBullets(bulletCount) {
        const bulletSpread = 15; // Increase spread slightly
        const totalWidth = (bulletCount - 1) * bulletSpread;
        const startX = this.x - totalWidth / 2;

        for (let i = 0; i < bulletCount; i++) {
            // Angle is default (-PI/2, straight up)
            bullets.push(new Bullet(startX + i * bulletSpread, this.y));
            // Sound is played once per volley in shoot()
        }
    }

    createDiagonalBullets(countPerSide) {
        const angleOffset = Math.PI / 8; // Angle for diagonal shots (adjust as needed)
        const bulletSpread = 10; // Spread for diagonal bullets

        // Left diagonal bullets
        for (let i = 0; i < countPerSide; i++) {
            const angle = -Math.PI / 2 - angleOffset; // Top-left direction
            const startX = this.x - this.width * 0.3 - i * bulletSpread; // Offset slightly left
             bullets.push(new Bullet(startX, this.y, 'normal', null, angle));
        }

        // Right diagonal bullets
        for (let i = 0; i < countPerSide; i++) {
            const angle = -Math.PI / 2 + angleOffset; // Top-right direction
            const startX = this.x + this.width * 0.3 + i * bulletSpread; // Offset slightly right
             bullets.push(new Bullet(startX, this.y, 'normal', null, angle));
        }
         // Sound is played once per volley in shoot()
    }


    createMissiles(missileCount) {
        const missileSpread = 30; // Increase spread for missiles
        const totalWidth = (missileCount - 1) * missileSpread;
        // Calculate startX to center the missiles relative to player.x
        const startX = this.x - totalWidth / 2;

        for (let i = 0; i < missileCount; i++) {
            const missileX = startX + i * missileSpread;
            // Find nearest enemy for target
            let nearestEnemy = null;
            let minDistance = Infinity;
            enemies.forEach(enemy => {
                // Ensure enemy is somewhat in front of the player to avoid targeting behind
                if (enemy.y < this.y) {
                    const distance = Math.hypot(enemy.x - missileX, enemy.y - this.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestEnemy = enemy;
                    }
                }
            });
            // Angle is determined during update based on target
            bullets.push(new Bullet(missileX, this.y, 'missile', nearestEnemy));
            // Sound is played once per volley in shoot()
        }
    }
}

const player = new Player(canvas.width / 2, canvas.height - 100); // Centered player

class Bullet {
    constructor(x, y, type = 'normal', targetEnemy = null, angle = -Math.PI / 2) { // Added angle parameter
        this.x = x - (type === 'missile' ? 10 : 2.5); // Adjust x offset based on type for centering
        this.y = y;
        this.type = type;
        this.targetEnemy = targetEnemy;
        this.angle = angle; // Store the angle
        this.rotationAngle = type === 'missile' ? -Math.PI / 2 : angle; // Initial rotation for drawing
        this.initialX = x;
        this.initialY = y;
        this.arcProgress = 0;

        if (type === 'normal') {
            this.width = 5;
            this.height = 10;
            this.speed = 7;
            this.damage = 1;
        } else if (type === 'missile') {
            this.width = 20;
            this.height = 40;
            this.speed = 5;
            this.damage = 5;
            this.turnSpeed = 0.1;
            this.lifetime = 0;
            this.maxLifetime = 200;
            // Initial rotation set above
        }
    }

    draw() {
        // 无敌状态下闪烁效果
        // if (this.isInvincible && this.blinkInterval < 5) { // Bullets don't have isInvincible
        //     return;
        // }
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2); // Translate to center for rotation
        ctx.rotate(this.rotationAngle); // Rotate based on drawing angle


        if (this.type === 'normal') {
             // Draw centered normal bullet
            const gradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2); // Centered gradient
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(1, '#ff8800');
            ctx.fillStyle = gradient;

            ctx.beginPath();
            ctx.moveTo(-this.width/2, this.height/2);  // Bottom-left
            ctx.lineTo(this.width/2, this.height/2);   // Bottom-right
            ctx.lineTo(0, -this.height/2); // Top-center
            ctx.closePath();
            ctx.fill();

            // Draw centered tail flame
            ctx.beginPath();
            ctx.moveTo(-this.width/2, this.height/2);
            ctx.lineTo(0, this.height/2 + 5); // Flame point below center
            ctx.lineTo(this.width/2, this.height/2);
            ctx.fillStyle = '#ff4400';
            ctx.fill();

        } else if (this.type === 'missile') {
             // Draw centered missile (original missile draw code assumed translation already happened)

            // 导弹主体 - 更改为蓝色系配色方案
            const bodyGradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
            bodyGradient.addColorStop(0, '#0066cc'); // 深蓝色
            bodyGradient.addColorStop(0.5, '#4488dd'); // 中蓝色
            bodyGradient.addColorStop(1, '#0044aa'); // 深蓝色

            // 导弹头部 (绘制相对于0,0)
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
            // Draw arc relative to 0,0 since we translated
            ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(50, 150, 255, 0.2)'; // 半透明的蓝色光晕
            ctx.fill();
        }
        ctx.restore();
    }


    update() {
        if (this.type === 'normal') {
            // Move based on the stored angle
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.rotationAngle = this.angle + Math.PI/2; // Keep drawing angle aligned with movement angle (add PI/2 because 0 angle is right, -PI/2 is up)
        } else if (this.type === 'missile') {
            this.lifetime++;

            // Check if target exists and is alive
            const targetIsValid = this.targetEnemy && this.targetEnemy.health > 0 && enemies.includes(this.targetEnemy);

            if (!targetIsValid || this.lifetime > this.maxLifetime / 2) { // Start going straight if target lost or half lifetime passed
                // No target or target lost, fly straight up from current direction
                const straightAngle = -Math.PI / 2;
                 // Smoothly transition angle towards straight up
                const angleDiff = straightAngle - this.angle;
                 // Normalize angle difference
                const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                this.angle += normalizedDiff * this.turnSpeed * 0.5; // Slower turn towards straight


                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.rotationAngle = this.angle + Math.PI / 2; // Update drawing rotation based on movement angle
            } else {
                // Normal tracking
                const dx = this.targetEnemy.x + this.targetEnemy.width/2 - (this.x + this.width/2); // Target center
                const dy = this.targetEnemy.y + this.targetEnemy.height/2 - (this.y + this.height/2); // Target center
                const targetAngle = Math.atan2(dy, dx);

                // Smoothly adjust missile angle towards target angle
                const angleDiff = targetAngle - this.angle;
                // Normalize the angle difference to the range [-PI, PI]
                const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                // Adjust angle, limit turn speed
                this.angle += Math.max(-this.turnSpeed, Math.min(this.turnSpeed, normalizedDiff));

                // Move missile based on its current angle
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.rotationAngle = this.angle + Math.PI / 2; // Update drawing rotation based on movement angle
            }
        }
    }
}

class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'boss' ? 200 : 50;
        this.height = type === 'boss' ? 200 : 50;

        // --- Linear Time Difficulty Calculation --- START ---
        const BOSS_SPAWN_TIME_SECONDS = 30; // Time in seconds until boss potentially spawns
        const TIME_DIFFICULTY_TARGET_FACTOR = 1.5; // Target factor increase within the level (1.5 means 50% increase)

        const levelTimeSeconds = (Date.now() - gameState.levelStartTime) / 1000;
        let timeDifficultyFactor;
        if (levelTimeSeconds <= BOSS_SPAWN_TIME_SECONDS) {
            // Linear increase from 1.0 up to TIME_DIFFICULTY_TARGET_FACTOR over BOSS_SPAWN_TIME_SECONDS
            timeDifficultyFactor = 1 + ((TIME_DIFFICULTY_TARGET_FACTOR - 1) * levelTimeSeconds / BOSS_SPAWN_TIME_SECONDS);
        } else {
            // After boss spawn time, cap at the target factor
            timeDifficultyFactor = TIME_DIFFICULTY_TARGET_FACTOR;
        }
        // --- Linear Time Difficulty Calculation --- END ---

        // 计算最终难度因子 = 关卡基础难度 * 时间难度
        const finalDifficulty = gameState.difficulty * timeDifficultyFactor;
        const finalSpeedFactor = enemySpeedFactor * timeDifficultyFactor; // 速度也受时间影响

        // 根据最终难度设置生命值
        if (type === 'boss') {
            // Boss 血量主要由关卡决定，时间影响较小或不影响，避免 Boss 过于难打
            const bossBaseHealth = 1000; // Boss 基础血量固定值 (之前误写为100)
            this.health = Math.ceil(bossBaseHealth * gameState.difficulty); // 主要受关卡影响
            this.maxHealth = this.health;
        } else if (type === 'fast') {
            const fastBaseHealth = 1; // 快速敌人基础血量
            this.health = Math.ceil(fastBaseHealth * finalDifficulty * 0.8); // 比普通敌人血少点
            this.maxHealth = this.health;
        }
        else { // 'normal' 或未来其他普通类型
            const normalBaseHealth = 1; // 普通敌人基础血量
            this.health = Math.ceil(normalBaseHealth * finalDifficulty);
            this.maxHealth = this.health;
        }

        this.speed = this.getSpeed(finalSpeedFactor); // 传递最终速度因子
        this.points = this.getPoints();
        this.engineFlame = 0;

        // BOSS特有属性... (保持不变)
        if (type === 'boss') {
            this.state = BOSS_STATES.ENTER;
            this.targetY = canvas.height / 5;
            this.moveDirection = 1;
            this.attackTimer = 0;
            this.attackInterval = Math.max(60, 120 - (gameState.level - 1) * 10); // Boss攻击间隔随关卡变快
            this.currentAttack = 0;
            this.bulletPattern = 0;
        }
    }

    // 修改 getSpeed 以接受速度因子
    getSpeed(speedFactor = 1) { // 默认因子为1
        switch(this.type) {
            case 'fast': return 4 * speedFactor;
            case 'boss': return 1 * speedFactor; // Boss 速度也可能受影响
            default: return 2 * speedFactor;
        }
    }

    // getPoints() ... (分数也随难度增加)
    getPoints() {
        switch(this.type) {
            case 'fast': return 15 * Math.ceil(gameState.difficulty); // 分数也随难度增加
            case 'boss': return 500 * Math.ceil(gameState.difficulty);
            default: return 10 * Math.ceil(gameState.difficulty);
        }
    }

    draw() {
        // 无敌状态下闪烁效果
        //if (this.isInvincible && this.blinkInterval < 5) { // Enemies don't have isInvincible
        //    return;
       // }

        if (this.type === 'boss') {
             // Correct: Translate happens HERE in the main draw method
             ctx.save();
             ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
             this.drawBoss(); // drawBoss should now draw relative to (0,0)
             ctx.restore(); // Restore from the translate in this method

             // Health bar is drawn separately, relative to the logical this.x, this.y
             this.drawBossHealthBar();
        } else {
            ctx.save();
            // Translate to center of the enemy for rotation/drawing
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            this.drawNormalEnemy(); // drawNormalEnemy draws relative to (0,0)
            ctx.restore();
        }
    }

    drawBoss() {
        // *** REMOVE redundant save/translate here ***
        // ctx.save();
        // ctx.translate(this.x + this.width/2, this.y + this.height/2); // REMOVED - This caused double translation

        // Boss主体 - 六边形装甲 (Draw relative to 0,0 as context is already translated)
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 3);

            // 装甲板渐变
            const armorGradient = ctx.createLinearGradient(
                -this.width/2, 0, // Use relative coordinates
                this.width/2, 0
            );
            armorGradient.addColorStop(0, '#880088');
            armorGradient.addColorStop(0.5, '#ff44ff');
            armorGradient.addColorStop(1, '#880088');

            ctx.fillStyle = armorGradient;
            ctx.beginPath();
            // Use relative coordinates
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
             // Use relative coordinates
            ctx.moveTo(-this.width/4, -this.height/4);
            ctx.lineTo(this.width/4, -this.height/4);
            ctx.moveTo(-this.width/4, this.height/4);
            ctx.lineTo(this.width/4, this.height/4);
            ctx.stroke();

            ctx.restore();
        }

        // 能量核心 (Draw relative to 0,0)
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/3);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.3, '#ff88ff');
        coreGradient.addColorStop(0.6, '#ff44ff');
        coreGradient.addColorStop(1, '#880088');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.width/3, 0, Math.PI * 2);
        ctx.fill();

        // 能量波动效果 (Draw relative to 0,0)
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, this.width/3 + Math.sin(Date.now() / 100) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Boss发动机效果 (drawBossEngines already draws relative to 0,0)
        this.drawBossEngines();

        // *** REMOVE redundant restore here ***
        // ctx.restore(); // REMOVED - Corresponds to the removed save/translate
    }

    drawNormalEnemy() {
        const isfast = this.type === 'fast';
        const mainColor = isfast ? '#ff8800' : '#ff4444';
        const secondaryColor = isfast ? '#ffaa00' : '#ff6666';

        // 机身渐变 (Draw relative to 0,0)
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
         // Draw health bar relative to the *actual* boss position (this.x, this.y)
        const barWidth = 200;
        const barHeight = 20;
        const x = this.x + (this.width - barWidth) / 2; // Centered horizontally relative to boss
        const y = this.y - 30; // Position above the boss sprite

        // 血条背景
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // 当前血量
        const healthPercentage = Math.max(0, this.health / this.maxHealth); // Ensure percentage doesn't go below 0
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
        ctx.textBaseline = 'middle'; // Align text vertically
        ctx.fillText(`${Math.max(0, this.health)}/${this.maxHealth}`, x + barWidth/2, y + barHeight/2);
    }

     drawBossEngines() {
        const enginePositions = [
            {x: -this.width * 0.4, y: 0},
            {x: this.width * 0.4, y: 0},
            {x: 0, y: -this.height * 0.4},
            {x: 0, y: this.height * 0.4}
        ];

        enginePositions.forEach(pos => {
            // 发动机外壳 (Draw relative to 0,0)
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
            // 发动机外壳 (Draw relative to 0,0)
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
       /* if (this.isInvincible) { // Enemies don't have invincibility state
            this.invincibleTimer++;
            this.blinkInterval = (this.blinkInterval + 1) % 10;

            if (this.invincibleTimer >= 120) { // 2秒无敌时间(60fps)
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }*/
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
                //this.y = this.targetY; // Let's allow slight vertical drift if needed, re-evaluate if problematic

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
                // 在攻击状态下仍然保持在固定Y位置 (optional, allow movement if desired)
                //this.y = this.targetY;

                // 执行攻击 (Fire only once per state entry)
                 if (this.attackTimer === 0) { // Assuming attackTimer resets when entering attack state
                     if (this.state === BOSS_STATES.ATTACK1) {
                         this.fireBulletPattern1();
                     } else if (this.state === BOSS_STATES.ATTACK2) {
                         this.fireBulletPattern2();
                     } else if (this.state === BOSS_STATES.ATTACK3) {
                         this.fireBulletPattern3();
                     }
                 }
                 this.attackTimer++; // Increment timer within attack state

                // 攻击完毕后回到IDLE状态 (Transition after a short delay or based on timer?)
                // Simple transition back immediately after firing for now:
                 if (this.attackTimer > 10) { // Short delay after firing before going back to idle
                    this.state = BOSS_STATES.IDLE;
                     this.attackTimer = 0; // Reset timer for idle phase
                 }
                break;
        }
    }

     fireBulletPattern1() {
        // 圆形弹幕
        const bulletCount = 12 + Math.floor(gameState.difficulty); // Scale count slightly with difficulty
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i / bulletCount) * Math.PI * 2;
            const bullet = new EnemyBullet(
                this.x + this.width/2,
                this.y + this.height/2,
                Math.cos(angle) * (3 + gameState.difficulty * 0.5), // Scale speed slightly
                Math.sin(angle) * (3 + gameState.difficulty * 0.5),
                'circle'
            );
            enemyBullets.push(bullet);
        }
         AudioController.playOneShot(hitSound); // Boss shoot sound (placeholder)
    }

     fireBulletPattern2() {
        // 追踪导弹
        const bulletCount = 2 + Math.floor(gameState.difficulty / 2); // Scale count slightly
        for (let i = 0; i < bulletCount; i++) {
            const bullet = new EnemyBullet(
                this.x + this.width/2 - 10 + i * (40 / bulletCount), // Adjust spacing
                this.y + this.height,
                0,
                (2 + gameState.difficulty * 0.3), // Scale speed slightly
                'tracking'
            );
            enemyBullets.push(bullet);
        }
        AudioController.playOneShot(missileSound); // Boss missile sound (placeholder)
    }

     fireBulletPattern3() {
        // 散射攻击
        const bulletCount = 4 + Math.floor(gameState.difficulty); // Scale count slightly
        const spreadAngle = Math.PI / 4 + (gameState.difficulty -1)* 0.1; // Widen spread slightly
        for (let i = 0; i < bulletCount; i++) {
            const angle = -spreadAngle/2 + (spreadAngle / (bulletCount-1)) * i + Math.PI/2;
            const bullet = new EnemyBullet(
                this.x + this.width/2,
                this.y + this.height/2,
                Math.cos(angle) * (4 + gameState.difficulty * 0.6), // Scale speed
                Math.sin(angle) * (4 + gameState.difficulty * 0.6),
                'spread'
            );
            enemyBullets.push(bullet);
        }
        AudioController.playOneShot(shootSound); // Boss spread sound (placeholder)
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
        // Added rotation for drawing consistency
        this.rotationAngle = Math.atan2(speedY, speedX) + Math.PI / 2;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);

        // Simplified drawing based on type, centered at 0,0
        switch(this.type) {
            case 'circle':
                const circleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
                circleGradient.addColorStop(0, '#ff88ff');
                circleGradient.addColorStop(1, '#ff00ff');
                ctx.fillStyle = circleGradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'tracking': // Draw as small missile
                ctx.fillStyle = '#ff0066';
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.lineTo(this.width/2, this.height/2);
                ctx.lineTo(-this.width/2, this.height/2);
                ctx.closePath();
                ctx.fill();
                break;

            case 'spread': // Draw as shard
                const spreadGradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
                spreadGradient.addColorStop(0, '#ff00ff');
                spreadGradient.addColorStop(1, '#880088');
                ctx.fillStyle = spreadGradient;
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.lineTo(this.width/2, this.height/2);
                ctx.lineTo(-this.width/2, this.height/2);
                ctx.closePath();
                ctx.fill();
                break;
        }

        ctx.restore();
    }

     update() {
        this.lifetime++;

        if (this.type === 'tracking' && this.lifetime < 120) {
             // Basic tracking logic (can be improved)
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const angleToPlayer = Math.atan2(dy, dx);

            // Gradually adjust speed towards player
            const accel = 0.05 + gameState.difficulty * 0.01; // Scale acceleration slightly
            this.speedX += Math.cos(angleToPlayer) * accel;
            this.speedY += Math.sin(angleToPlayer) * accel;

            // Limit max speed
            const maxSpeed = 4 + gameState.difficulty * 0.5; // Scale max speed slightly
            const currentSpeed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
            if (currentSpeed > maxSpeed) {
                this.speedX = (this.speedX / currentSpeed) * maxSpeed;
                this.speedY = (this.speedY / currentSpeed) * maxSpeed;
            }
            this.rotationAngle = Math.atan2(this.speedY, this.speedX) + Math.PI / 2;
        }

        this.x += this.speedX;
        this.y += this.speedY;
    }
}

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

     // ... (draw methods for powerup remain the same) ...
    draw() {
        // 无敌状态下闪烁效果
        // if (this.isInvincible && this.blinkInterval < 5) { // Powerups don't have isInvincible
        //     return;
        // }
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);

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
        // Draw stroke inside clip path
        ctx.beginPath();
        ctx.arc(0, 0, this.width/2 -1, 0, Math.PI * 2); // Slightly smaller radius for stroke
        ctx.stroke();


        // 添加内部纹理
        this.drawPackageTexture();

        ctx.restore(); // Restore from clip
        ctx.restore(); // Restore from translate
    }
    drawHealthPack() {
        // 医疗包背景
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
        gradient.addColorStop(0, '#ffeeee');
        gradient.addColorStop(1, '#ff4444');
        ctx.fillStyle = gradient;
        // Fill the clipped circle
        ctx.beginPath();
        ctx.arc(0,0, this.width/2, 0, Math.PI*2);
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
        // Fill the clipped circle
        ctx.beginPath();
        ctx.arc(0,0, this.width/2, 0, Math.PI*2);
        ctx.fill();


        // 子弹图标 (Simplified)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Simple arrow/bullet shape
        ctx.moveTo(0, -this.height/4);
        ctx.lineTo(this.width/6, 0);
        ctx.lineTo(this.width/6, this.height/4);
        ctx.lineTo(-this.width/6, this.height/4);
        ctx.lineTo(-this.width/6, 0);
        ctx.closePath();
        ctx.fill();

    }

    drawShieldPack() {
        // 护盾包背景
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/2);
        gradient.addColorStop(0, '#eeeeff');
        gradient.addColorStop(1, '#4444ff');
        ctx.fillStyle = gradient;
         // Fill the clipped circle
        ctx.beginPath();
        ctx.arc(0,0, this.width/2, 0, Math.PI*2);
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
        // 添加反光效果 (Draw inside the clip)
        const highlight = ctx.createLinearGradient(
            -this.width/2, -this.height/2,
            this.width/2, this.height/2
        );
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0.2)');

        ctx.fillStyle = highlight;
        // Fill the clipped circle
        ctx.beginPath();
        ctx.arc(0,0, this.width/2, 0, Math.PI*2);
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
            const angle = (i / 5 - 0.5) * Math.PI * 0.8; // Adjust angle spread
            const xOffset = Math.sin(angle) * (this.width/2);
             const yOffset = Math.cos(angle) * (this.height/2) * 0.5; // Slight vertical offset

            ctx.moveTo(xOffset, yOffset); // Start from edge of package
            ctx.lineTo(Math.sin(angle) * parachuteWidth/2, -parachuteHeight + 10); // Connect to lower part of canopy
        }
        ctx.stroke();

        // 降落伞主体 (Canopy)
        ctx.beginPath();
        ctx.moveTo(-parachuteWidth/2, -parachuteHeight + 10);
        ctx.bezierCurveTo(
            -parachuteWidth/2, -parachuteHeight - parachuteHeight*0.3, // Control point 1
             parachuteWidth/2, -parachuteHeight - parachuteHeight*0.3, // Control point 2
             parachuteWidth/2, -parachuteHeight + 10); // End point

        // 使用物资类型对应的颜色创建渐变
        const gradient = ctx.createLinearGradient(0, -parachuteHeight - 20, 0, -parachuteHeight + 10);
        gradient.addColorStop(0, this.parachuteColor);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

        // 填充降落伞
        ctx.fillStyle = gradient;
        ctx.fill();

         // Canopy outline
        ctx.strokeStyle = this.parachuteColor.replace('0.8', '1'); // Make outline solid color
        ctx.lineWidth = 2;
        ctx.stroke();


        // 降落伞内部纹理
        ctx.beginPath();
        for (let i = 1; i < 6; i++) {
             const x1 = -parachuteWidth/2 + (parachuteWidth/6) * i;
             const x2 = 0; // Converge towards center top? Let's try vertical lines
             const y1 = -parachuteHeight + 10;
             const y2 = -parachuteHeight - 5; // Top point for lines

            // Simple vertical lines for texture
             ctx.moveTo(x1, y1);
             ctx.lineTo(x1, y1 - 15); // Draw short vertical lines down from edge


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
        this.y += this.speed;
    }

    applyEffect(player) {
        AudioController.playOneShot(powerUpSound); // Use one-shot for powerups too
        switch(this.type) {
            case 'health':
                if (gameState.lives < gameState.maxLives) {
                    gameState.lives++;
                }
                break;
            case 'weapon':
                // --- Updated Weapon Level Logic --- START ---
                const maxWeaponLevel = 12; // Define the max level before speed increase
                // Find the current highest possible weapon level based on defined stages
                const definedMaxLevel = 12; // Corresponds to 5.12 in the list
                
                if (gameState.weaponLevel < definedMaxLevel) {
                    gameState.weaponLevel++;
                    showWeaponUpgradeEffect(); // Show upgrade text effect
                } else if (gameState.weaponLevel >= definedMaxLevel) {
                    // Level 13 and above: Only increase speed, level number doesn't matter beyond triggering speed boost
                    gameState.weaponLevel++; // Increment level conceptually for speed boost scaling
                     if (gameState.weaponLevel === definedMaxLevel + 1) {
                        showWeaponUpgradeEffect(); // Show effect only the first time speed increases
                     }
                    console.log("Weapon level maxed, increasing fire rate.");
                }

                 // Apply speed increase starting from level 13 (definedMaxLevel + 1)
                 if (gameState.weaponLevel > definedMaxLevel) {
                     // Calculate speed reduction factor (e.g., 5% faster per level above 12, capped)
                     const levelsAboveMax = gameState.weaponLevel - definedMaxLevel;
                     const speedIncreasePercent = Math.min(0.25, levelsAboveMax * 0.05); // Cap speed increase at 25% (5 levels)
                     const speedIncreaseFactor = 1 - speedIncreasePercent;

                     player.normalShootingSpeed = Math.max(50, player.baseNormalShootingSpeed * speedIncreaseFactor); // Add minimum interval
                     player.missileShootingSpeed = Math.max(100, player.baseMissileShootingSpeed * speedIncreaseFactor); // Add minimum interval
                    // console.log(`Shooting speed increased! Norm: ${player.normalShootingSpeed.toFixed(0)}, Missile: ${player.missileShootingSpeed.toFixed(0)}`);
                 } else {
                      // Ensure speed resets if level drops below 13 somehow (unlikely)
                      player.normalShootingSpeed = player.baseNormalShootingSpeed;
                      player.missileShootingSpeed = player.baseMissileShootingSpeed;
                 }
                // --- Updated Weapon Level Logic --- END ---
                break;
            case 'shield':
                if (!gameState.hasShield) {
                    gameState.hasShield = true;
                    if (gameState.shieldTimer) clearTimeout(gameState.shieldTimer);
                    gameState.shieldTimer = setTimeout(() => {
                        gameState.hasShield = false;
                    }, 10000); // 10 seconds shield
                }
                break;
        }
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
    
    if (random < 0.1) { // 30% 概率为武器升级包
        type = 'shield';
    } else if (random < 0.2) { // 10% 概率为护盾
        type = 'health';
    } else if (random < 0.95) { // 10% 概率为血包
        type = 'weapon';
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
    if (window.enemySpawnTimer) {
        clearInterval(window.enemySpawnTimer);
    }

    window.enemySpawnTimer = setInterval(() => {
        if (isPaused || (gameState.bossSpawned && gameState.currentBoss)) return; // Boss存在时不生成普通敌人

        // 计算当前时间难度因子
        const levelTimeSeconds = (Date.now() - gameState.levelStartTime) / 1000;
        const timeDifficultyFactor = Math.min(2, 1 + Math.floor(levelTimeSeconds / 30) * 0.1); // 每30秒难度增加10%，上限为基础的2倍

        // 动态调整生成间隔和最大数量
        // 注意：Interval本身不变，我们在回调内部控制是否生成以及生成属性
        const currentSpawnInterval = Math.max(100, Math.floor(enemySpawnBaseInterval / timeDifficultyFactor)); // 目标间隔，实际由定时器频率决定
        const currentMaxEnemies = Math.min(30, Math.floor(maxEnemies * timeDifficultyFactor)); // 最多30个敌人


        // 动态调整快速敌人概率 (关卡和时间共同影响)
        const fastEnemyBaseChance = 0.2 + (gameState.level - 1) * 0.05; // 关卡基础概率
        const fastEnemyTimeBonus = Math.min(0.3, Math.floor(levelTimeSeconds / 60) * 0.05); // 每分钟增加5%概率，上限30%
        const fastEnemyChance = Math.min(0.8, fastEnemyBaseChance + fastEnemyTimeBonus); // 最终概率，上限80%


        // 更新定时器间隔 (如果需要更频繁的调整) - 不推荐频繁修改Interval
        // if (newInterval !== currentInterval) { ... }

        // 控制生成频率：可以通过随机数模拟更短的间隔
        // 例如，如果目标间隔是基础间隔的一半，那就在每次基础间隔触发时有50%概率再生成一个
        // 简化处理：我们依赖定时器基础间隔，但在内部通过 maxEnemies 和敌人属性增加难度

        if (enemies.length >= currentMaxEnemies) return; // 检查动态最大数量

        // Boss 生成逻辑 (保持基本不变，但基于 levelStartTime)
        if (levelTimeSeconds >= 30 && !gameState.bossSpawned) {
            const x = (canvas.width - 200) / 2;
            const boss = new Enemy(x, -200, 'boss');
            enemies.push(boss);
            gameState.currentBoss = boss;
            gameState.bossSpawned = true;
            console.log(`Boss spawned for level ${gameState.level}!`);
            return; // Boss生成后，本次不再生成普通敌人
        }

        // 生成普通敌机
        const x = Math.random() * (canvas.width - 50);
        const random = Math.random();

        let enemyType = 'normal'; // 默认类型
        if (random < fastEnemyChance) {
             enemyType = 'fast';
        }
        // --- 未来添加新敌人类型的逻辑可以放在这里 ---
        // else if (random < fastEnemyChance + shooterChance && gameState.level >= 2) { // 假设 shooter 在第2关解锁
        //     enemyType = 'shooter';
        // }
        // else if (random < fastEnemyChance + shooterChance + tankChance && gameState.level >= 3) { // 假设 tank 在第3关解锁
        //     enemyType = 'tank';
        // }

        enemies.push(new Enemy(x, -50, enemyType));

    }, enemySpawnBaseInterval); // 定时器仍然使用基础间隔，内部逻辑进行动态调整

    console.log(`Enemy spawner started/updated. Base interval: ${enemySpawnBaseInterval}ms`);
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
    console.log(`进入下一关: ${gameState.level}`);
    // 不再需要手动重置 levelStartTime 和 bossSpawned，increaseGameDifficulty会做
    increaseGameDifficulty(); // 更新难度参数并重启生成器
    // 可选：添加关卡过渡效果或提示

    // 显示下一关提示
    showLevelIndicator(`第 ${gameState.level} 关`);
}

// 添加增加游戏难度的函数
function increaseGameDifficulty() {
    // 计算关卡基础难度因子
    // *** Increase per-level difficulty increment from 0.15 to 0.25 ***
    gameState.difficulty = 1 + 0.75 * (gameState.level - 1);

    // 基础敌人生成间隔（后续在生成时结合时间难度因子计算）
    enemySpawnBaseInterval = Math.max(200, Math.floor(1000 / gameState.difficulty)); // 基础生成间隔随关卡缩短，最低200ms

    // 基础最大敌人数量（后续在生成时结合时间难度因子计算）
    maxEnemies = Math.min(20, Math.floor(10 * gameState.difficulty)); // 基础最大数量随关卡增加，最高20个

    // 基础敌人速度因子（后续在生成时结合时间难度因子计算）
    enemySpeedFactor = 1 + 0.1 * (gameState.level - 1); // 基础速度随关卡增加，每级+10%

    console.log(`关卡 ${gameState.level} 开始：基础难度因子=${gameState.difficulty.toFixed(2)}，基础生成间隔=${enemySpawnBaseInterval}，基础最大数量=${maxEnemies}，基础速度因子=${enemySpeedFactor.toFixed(2)}`);

    // 重置关卡开始时间，用于计算时间难度
    gameState.levelStartTime = Date.now();
    // 重置Boss生成状态
    gameState.bossSpawned = false;
    gameState.currentBoss = null;

    // 清理上一关可能残留的敌人和子弹 (可选，但推荐)
    enemies = [];
    enemyBullets = [];

    // 重新启动敌人生成计时器，使用更新后的基础间隔
    spawnEnemies();
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
            resetGame(); // resetGame now handles starting the loop implicitly
        }
    };
    // Debounce or ensure handler isn't added multiple times
    window.removeEventListener('keydown', restartHandler); // Remove previous if any
    window.addEventListener('keydown', restartHandler);
}

// 添加重置游戏函数
function resetGame() {
    // Stop existing game loop if running
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    // Stop enemy spawn timer
    if (window.enemySpawnTimer) {
        clearInterval(window.enemySpawnTimer);
        window.enemySpawnTimer = null;
    }

    // 重置游戏状态
    gameState = {
        level: 1,
        score: 0,
        lives: 3,
        maxLives: 5,
        difficulty: 1, // 初始难度因子
        powerUpActive: false,
        powerUpTimer: null,
        weaponLevel: 1, // Start at weapon level 1
        hasShield: false,
        shieldTimer: null,
        levelStartTime: Date.now(), // 初始化关卡开始时间
        bossSpawned: false,
        currentBoss: null
    };

    // 清空所有数组
    bullets = [];
    enemies = [];
    powerUps = [];
    enemyBullets = [];

    // 重置玩家位置和状态
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    // Reset shooting speeds to base values
    player.normalShootingSpeed = player.baseNormalShootingSpeed;
    player.missileShootingSpeed = player.baseMissileShootingSpeed;
    player.isInvincible = false; // 确保不是无敌状态
    player.invincibleTimer = 0;

    // *** 设置初始难度并启动生成 ***
    increaseGameDifficulty(); // This also calls spawnEnemies()

    // 重新开始背景音乐
    AudioController.stopAll(); // Ensure all old sounds stopped
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(e => console.error('背景音乐播放失败:', e));

    // 确保游戏不是暂停状态
    isPaused = false;
    if (pauseButton) pauseButton.textContent = '暂停';
    // Hide menus
    const pauseMenu = document.getElementById('pause-menu'); // Assuming IDs exist
    const gameOverMenu = document.getElementById('game-over-menu');
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (gameOverMenu) gameOverMenu.style.display = 'none';

    hideLevelIndicator();

    // Start the game loop ONLY if it's not already running from a previous call
     if (!animationId) {
        gameLoop();
     }
}

// 添加用于显示和隐藏关卡指示器的函数
let levelIndicatorTimeout = null; // 用于存储隐藏指示器的定时器

function showLevelIndicator(text) {
    const indicator = document.getElementById('levelIndicator');
    if (!indicator) return; // 如果元素不存在则退出

    indicator.textContent = text;
    indicator.style.display = 'block'; // 显示元素

    // 清除之前的隐藏定时器（如果存在）
    if (levelIndicatorTimeout) {
        clearTimeout(levelIndicatorTimeout);
    }

    // 设置定时器，在 2 秒后隐藏指示器
    levelIndicatorTimeout = setTimeout(() => {
        hideLevelIndicator();
    }, 2000); // 显示 2 秒
}

function hideLevelIndicator() {
    const indicator = document.getElementById('levelIndicator');
    if (!indicator) return; // 如果元素不存在则退出

    indicator.style.display = 'none'; // 隐藏元素

    // 清除定时器（如果它正在运行）
    if (levelIndicatorTimeout) {
        clearTimeout(levelIndicatorTimeout);
        levelIndicatorTimeout = null;
    }
}