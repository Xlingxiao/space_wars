// 添加物资包生成逻辑
function spawnPowerUp(x, y) {
    const random = Math.random();
    let type;
    
    if (random < 0.1) { type = 'shield'; }
    else if (random < 0.2) { type = 'health'; }
    else if (random < 0.95) { type = 'weapon'; }
    else { return; }
    
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
    gameState.score += enemy.points;
    
    if (enemy.type !== 'boss' && Math.random() < 0.3) {
        spawnPowerUp(enemy.x + enemy.width/2, enemy.y);
    }

    if (enemy.type === 'boss') {
        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 100;
            spawnBossPowerUp(enemy.x + enemy.width/2 + offsetX, enemy.y);
        }
        gameState.bossSpawned = false;
        gameState.currentBoss = null;
        startNextLevel();
    }

    AudioController.playWithDebounce(hitSound, 100);
}

// 添加BOSS物资包生成逻辑，确保100%生成物品
function spawnBossPowerUp(x, y) {
    const random = Math.random();
    let type;
    
    if (random < 0.5) { type = 'weapon'; }
    else if (random < 0.75) { type = 'shield'; }
    else { type = 'health'; }
    
    powerUps.push(new PowerUp(x, y, type));
}

// 添加背景绘制函数
function drawBackground() {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#0a0a2a');
    bgGradient.addColorStop(1, '#1a1a4a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        const twinkle = 0.5 + Math.sin(Date.now() / 1000 + star.x) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
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

    if (backgroundMusic.paused && !isPaused) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(e => console.error('背景音乐播放失败:', e));
    }

    player.shoot();
    player.update();
    player.draw();

    bullets = bullets.filter((bullet) => {
        bullet.update();
        bullet.draw();
        return bullet.y > -bullet.height; // Keep if above screen slightly
    });

    enemies = enemies.filter((enemy) => {
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

    powerUps = powerUps.filter(powerUp => {
        powerUp.update();
        powerUp.draw();
        if (powerUp.y > canvas.height) { return false; }
        if (checkCollisionWithPlayer(powerUp)) {
            powerUp.applyEffect(player);
            return false;
        }
        return true;
    });

    enemyBullets = enemyBullets.filter(bullet => {
        bullet.update();
        bullet.draw();
        return bullet.x >= -bullet.width && bullet.x <= canvas.width && 
               bullet.y >= -bullet.height && bullet.y <= canvas.height &&
               bullet.lifetime < 300;
    });

    checkCollisions();
    drawGameInfo();

    // Check for next level transition *after* drawing and collisions
    if (gameState.bossSpawned && !enemies.includes(gameState.currentBoss) && gameState.currentBoss) {
        // Boss was defeated in this frame (checkCollisions handled death)
        // startNextLevel() is called within handleEnemyDeath for the boss
        // We might need to reset currentBoss reference here if not done elsewhere
        // gameState.currentBoss = null; // Ensure it's null if defeated
    }

    animationId = requestAnimationFrame(gameLoop);
}

// 修改生成敌机的逻辑
let enemySpawnTimer = null; // Define timer variable locally to this module
function spawnEnemies() {
    if (enemySpawnTimer) {
        clearInterval(enemySpawnTimer);
    }

    enemySpawnTimer = setInterval(() => {
        if (isPaused || (gameState.bossSpawned && gameState.currentBoss)) return;

        const levelTimeSeconds = (Date.now() - gameState.levelStartTime) / 1000;
        const timeDifficultyFactor = Math.min(2, 1 + Math.floor(levelTimeSeconds / 30) * 0.1);
        const currentMaxEnemies = Math.min(30, Math.floor(maxEnemies * timeDifficultyFactor));
        const fastEnemyBaseChance = 0.2 + (gameState.level - 1) * 0.05;
        const fastEnemyTimeBonus = Math.min(0.3, Math.floor(levelTimeSeconds / 60) * 0.05);
        const fastEnemyChance = Math.min(0.8, fastEnemyBaseChance + fastEnemyTimeBonus);

        if (enemies.length >= currentMaxEnemies) return;

        if (levelTimeSeconds >= 30 && !gameState.bossSpawned) {
            const x = (canvas.width - 200) / 2;
            const boss = new Enemy(x, -200, 'boss');
            enemies.push(boss);
            gameState.currentBoss = boss;
            gameState.bossSpawned = true;
            console.log(`Boss spawned for level ${gameState.level}!`);
            return;
        }

        const x = Math.random() * (canvas.width - 50);
        const random = Math.random();
        let enemyType = random < fastEnemyChance ? 'fast' : 'normal';
        enemies.push(new Enemy(x, -50, enemyType));

    }, enemySpawnBaseInterval);

    console.log(`Enemy spawner started/updated. Base interval: ${enemySpawnBaseInterval}ms`);
}

// 修改碰撞检测函数
function checkCollisions() {
    // 子弹与敌机的碰撞检测
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
             // Basic AABB collision detection
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                enemy.health -= bullet.damage || 1;
                bullets.splice(bulletIndex, 1);
                
                if (enemy.health <= 0) {
                    // Make sure to handle indices correctly after splicing
                    // It might be safer to mark for removal and clean up later
                    // Or iterate backwards
                    handleEnemyDeath(enemies[enemyIndex]); // Pass the actual enemy object
                    enemies.splice(enemyIndex, 1); 
                    // Decrement enemyIndex if iterating forwards? Or filter later.
                    // For now, assuming immediate removal is handled correctly by filter later
                }
            }
        });
    });

    // 敌机与玩家的碰撞检测
    if (!player.isInvincible) {
        enemies.forEach((enemy, index) => {
            if (
                player.x - player.width/2 < enemy.x + enemy.width &&
                player.x + player.width/2 > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
                let playerDamaged = false;
                if (enemy.type === 'boss') {
                    enemy.health -= 50;
                    if (enemy.health <= 0) {
                        handleEnemyDeath(enemies[index]);
                        enemies.splice(index, 1); 
                    } else {
                        playerDamaged = true; // Player takes damage even if boss survives
                    }
                } else {
                    enemies.splice(index, 1);
                    playerDamaged = true;
                }
                
                if (playerDamaged) {
                    if (gameState.hasShield) {
                        AudioController.playWithDebounce(powerUpSound, 100);
                        gameState.hasShield = false;
                    } else {
                        AudioController.playWithDebounce(playerHitSound, 100);
                        gameState.lives--;
                        player.isInvincible = true;
                        player.invincibleTimer = 0;
                        if (gameState.lives <= 0) {
                            gameOver();
                        }
                    }
                }
            }
        });
    }

    // 敌人子弹与玩家的碰撞检测
    if (!player.isInvincible) {
        enemyBullets.forEach((bullet, index) => {
            // More precise collision check for bullets (center-based?)
            // AABB is simpler for now
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
                    player.isInvincible = true;
                    player.invincibleTimer = 0;
                    if (gameState.lives <= 0) {
                        gameOver();
                    }
                }
            }
        });
    }
}

// 修改游戏信息显示
function drawGameInfo() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(10, 10, 180, 100);

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`得分: ${gameState.score}  关卡: ${gameState.level}`, 20, 45);
    
    if (gameState.bossSpawned && gameState.currentBoss) {
        const bossTextGradient = ctx.createLinearGradient( canvas.width/2 - 100, 80, canvas.width/2 + 100, 80 );
        bossTextGradient.addColorStop(0, '#ff0000');
        bossTextGradient.addColorStop(0.5, '#ff6666');
        bossTextGradient.addColorStop(1, '#ff0000');
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = bossTextGradient;
        ctx.textAlign = 'center';
        ctx.fillText('BOSS战', canvas.width/2, 85);
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.fillText('BOSS战', canvas.width/2, 85);
        ctx.shadowBlur = 0;
        // Restore text alignment for other info if needed
        ctx.textAlign = 'left';
    }
}

const pauseButton = document.getElementById('pauseButton');
function togglePause() {
    if (isPaused) {
        isPaused = false;
        if (pauseButton) pauseButton.innerText = '暂停';
        AudioController.fadeIn(backgroundMusic);
        gameLoop(); // Resume loop
    } else {
        isPaused = true;
        if (pauseButton) pauseButton.innerText = '继续';
        AudioController.fadeOut(backgroundMusic);
        [shootSound, hitSound, powerUpSound, playerHitSound, bossDeathSound].forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        cancelAnimationFrame(animationId);
        
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
         // Restore default alignment if needed
         ctx.textAlign = 'left';
    }
}

// 添加进入下一关的函数
function startNextLevel() {
    gameState.level++;
    console.log(`进入下一关: ${gameState.level}`);
    increaseGameDifficulty();
    showLevelIndicator(`第 ${gameState.level} 关`);
}

// 添加增加游戏难度的函数
function increaseGameDifficulty() {
    gameState.difficulty = 1 + 0.75 * (gameState.level - 1);
    enemySpawnBaseInterval = Math.max(200, Math.floor(1000 / gameState.difficulty));
    maxEnemies = Math.min(20, Math.floor(10 * gameState.difficulty));
    enemySpeedFactor = 1 + 0.1 * (gameState.level - 1);
    console.log(`关卡 ${gameState.level} 开始：基础难度=${gameState.difficulty.toFixed(2)}，间隔=${enemySpawnBaseInterval}，数量=${maxEnemies}，速度因子=${enemySpeedFactor.toFixed(2)}`);
    gameState.levelStartTime = Date.now();
    gameState.bossSpawned = false;
    gameState.currentBoss = null;
    enemies = [];
    enemyBullets = [];
    spawnEnemies(); // Restart spawner with new settings
}

// 添加武器升级特效
function showWeaponUpgradeEffect() {
    const text = `武器等级 ${gameState.weaponLevel > 12 ? '12 (射速提升)' : gameState.weaponLevel}`;
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const gradient = ctx.createLinearGradient(x - 150, y, x + 150, y);
    gradient.addColorStop(0, '#44ff44');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, '#44ff44');
    
    // Temporary effect drawing (might need a better system)
    // Store effect details and draw in gameLoop?
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 15;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
    
    // Make it fade out?
    // setTimeout(() => { /* clear effect */ }, 1000);
}

// 添加游戏结束函数
function gameOver() {
    isPaused = true;
    cancelAnimationFrame(animationId);
    AudioController.stopAll();
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width/2, canvas.height/2 - 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${gameState.score}`, canvas.width/2, canvas.height/2);
    ctx.fillText(`达到等级: ${gameState.level}`, canvas.width/2, canvas.height/2 + 40);
    ctx.font = '20px Arial';
    ctx.fillText('按空格键重新开始', canvas.width/2, canvas.height/2 + 100);
    ctx.textAlign = 'left'; // Reset alignment

    // Event listener handled in main.js
}

// 添加重置游戏函数
function resetGame() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (enemySpawnTimer) {
        clearInterval(enemySpawnTimer);
        enemySpawnTimer = null;
    }

    gameState = {
        level: 1, score: 0, lives: 3, maxLives: 5,
        difficulty: 1, powerUpActive: false, powerUpTimer: null,
        weaponLevel: 1, hasShield: false, shieldTimer: null,
        levelStartTime: Date.now(), bossSpawned: false, currentBoss: null
    };

    bullets = [];
    enemies = [];
    powerUps = [];
    enemyBullets = [];

    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.normalShootingSpeed = player.baseNormalShootingSpeed;
    player.missileShootingSpeed = player.baseMissileShootingSpeed;
    player.isInvincible = false;
    player.invincibleTimer = 0;

    increaseGameDifficulty(); // This also calls spawnEnemies()

    AudioController.stopAll();
    backgroundMusic.currentTime = 0;
    // Delay playback slightly or rely on user interaction if needed
    backgroundMusic.play().catch(e => console.log('等待交互播放背景音乐', e));

    isPaused = false;
    if (pauseButton) pauseButton.textContent = '暂停';

    hideLevelIndicator();

     if (!animationId) {
        gameLoop();
     }
}

// 添加用于显示和隐藏关卡指示器的函数
let levelIndicatorTimeout = null;
const levelIndicator = document.getElementById('levelIndicator'); // Get element once

function showLevelIndicator(text) {
    if (!levelIndicator) return;
    levelIndicator.textContent = text;
    levelIndicator.style.display = 'block';
    if (levelIndicatorTimeout) clearTimeout(levelIndicatorTimeout);
    levelIndicatorTimeout = setTimeout(hideLevelIndicator, 2000);
}

function hideLevelIndicator() {
    if (!levelIndicator) return;
    levelIndicator.style.display = 'none';
    if (levelIndicatorTimeout) {
        clearTimeout(levelIndicatorTimeout);
        levelIndicatorTimeout = null;
    }
} 