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
        const heartSpacing = 35;
        const heartSize = 25;
        
        for (let i = 0; i < gameState.lives; i++) {
            const heartX = 30 + i * heartSpacing;
            const heartY = 80;
            
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

            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    update() {
        if (this.isInvincible) {
            this.invincibleTimer++;
            this.blinkInterval = (this.blinkInterval + 1) % 10;
            
            if (this.invincibleTimer >= 120) {
                this.isInvincible = false;
                this.invincibleTimer = 0;
            }
        }
        if (keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if (keys['ArrowDown'] && this.y < canvas.height - this.height) this.y += this.speed;
        if (keys['ArrowLeft'] && this.x > this.width / 2) this.x -= this.speed;
        if (keys['ArrowRight'] && this.x < canvas.width - this.width / 2) this.x += this.speed;
    }


    shoot() {
        const now = Date.now();
        let normalBulletCount = 0;
        let missileCount = 0;
        let diagonalBulletCountPerSide = 0;

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
        } else if (level >= 12) {
            normalBulletCount = 5;
            missileCount = 4;
            diagonalBulletCountPerSide = 3;
        }

        if (now - this.lastNormalShot >= this.normalShootingSpeed) {
            this.lastNormalShot = now;
            if (normalBulletCount > 0) {
                this.createNormalBullets(normalBulletCount);
            }
            if (diagonalBulletCountPerSide > 0) {
                this.createDiagonalBullets(diagonalBulletCountPerSide);
            }
            if (normalBulletCount > 0 || diagonalBulletCountPerSide > 0) {
                 AudioController.playOneShot(shootSound);
            }
        }

        if (missileCount > 0 && now - this.lastMissileShot >= this.missileShootingSpeed) {
            this.lastMissileShot = now;
            this.createMissiles(missileCount);
            AudioController.playOneShot(missileSound);
        }
    }

    createNormalBullets(bulletCount) {
        const bulletSpread = 15;
        const totalWidth = (bulletCount - 1) * bulletSpread;
        const startX = this.x - totalWidth / 2;

        for (let i = 0; i < bulletCount; i++) {
            bullets.push(new Bullet(startX + i * bulletSpread, this.y));
        }
    }

    createDiagonalBullets(countPerSide) {
        const angleOffset = Math.PI / 8;
        const bulletSpread = 10;

        for (let i = 0; i < countPerSide; i++) {
            const angleL = -Math.PI / 2 - angleOffset;
            const startXL = this.x - this.width * 0.3 - i * bulletSpread;
             bullets.push(new Bullet(startXL, this.y, 'normal', null, angleL));
            
            const angleR = -Math.PI / 2 + angleOffset;
            const startXR = this.x + this.width * 0.3 + i * bulletSpread;
             bullets.push(new Bullet(startXR, this.y, 'normal', null, angleR));
        }
    }


    createMissiles(missileCount) {
        const missileSpread = 30;
        const totalWidth = (missileCount - 1) * missileSpread;
        const startX = this.x - totalWidth / 2;

        for (let i = 0; i < missileCount; i++) {
            const missileX = startX + i * missileSpread;
            let nearestEnemy = null;
            let minDistance = Infinity;
            enemies.forEach(enemy => {
                if (enemy.y < this.y) {
                    const distance = Math.hypot(enemy.x - missileX, enemy.y - this.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestEnemy = enemy;
                    }
                }
            });
            bullets.push(new Bullet(missileX, this.y, 'missile', nearestEnemy));
        }
    }
}

const player = new Player(canvas.width / 2, canvas.height - 100); 