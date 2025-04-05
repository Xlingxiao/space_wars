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