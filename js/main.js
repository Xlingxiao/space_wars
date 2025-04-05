// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape') {
        togglePause();
    }
    // Restart listener (will be added conditionally in gameOver)
});

window.addEventListener('keyup', (e) => keys[e.code] = false);

// Pause button listener
if (pauseButton) { // Check if button exists
    pauseButton.addEventListener('click', togglePause);
}

// Pause button styling (moved from original script.js)
function createPauseButton() {
    const btn = document.getElementById('pauseButton'); // Use local var
    if (!btn) return;

    btn.style.position = 'absolute';
    btn.style.right = '20px';
    btn.style.top = '20px';
    btn.style.padding = '8px 20px';
    btn.style.fontSize = '16px';
    btn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    btn.style.color = 'white';
    btn.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    btn.style.borderRadius = '20px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.3s ease';
    btn.style.outline = 'none';
    btn.style.zIndex = '1000';
    btn.style.fontFamily = 'Arial, sans-serif';
    btn.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    btn.style.backdropFilter = 'blur(5px)';
    btn.style.webkitBackdropFilter = 'blur(5px)';
    btn.style.width = '80px';
    btn.style.textAlign = 'center';

    btn.onmouseover = () => {
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        btn.style.transform = 'scale(1.05)';
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        btn.style.transform = 'scale(1)';
    };
}

// Audio event handling (Optimization)
[backgroundMusic, shootSound, hitSound, powerUpSound, playerHitSound, bossDeathSound].forEach(audio => {
    audio.addEventListener('error', (e) => {
        console.error('音频加载错误:', e);
    });
    // Ensure audio stops if paused while playing
    audio.addEventListener('play', () => {
        if (isPaused) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
});

// Game Over restart listener setup (moved from gameOver)
function setupRestartListener() {
    const restartHandler = (e) => {
        if (e.code === 'Space') {
            window.removeEventListener('keydown', restartHandler); // Clean up listener
            resetGame(); 
        }
    };
    // Remove previous listener if any, then add the new one
    window.removeEventListener('keydown', restartHandler); 
    window.addEventListener('keydown', restartHandler);
}

// Modify gameOver to call the setup function
function gameOver() {
    isPaused = true;
    cancelAnimationFrame(animationId);
    AudioController.stopAll();
    
    // Draw game over screen (as before)
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

    // Setup the listener to wait for Spacebar
    setupRestartListener();
}


// Initial setup calls
createPauseButton();
resetGame(); // Start the game 