const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

let mouseX = w / 2;
let mouseY = h / 2;
let isMouseDown = false;
let time = 0;

// ============================================================
// STATE MACHINE
// ============================================================
const STATES = {
    GATHER: 0,
    EXPLOSION: 1,
    HEART: 2,
    EXPLOSION2: 3,
    LOVE_TEXT: 4,
    EXPLOSION3: 5,
    REPEAT: 6
};

let currentState = STATES.GATHER;
let stateTimer = 0;
let stateDuration = 3; // seconds per state
let stateDisplay = document.getElementById('state-display');
let timerDisplay = document.getElementById('timer-display');

const stateNames = {
    0: '🌈 GATHER',
    1: '💥 EXPLOSION',
    2: '❤️ HEART',
    3: '💥 EXPLOSION',
    4: '💖 I LOVE YOU',
    5: '💥 EXPLOSION',
    6: '🔄 REPEAT'
};

// ============================================================
// CAMERA SHAKE
// ============================================================
let shakeX = 0;
let shakeY = 0;
let shakeIntensity = 0;

// ============================================================
// SHOCKWAVE
// ============================================================
let shockwave = {
    active: false,
    x: 0,
    y: 0,
    radius: 0,
    maxRadius: 0,
    alpha: 0
};

// ============================================================
// HEART BEAT
// ============================================================
let heartBeat = 0;
let heartScale = 1;

// ============================================================
// TEXT FADE
// ============================================================
let textFade = 0;
let textAlpha = 0;

// ============================================================
// PARTICLE SYSTEM
// ============================================================
const PARTICLE_COUNT = 8000;
const particles = [];
const colorPalettes = [
    { colors: [[72, 219, 251], [100, 200, 255], [50, 180, 255]], name: 'xanh dương' },
    { colors: [[255, 150, 200], [255, 100, 180], [255, 50, 150]], name: 'hồng' },
    { colors: [[180, 130, 255], [150, 100, 255], [200, 150, 255]], name: 'tím' },
    { colors: [[255, 200, 100], [255, 180, 50], [255, 220, 150]], name: 'vàng' },
    { colors: [[100, 255, 200], [50, 255, 180], [150, 255, 220]], name: 'xanh ngọc' },
    { colors: [[255, 100, 100], [255, 50, 50], [200, 80, 80]], name: 'đỏ' },
    { colors: [[100, 200, 255], [180, 130, 255], [255, 150, 200]], name: 'tím hồng' },
    { colors: [[50, 255, 150], [100, 255, 200], [200, 255, 100]], name: 'xanh lá' },
];

// ============================================================
// TARGET POINTS
// ============================================================
let targetPoints = [];
let heartPoints = [];
let lovePoints = [];

// ============================================================
// CREATE HEART POINTS
// ============================================================
function createHeartPoints(count = 300) {
    const points = [];
    const scale = 0.8;
    const offsetX = w / 2;
    const offsetY = h / 2;
    
    for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.8 + 0.2;
        
        // Công thức trái tim
        const x = 16 * Math.pow(Math.sin(t), 3) * scale * r;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * scale * r;
        
        points.push({
            x: offsetX + x * 12,
            y: offsetY + y * 12
        });
    }
    return points;
}

// ============================================================
// CREATE TEXT POINTS "I LOVE YOU"
// ============================================================
function createTextPoints(text = "I LOVE YOU", count = 500) {
    const points = [];
    const fontSize = 100;
    const offscreen = document.createElement('canvas');
    offscreen.width = 800;
    offscreen.height = 300;
    const offCtx = offscreen.getContext('2d');
    
    offCtx.fillStyle = '#fff';
    offCtx.font = `bold ${fontSize}px Arial`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(text, 400, 150);
    
    const imageData = offCtx.getImageData(0, 0, 800, 300);
    const data = imageData.data;
    
    const step = 3;
    const centerX = w / 2 - 400;
    const centerY = h / 2 - 150;
    
    for (let y = 0; y < 300; y += step) {
        for (let x = 0; x < 800; x += step) {
            const index = (y * 800 + x) * 4;
            if (data[index] > 128) {
                points.push({
                    x: centerX + x + (Math.random() - 0.5) * 5,
                    y: centerY + y + (Math.random() - 0.5) * 5
                });
            }
        }
    }
    
    return points;
}

// ============================================================
// CREATE GATHER POINTS
// ============================================================
function createGatherPoints() {
    const points = [];
    const count = particles.length;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 50 + Math.random() * 300;
        points.push({
            x: w / 2 + Math.cos(angle) * radius,
            y: h / 2 + Math.sin(angle) * radius * 0.5
        });
    }
    return points;
}

// ============================================================
// MORPH FUNCTION
// ============================================================
function morph(targetPoints) {
    for (let i = 0; i < particles.length; i++) {
        if (i < targetPoints.length) {
            const target = targetPoints[i];
            // Thêm hiệu ứng nổ khi di chuyển
            const explosionOffset = currentState === STATES.EXPLOSION || 
                                   currentState === STATES.EXPLOSION2 || 
                                   currentState === STATES.EXPLOSION3 ? 200 : 0;
            
            particles[i].targetX = target.x + (Math.random() - 0.5) * explosionOffset;
            particles[i].targetY = target.y + (Math.random() - 0.5) * explosionOffset;
            particles[i].isInTarget = true;
        }
    }
}

// ============================================================
// EXPLODE FUNCTION
// ============================================================
function explode() {
    const centerX = w / 2;
    const centerY = h / 2;
    const power = 300 + Math.random() * 200;
    
    // Kích hoạt shockwave
    shockwave.active = true;
    shockwave.x = centerX;
    shockwave.y = centerY;
    shockwave.radius = 10;
    shockwave.maxRadius = Math.max(w, h) * 0.8;
    shockwave.alpha = 1;
    
    // Rung màn hình
    shakeIntensity = 15 + Math.random() * 20;
    
    for (const p of particles) {
        const angle = Math.atan2(p.y - centerY, p.x - centerX);
        const distance = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
        const force = power * (1 + Math.random() * 0.5) / (distance + 50);
        
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
        p.targetX = p.x + (Math.random() - 0.5) * 600;
        p.targetY = p.y + (Math.random() - 0.5) * 600;
    }
}

// ============================================================
// PARTICLE CLASS
// ============================================================
class Particle {
    constructor() {
        this.reset();
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.phase = Math.random() * Math.PI * 2;
        this.sizeBase = Math.random() * 2 + 0.5;
        
        const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        this.colorSet = palette.colors[Math.floor(Math.random() * palette.colors.length)];
        this.paletteName = palette.name;
        
        this.hueOffset = Math.random() * 360;
        this.twinkleSpeed = 0.5 + Math.random() * 1.5;
        this.twinkleOffset = Math.random() * Math.PI * 2;
        this.orbitRadius = 50 + Math.random() * 150;
        this.orbitSpeed = 0.0001 + Math.random() * 0.0003;
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.isInTarget = false;
        
        // Trail
        this.trail = [];
        this.maxTrail = 8 + Math.floor(Math.random() * 10);
    }

    reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 0.5;
        this.targetX = this.x;
        this.targetY = this.y;
        this.life = 1;
        this.trail = [];
    }

    update() {
        time += 0.01;
        
        // Lưu trail
        if (this.trail.length < this.maxTrail) {
            this.trail.push({x: this.x, y: this.y});
        } else {
            this.trail.shift();
            this.trail.push({x: this.x, y: this.y});
        }
        
        // Lực hút về đích
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
            const force = this.isInTarget ? 0.02 : 0.005;
            this.vx += dx * force + (Math.random() - 0.5) * 0.02;
            this.vy += dy * force + (Math.random() - 0.5) * 0.02;
        }

        // Ma sát
        this.vx *= 0.94;
        this.vy *= 0.94;

        // Giới hạn tốc độ
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 6) {
            this.vx = (this.vx / speed) * 6;
            this.vy = (this.vy / speed) * 6;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Kích thước thay đổi theo tốc độ và nhấp nháy
        const twinkle = 0.6 + 0.4 * Math.sin(time * this.twinkleSpeed + this.twinkleOffset);
        const speedFactor = Math.min(speed / 3, 1);
        this.size = this.sizeBase * (0.5 + 0.5 * twinkle) + speedFactor * 1.5;
        this.glowIntensity = Math.min(1, speed / 2 + 0.3);
    }

    draw() {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const alpha = Math.min(0.8 + speed / 4, 1);
        const twinkle = 0.6 + 0.4 * Math.sin(time * this.twinkleSpeed + this.twinkleOffset);
        const finalAlpha = alpha * twinkle;

        let r, g, b;
        if (this.colorSet) {
            [r, g, b] = this.colorSet;
            const shift = Math.sin(time * 0.01 + this.hueOffset * 0.01) * 20;
            r = Math.max(0, Math.min(255, r + shift));
            g = Math.max(0, Math.min(255, g + shift * 0.3));
            b = Math.max(0, Math.min(255, b - shift * 0.5));
        } else {
            const hue = (this.hueOffset + time * 0.1) % 360;
            const color = `hsla(${hue}, 100%, 70%, ${finalAlpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowBlur = this.size * 5 * this.glowIntensity;
            ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${finalAlpha * 0.5})`;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Trail
            if (this.trail.length > 2) {
                for (let i = 1; i < this.trail.length; i++) {
                    const t = i / this.trail.length;
                    ctx.beginPath();
                    ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${finalAlpha * t * 0.3})`;
                    ctx.lineWidth = this.size * t;
                    ctx.stroke();
                }
            }
            return;
        }

        // Vẽ hạt với glow
        const glowSize = this.size * (2 + this.glowIntensity * 3);
        const grad = ctx.createRadialGradient(
            this.x - this.size * 0.3,
            this.y - this.size * 0.3,
            0,
            this.x, this.y, glowSize
        );
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${finalAlpha * 0.9})`);
        grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${finalAlpha * 0.4})`);
        grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${finalAlpha * 0.1})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Hạt nhân sáng
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha * 0.6})`;
        ctx.shadowBlur = this.size * 2;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${finalAlpha * 0.3})`;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Trail
        if (this.trail.length > 2 && speed > 0.5) {
            for (let i = 1; i < this.trail.length; i++) {
                const t = i / this.trail.length;
                ctx.beginPath();
                ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${finalAlpha * t * 0.3})`;
                ctx.lineWidth = this.size * t * 0.8;
                ctx.stroke();
            }
        }
    }
}

// ============================================================
// STARS BACKGROUND
// ============================================================
const stars = [];
for (let i = 0; i < 200; i++) {
    stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.5,
        floatX: (Math.random() - 0.5) * 0.2,
        floatY: (Math.random() - 0.5) * 0.2,
        baseX: Math.random() * w,
        baseY: Math.random() * h
    });
}

function drawStars() {
    for (const star of stars) {
        star.x += Math.sin(time * 0.1 + star.twinkle) * star.floatX;
        star.y += Math.cos(time * 0.08 + star.twinkle) * star.floatY;
        
        const alpha = 0.3 + 0.3 * Math.sin(time * star.speed + star.twinkle);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        
        const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
        grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
    }
}

// ============================================================
// BACKGROUND NEBULA
// ============================================================
function drawNebula() {
    const grad = ctx.createRadialGradient(
        w/2 + Math.sin(time * 0.005) * 200,
        h/2 + Math.cos(time * 0.007) * 150,
        0,
        w/2, h/2,
        Math.max(w, h) * 0.6
    );
    grad.addColorStop(0, `rgba(72, 219, 251, ${0.02 + 0.01 * Math.sin(time * 0.01)})`);
    grad.addColorStop(0.3, `rgba(180, 130, 255, ${0.015 + 0.01 * Math.cos(time * 0.008)})`);
    grad.addColorStop(0.7, `rgba(255, 100, 150, ${0.01 + 0.005 * Math.sin(time * 0.006)})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

// ============================================================
// SHOCKWAVE
// ============================================================
function drawShockwave() {
    if (!shockwave.active) return;
    
    shockwave.radius += 15;
    shockwave.alpha *= 0.97;
    
    if (shockwave.radius > shockwave.maxRadius || shockwave.alpha < 0.01) {
        shockwave.active = false;
        return;
    }
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${shockwave.alpha * 0.3})`;
    ctx.lineWidth = 3 * shockwave.alpha;
    ctx.stroke();
    
    // Inner glow
    const grad = ctx.createRadialGradient(
        shockwave.x, shockwave.y, 0,
        shockwave.x, shockwave.y, shockwave.radius
    );
    grad.addColorStop(0, `rgba(255, 255, 255, ${shockwave.alpha * 0.05})`);
    grad.addColorStop(0.5, `rgba(72, 219, 251, ${shockwave.alpha * 0.1})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
    ctx.fill();
}

// ============================================================
// HEART BEAT EFFECT
// ============================================================
function drawHeartBeat() {
    if (currentState !== STATES.HEART) return;
    
    heartBeat += 0.02;
    const beat = Math.abs(Math.sin(heartBeat * 2)) * 0.1 + 0.9;
    heartScale = beat;
    
    // Vẽ trái tim lớn phía sau
    const cx = w / 2;
    const cy = h / 2 - 30;
    const scale = 1.2 * heartScale;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    
    const grad = ctx.createRadialGradient(0, -20, 0, 0, 0, 80);
    grad.addColorStop(0, `rgba(255, 50, 80, ${0.05 + 0.03 * Math.sin(heartBeat * 2)})`);
    grad.addColorStop(0.5, `rgba(255, 50, 80, ${0.03 + 0.02 * Math.sin(heartBeat * 2)})`);
    grad.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// ============================================================
// BLOOM / GLOW EFFECT
// ============================================================
function drawBloom() {
    // Tạo hiệu ứng bloom bằng cách vẽ overlay mờ
    const grad = ctx.createRadialGradient(
        w/2, h/2, 0,
        w/2, h/2, Math.max(w, h) * 0.4
    );
    
    const intensity = 0.02 + 0.01 * Math.sin(time * 0.005);
    grad.addColorStop(0, `rgba(255, 200, 255, ${intensity})`);
    grad.addColorStop(0.3, `rgba(200, 150, 255, ${intensity * 0.5})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

// ============================================================
// FLOATING STARS
// ============================================================
const floatingStars = [];
for (let i = 0; i < 50; i++) {
    floatingStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.2 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2,
        radius: 20 + Math.random() * 50,
        centerX: Math.random() * w,
        centerY: Math.random() * h,
        alpha: 0.2 + Math.random() * 0.3
    });
}

function drawFloatingStars() {
    for (const star of floatingStars) {
        star.angle += star.speed * 0.01;
        star.x = star.centerX + Math.cos(star.angle) * star.radius;
        star.y = star.centerY + Math.sin(star.angle * 0.7) * star.radius * 0.5;
        
        const alpha = star.alpha * (0.5 + 0.5 * Math.sin(star.angle + time * 0.01));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowBlur = star.size * 3;
        ctx.shadowColor = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================================
// INITIALIZE
// ============================================================
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}

// Tạo target points
heartPoints = createHeartPoints(particles.length);
lovePoints = createTextPoints("I LOVE YOU", particles.length);
let gatherPoints = createGatherPoints();
targetPoints = gatherPoints;

// ============================================================
// STATE MACHINE
// ============================================================
function updateState() {
    stateTimer += 1/60; // mỗi frame
    
    if (stateTimer > stateDuration) {
        stateTimer = 0;
        
        switch (currentState) {
            case STATES.GATHER:
                currentState = STATES.EXPLOSION;
                stateDuration = 1;
                explode();
                break;
                
            case STATES.EXPLOSION:
                currentState = STATES.HEART;
                stateDuration = 4;
                // Morph to heart
                targetPoints = heartPoints;
                morph(targetPoints);
                // Reset heart beat
                heartBeat = 0;
                break;
                
            case STATES.HEART:
                currentState = STATES.EXPLOSION2;
                stateDuration = 1;
                explode();
                break;
                
            case STATES.EXPLOSION2:
                currentState = STATES.LOVE_TEXT;
                stateDuration = 5;
                // Morph to text
                targetPoints = lovePoints;
                morph(targetPoints);
                textFade = 0;
                textAlpha = 0;
                break;
                
            case STATES.LOVE_TEXT:
                currentState = STATES.EXPLOSION3;
                stateDuration = 1;
                explode();
                break;
                
            case STATES.EXPLOSION3:
                currentState = STATES.REPEAT;
                stateDuration = 0.5;
                break;
                
            case STATES.REPEAT:
                currentState = STATES.GATHER;
                stateDuration = 3;
                targetPoints = gatherPoints;
                morph(targetPoints);
                break;
        }
        
        // Update display
        if (stateDisplay) {
            stateDisplay.textContent = `🎯 ${stateNames[currentState]}`;
        }
    }
    
    // Timer display
    if (timerDisplay) {
        const remaining = Math.max(0, stateDuration - stateTimer);
        timerDisplay.textContent = `⏱️ ${remaining.toFixed(1)}s`;
    }
}

// ============================================================
// CAMERA SHAKE
// ============================================================
function updateShake() {
    if (shakeIntensity > 0) {
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.95;
        if (shakeIntensity < 0.1) {
            shakeIntensity = 0;
            shakeX = 0;
            shakeY = 0;
        }
    }
}

// ============================================================
// TEXT FADE
// ============================================================
function updateTextFade() {
    if (currentState === STATES.LOVE_TEXT) {
        textAlpha = Math.min(1, textAlpha + 0.005);
    } else {
        textAlpha = Math.max(0, textAlpha - 0.005);
    }
}

// ============================================================
// DRAW TEXT "I LOVE YOU"
// ============================================================
function drawLoveText() {
    if (textAlpha < 0.01) return;
    
    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.shadowBlur = 50;
    ctx.shadowColor = 'rgba(255, 100, 150, 0.3)';
    
    // Vẽ chữ to ở giữa
    const fontSize = Math.min(w, h) * 0.12;
    ctx.font = `bold ${fontSize}px 'Arial', 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Gradient text
    const grad = ctx.createLinearGradient(w/2 - 200, h/2, w/2 + 200, h/2);
    grad.addColorStop(0, '#ff6b9d');
    grad.addColorStop(0.3, '#ff4d7a');
    grad.addColorStop(0.5, '#ff2d55');
    grad.addColorStop(0.7, '#ff4d7a');
    grad.addColorStop(1, '#ff6b9d');
    ctx.fillStyle = grad;
    
    // Phát sáng
    ctx.shadowBlur = 80;
    ctx.shadowColor = 'rgba(255, 45, 85, 0.5)';
    
    // Đổ bóng
    ctx.shadowColor = 'rgba(255, 45, 85, 0.3)';
    ctx.shadowBlur = 100;
    ctx.fillText('💖 I LOVE YOU 💖', w/2, h/2);
    
    // Thêm glow phụ
    ctx.shadowBlur = 150;
    ctx.shadowColor = 'rgba(255, 45, 85, 0.2)';
    ctx.fillText('💖 I LOVE YOU 💖', w/2, h/2);
    
    ctx.restore();
}

// ============================================================
// MAIN ANIMATION
// ============================================================
function animate() {
    // Background
    ctx.fillStyle = "rgba(5, 8, 15, 0.15)";
    ctx.fillRect(0, 0, w, h);
    
    // Draw background nebula
    drawNebula();
    
    // Draw floating stars
    drawFloatingStars();
    
    // Draw background stars
    drawStars();
    
    // Update state machine
    updateState();
    
    // Update text fade
    updateTextFade();
    
    // Update camera shake
    updateShake();
    
    // Apply shake
    ctx.save();
    ctx.translate(shakeX, shakeY);
    
    // Update và vẽ particles
    for (const p of particles) {
        p.update();
        p.draw();
    }
    
    // Draw shockwave
    drawShockwave();
    
    // Draw heart beat
    drawHeartBeat();
    
    // Draw bloom
    drawBloom();
    
    // Draw love text
    drawLoveText();
    
    ctx.restore();
    
    // Hiển thị trạng thái
    if (stateDisplay) {
        stateDisplay.textContent = `❤️ ${stateNames[currentState]}`;
    }
    
    requestAnimationFrame(animate);
}

// ============================================================
// RESIZE HANDLER
// ============================================================
window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    mouseX = w / 2;
    mouseY = h / 2;
    
    // Recreate target points
    heartPoints = createHeartPoints(particles.length);
    lovePoints = createTextPoints("I LOVE YOU", particles.length);
    gatherPoints = createGatherPoints();
    targetPoints = gatherPoints;
});

// ============================================================
// START
// ============================================================
console.log('💖 I LOVE YOU - Hiệu ứng trái tim');
console.log('State Machine: GATHER → EXPLOSION → HEART → EXPLOSION → I LOVE YOU → EXPLOSION → REPEAT');

animate();
