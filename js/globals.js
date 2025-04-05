// 添加星星数组
const stars = Array.from({length: 100}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 2 + 1
}));

let keys = {};

// 修改游戏状态对象
let gameState = {
    level: 1,
    score: 0,
    lives: 3,
    maxLives: 5,
    difficulty: 1, // Initial difficulty factor
    powerUpActive: false,
    powerUpTimer: null,
    weaponLevel: 1, // Start at weapon level 1
    hasShield: false,
    shieldTimer: null,
    levelStartTime: Date.now(), // Initialize level start time
    bossSpawned: false,
    currentBoss: null
};

let isPaused = false; // 暂停状态标志
let animationId = null; // 新增变量用于存储动画帧ID

// 添加全局变量 (Difficulty related)
let enemySpawnBaseInterval = 1000; // 基础敌人生成间隔（毫秒）
let maxEnemies = 10; // 屏幕上最大敌人数量
let enemySpeedFactor = 1; // 敌人速度因子

// Global arrays for game objects
let bullets = [];
let enemies = [];
let powerUps = [];
let enemyBullets = []; 