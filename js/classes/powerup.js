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
             const x2 = 0;
             const y1 = -parachuteHeight + 10;
             const y2 = -parachuteHeight - 5;

            // Simple vertical lines for texture
             ctx.moveTo(x1, y1);
             ctx.lineTo(x1, y1 - 15);


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
                const definedMaxLevel = 12; // Corresponds to 5.12 in the list

                if (gameState.weaponLevel < definedMaxLevel) {
                    gameState.weaponLevel++;
                    showWeaponUpgradeEffect();
                } else if (gameState.weaponLevel >= definedMaxLevel) {
                    gameState.weaponLevel++;
                     if (gameState.weaponLevel === definedMaxLevel + 1) {
                        showWeaponUpgradeEffect();
                     }
                    console.log("Weapon level maxed, increasing fire rate.");
                }

                 if (gameState.weaponLevel > definedMaxLevel) {
                     const levelsAboveMax = gameState.weaponLevel - definedMaxLevel;
                     const speedIncreasePercent = Math.min(0.25, levelsAboveMax * 0.05);
                     const speedIncreaseFactor = 1 - speedIncreasePercent;

                     player.normalShootingSpeed = Math.max(50, player.baseNormalShootingSpeed * speedIncreaseFactor);
                     player.missileShootingSpeed = Math.max(100, player.baseMissileShootingSpeed * speedIncreaseFactor);
                 } else {
                      player.normalShootingSpeed = player.baseNormalShootingSpeed;
                      player.missileShootingSpeed = player.baseMissileShootingSpeed;
                 }
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