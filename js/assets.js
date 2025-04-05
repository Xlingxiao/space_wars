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
        audio.play().catch(e => console.error('音频播放失败（渐入）:', e)); // Added error handling
        
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