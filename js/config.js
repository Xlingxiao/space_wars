const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 设置画布尺寸为更合适的尺寸
canvas.width = 400;
canvas.height = 800;

// 修改BOSS相关的常量和状态
const BOSS_STATES = {
    ENTER: 'enter',
    IDLE: 'idle',
    ATTACK1: 'attack1',
    ATTACK2: 'attack2',
    ATTACK3: 'attack3'
}; 