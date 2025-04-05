class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'boss' ? 200 : 50;
        this.height = type === 'boss' ? 200 : 50;

        const BOSS_SPAWN_TIME_SECONDS = 30;
        const TIME_DIFFICULTY_TARGET_FACTOR = 1.5;

        const levelTimeSeconds = (Date.now() - gameState.levelStartTime) / 1000;
        let timeDifficultyFactor;
        if (levelTimeSeconds <= BOSS_SPAWN_TIME_SECONDS) {
            timeDifficultyFactor = 1 + ((TIME_DIFFICULTY_TARGET_FACTOR - 1) * levelTimeSeconds / BOSS_SPAWN_TIME_SECONDS);
        } else {
            timeDifficultyFactor = TIME_DIFFICULTY_TARGET_FACTOR;
        }

        const finalDifficulty = gameState.difficulty * timeDifficultyFactor;
        const finalSpeedFactor = enemySpeedFactor * timeDifficultyFactor;

        if (type === 'boss') {
            const bossBaseHealth = 1000;
            this.health = Math.ceil(bossBaseHealth * gameState.difficulty);
            this.maxHealth = this.health;
        } else if (type === 'fast') {
            const fastBaseHealth = 1;
            this.health = Math.ceil(fastBaseHealth * finalDifficulty * 0.8);
            this.maxHealth = this.health;
        }
        else {
            const normalBaseHealth = 1;
            this.health = Math.ceil(normalBaseHealth * finalDifficulty);
            this.maxHealth = this.health;
        }

        this.speed = this.getSpeed(finalSpeedFactor);
        this.points = this.getPoints();
        this.engineFlame = 0;

        if (type === 'boss') {
            this.state = BOSS_STATES.ENTER;
            this.targetY = canvas.height / 5;
            this.moveDirection = 1;
            this.attackTimer = 0;
            this.attackInterval = Math.max(60, 120 - (gameState.level - 1) * 10);
            this.currentAttack = 0;
            this.bulletPattern = 0;
        }
    }

    getSpeed(speedFactor = 1) {
        switch(this.type) {
            case 'fast': return 4 * speedFactor;
            case 'boss': return 1 * speedFactor;
            default: return 2 * speedFactor;
        }
    }

    getPoints() {
        switch(this.type) {
            case 'fast': return 15 * Math.ceil(gameState.difficulty);
            case 'boss': return 500 * Math.ceil(gameState.difficulty);
            default: return 10 * Math.ceil(gameState.difficulty);
        }
    }

    draw() {
        if (this.type === 'boss') {
             ctx.save();
             ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
             this.drawBoss();
             ctx.restore();
             this.drawBossHealthBar();
        } else {
            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            this.drawNormalEnemy();
            ctx.restore();
        }
    }

    drawBoss() {
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 3);
            const armorGradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0 );
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
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width/3);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.3, '#ff88ff');
        coreGradient.addColorStop(0.6, '#ff44ff');
        coreGradient.addColorStop(1, '#880088');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.width/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, this.width/3 + Math.sin(Date.now() / 100) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
        this.drawBossEngines();
    }

    drawNormalEnemy() {
        const isfast = this.type === 'fast';
        const mainColor = isfast ? '#ff8800' : '#ff4444';
        const secondaryColor = isfast ? '#ffaa00' : '#ff6666';
        const bodyGradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2 );
        bodyGradient.addColorStop(0, mainColor);
        bodyGradient.addColorStop(1, secondaryColor);
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2);
        ctx.bezierCurveTo( this.width * 0.3, -this.height * 0.3, this.width * 0.3, this.height * 0.3, 0, this.height/2 );
        ctx.bezierCurveTo( -this.width * 0.3, this.height * 0.3, -this.width * 0.3, -this.height * 0.3, 0, -this.height/2 );
        ctx.fill();
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.6, this.height * 0.1);
        ctx.lineTo(this.width * 0.6, this.height * 0.1);
        ctx.lineTo(this.width * 0.3, -this.height * 0.2);
        ctx.lineTo(-this.width * 0.3, -this.height * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.width * 0.2, -this.height * 0.3);
        ctx.lineTo(-this.width * 0.2, this.height * 0.3);
        ctx.moveTo(this.width * 0.2, -this.height * 0.3);
        ctx.lineTo(this.width * 0.2, this.height * 0.3);
        ctx.stroke();
        const cockpitGradient = ctx.createLinearGradient( 0, -this.height * 0.2, 0, 0 );
        cockpitGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        cockpitGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.ellipse(0, -this.height * 0.1, this.width * 0.15, this.height * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawEnemyEngines();
    }

    drawBossHealthBar() {
        const barWidth = 200;
        const barHeight = 20;
        const x = this.x + (this.width - barWidth) / 2;
        const y = this.y - 30;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(x, y, barWidth, barHeight);
        const healthPercentage = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, barWidth * healthPercentage, barHeight);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
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
            ctx.fillStyle = '#660066';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.width * 0.1, 0, Math.PI * 2);
            ctx.fill();
            const engineGlow = ctx.createRadialGradient( pos.x, pos.y, 0, pos.x, pos.y, this.width * 0.15 );
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
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.arc(x, this.height * 0.4, this.width * 0.08, 0, Math.PI * 2);
            ctx.fill();
            const flameGradient = ctx.createLinearGradient( x, this.height * 0.4, x, this.height * 0.4 + flameHeight );
            flameGradient.addColorStop(0, '#ff8844');
            flameGradient.addColorStop(0.5, '#ffaa44');
            flameGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            ctx.fillStyle = flameGradient;
            ctx.beginPath();
            ctx.moveTo(x - this.width * 0.06, this.height * 0.4);
            ctx.quadraticCurveTo( x, this.height * 0.4 + flameHeight * 0.8, x, this.height * 0.4 + flameHeight );
            ctx.quadraticCurveTo( x, this.height * 0.4 + flameHeight * 0.8, x + this.width * 0.06, this.height * 0.4 );
            ctx.closePath();
            ctx.fill();
        });
    }

    update() {
        if (this.type === 'boss') {
            this.updateBoss();
        } else {
            this.y += this.speed;
        }
    }

    updateBoss() {
        this.targetY = canvas.height / 5;
        switch (this.state) {
            case BOSS_STATES.ENTER:
                if (this.y < this.targetY) {
                    this.y += this.speed * 2;
                } else {
                    this.y = this.targetY;
                    this.state = BOSS_STATES.IDLE;
                }
                break;
            case BOSS_STATES.IDLE:
                this.x += this.speed * this.moveDirection;
                if (this.x <= 0) {
                    this.x = 0;
                    this.moveDirection = 1;
                } else if (this.x >= canvas.width - this.width) {
                    this.x = canvas.width - this.width;
                    this.moveDirection = -1;
                }
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
                 if (this.attackTimer === 0) {
                     if (this.state === BOSS_STATES.ATTACK1) {
                         this.fireBulletPattern1();
                     } else if (this.state === BOSS_STATES.ATTACK2) {
                         this.fireBulletPattern2();
                     } else if (this.state === BOSS_STATES.ATTACK3) {
                         this.fireBulletPattern3();
                     }
                 }
                 this.attackTimer++;
                 if (this.attackTimer > 10) {
                    this.state = BOSS_STATES.IDLE;
                     this.attackTimer = 0;
                 }
                break;
        }
    }

     fireBulletPattern1() {
        const bulletCount = 12 + Math.floor(gameState.difficulty);
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i / bulletCount) * Math.PI * 2;
            const bullet = new EnemyBullet( this.x + this.width/2, this.y + this.height/2, Math.cos(angle) * (3 + gameState.difficulty * 0.5), Math.sin(angle) * (3 + gameState.difficulty * 0.5), 'circle' );
            enemyBullets.push(bullet);
        }
         AudioController.playOneShot(hitSound);
    }

     fireBulletPattern2() {
        const bulletCount = 2 + Math.floor(gameState.difficulty / 2);
        for (let i = 0; i < bulletCount; i++) {
            const bullet = new EnemyBullet( this.x + this.width/2 - 10 + i * (40 / bulletCount), this.y + this.height, 0, (2 + gameState.difficulty * 0.3), 'tracking' );
            enemyBullets.push(bullet);
        }
        AudioController.playOneShot(missileSound);
    }

     fireBulletPattern3() {
        const bulletCount = 4 + Math.floor(gameState.difficulty);
        const spreadAngle = Math.PI / 4 + (gameState.difficulty -1)* 0.1;
        for (let i = 0; i < bulletCount; i++) {
            const angle = -spreadAngle/2 + (spreadAngle / (bulletCount-1)) * i + Math.PI/2;
            const bullet = new EnemyBullet( this.x + this.width/2, this.y + this.height/2, Math.cos(angle) * (4 + gameState.difficulty * 0.6), Math.sin(angle) * (4 + gameState.difficulty * 0.6), 'spread' );
            enemyBullets.push(bullet);
        }
        AudioController.playOneShot(shootSound);
    }

} 