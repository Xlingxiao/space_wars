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
             // Draw centered missile
            const bodyGradient = ctx.createLinearGradient(0, -this.height/2, 0, this.height/2);
            bodyGradient.addColorStop(0, '#0066cc');
            bodyGradient.addColorStop(0.5, '#4488dd');
            bodyGradient.addColorStop(1, '#0044aa');

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
            ctx.fillStyle = '#0055bb';
            ctx.fill();

            // 导弹尾焰
            const flameHeight = 20 + Math.random() * 5;
            const flameGradient = ctx.createLinearGradient(0, this.height/2, 0, this.height/2 + flameHeight);
            flameGradient.addColorStop(0, '#ff4400');
            flameGradient.addColorStop(0.5, '#ff8800');
            flameGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');

            ctx.fillStyle = flameGradient;
            ctx.beginPath();
            ctx.moveTo(-this.width/4, this.height/2);
            ctx.lineTo(0, this.height/2 + flameHeight);
            ctx.lineTo(this.width/4, this.height/2);
            ctx.closePath();
            ctx.fill();

            // 光晕
            ctx.shadowColor = '#66aaff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(50, 150, 255, 0.2)';
            ctx.fill();
        }
        ctx.restore();
    }


    update() {
        if (this.type === 'normal') {
            // Move based on the stored angle
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            // Update rotation angle for drawing to match movement angle
            // Need to add PI/2 because 0 radians is right, -PI/2 is up
            this.rotationAngle = this.angle + Math.PI/2;
        } else if (this.type === 'missile') {
            this.lifetime++;

            // Check if target exists, is alive, and is still in the enemies array
            const targetIsValid = this.targetEnemy && this.targetEnemy.health > 0 && enemies.includes(this.targetEnemy);

            if (!targetIsValid || this.lifetime > this.maxLifetime / 2) {
                // Fly straight up (relative to current orientation)
                const straightAngle = -Math.PI / 2;
                const angleDiff = straightAngle - this.angle;
                const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                // Gradually turn towards straight up
                this.angle += normalizedDiff * this.turnSpeed * 0.5;

                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.rotationAngle = this.angle + Math.PI / 2;
            } else {
                // Track target
                const dx = this.targetEnemy.x + this.targetEnemy.width/2 - (this.x + this.width/2);
                const dy = this.targetEnemy.y + this.targetEnemy.height/2 - (this.y + this.height/2);
                const targetAngle = Math.atan2(dy, dx);

                const angleDiff = targetAngle - this.angle;
                const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                this.angle += Math.max(-this.turnSpeed, Math.min(this.turnSpeed, normalizedDiff));

                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.rotationAngle = this.angle + Math.PI / 2;
            }
        }
    }
} 