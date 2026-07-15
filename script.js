const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ============================================================
// ✅ 1. Thêm biến isMobile
// ============================================================
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// ============================================================
// ✅ 2. Đổi PARTICLE_COUNT
// ============================================================
const PARTICLE_COUNT = isMobile ? 4500 : 10000;

// ============================================================
// ✅ 3. Thay cách tạo Canvas
// ============================================================
const dpr = Math.min(window.devicePixelRatio, 2);

canvas.width = window.innerWidth * dpr;
canvas.height = window.innerHeight * dpr;
canvas.style.width = window.innerWidth + "px";
canvas.style.height = window.innerHeight + "px";

ctx.scale(dpr, dpr);

let w = window.innerWidth;
let h = window.innerHeight;

let time = 0;

// ============================================================
// ✅ 4. Sửa phần resize()
// ============================================================
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    w = window.innerWidth;
    h = window.innerHeight;
    
    if (typeof heartPoints !== 'undefined') {
        heartPoints = createHeartPoints(PARTICLE_COUNT);
        textPoints = createTextPoints("I LOVE YOU", PARTICLE_COUNT);
        gatherPoints = createGatherPoints(PARTICLE_COUNT);
    }
});

// ============================================================
// STATE MACHINE
// ============================================================
const STATE = {
    GATHER: 0,
    EXPLOSION: 1,
    HEART: 2,
    TEXT: 3
};

let currentState = STATE.GATHER;
let stateTimer = 0;
let stateDuration = 3;
let nextStateTimer = 0;

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
// CAMERA SHAKE
// ============================================================
let shakeX = 0;
let shakeY = 0;
let shakeIntensity = 0;

// ============================================================
// TARGET POINTS
// ============================================================
let heartPoints = [];
let textPoints = [];
let gatherPoints = [];
let currentTargets = [];

// ============================================================
// ✅ 13. createHeartPoints() - to hơn
// ============================================================
function createHeartPoints(count) {
    const points = [];
    const scale = 0.8;
    const offsetX = w / 2;
    const offsetY = h / 2 - 20;
    
    for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.8 + 0.2;
        
        const x = 16 * Math.pow(Math.sin(t), 3) * scale * r;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * scale * r;
        
        points.push({
            x: offsetX + x * 13,
            y: offsetY + y * 13
        });
    }
    return points;
}

// ============================================================
// ✅ 14. createTextPoints() - responsive
// ============================================================
function createTextPoints(text, count) {
    const points = [];
    const fontSize = isMobile ? 55 : 80;
    const offscreen = document.createElement('canvas');
    offscreen.width = 800;
    offscreen.height = 250;
    const offCtx = offscreen.getContext('2d');
    
    offCtx.fillStyle = '#fff';
    offCtx.font = `bold ${fontSize}px Arial`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText(text, 400, 125);
    
    const imageData = offCtx.getImageData(0, 0, 800, 250);
    const data = imageData.data;
    
    const step = 3;
    const centerX = w / 2 - 400;
    const centerY = h / 2 - 125;
    
    for (let y = 0; y < 250; y += step) {
        for (let x = 0; x < 800; x += step) {
            const index = (y * 800 + x) * 4;
            if (data[index] > 128) {
                points.push({
                    x: centerX + x + (Math.random() - 0.5) * 4,
                    y: centerY + y + (Math.random() - 0.5) * 4
                });
            }
        }
    }
    
    return points;
}

// ============================================================
// CREATE GATHER POINTS
// ============================================================
function createGatherPoints(count) {
    const points = [];
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
            particles[i].targetX = target.x;
            particles[i].targetY = target.y;
            particles[i].isInTarget = true;
        }
    }
}

// ============================================================
// ✅ 9. EXPLODE - điều chỉnh power
// ============================================================
function explode() {
    const centerX = w / 2;
    const centerY = h / 2;
    const power = isMobile ? 220 : 350;
    
    shockwave.active = true;
    shockwave.x = centerX;
    shockwave.y = centerY;
    shockwave.radius = 10;
    shockwave.maxRadius = Math.max(w, h) * 0.7;
    shockwave.alpha = 1;
    
    shakeIntensity = isMobile ? 10 : 20;
    
    for (const p of particles) {
        const angle = Math.atan2(p.y - centerY, p.x - centerX);
        const distance = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
        const force = power * (1 + Math.random() * 0.5) / (distance + 50);
        
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
        p.targetX = p.x + (Math.random() - 0.5) * 400;
        p.targetY = p.y + (Math.random() - 0.5) * 400;
        p.isInTarget = false;
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
        this.hue = Math.random() * 360;
        this.sizeBase = Math.random() * 2 + 0.5;
        this.twinkleSpeed = 0.5 + Math.random() * 1.5;
        this.twinkleOffset = Math.random() * Math.PI * 2;
        this.isInTarget = false;
    }

    reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.targetX = w / 2 + (Math.random() - 0.5) * 200;
        this.targetY = h / 2 + (Math.random() - 0.5) * 200;
        this.vx = 0;
        this.vy = 0;
        this.size = Math.random() * 2 + 0.5;
        this.hue = Math.random() * 360;
        this.life = 1;
    }

    update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
            // ✅ 6. Tăng force
            const force = this.isInTarget ? 0.035 : 0.006;
            this.vx += dx * force + (Math.random() - 0.5) * 0.01;
            this.vy += dy * force + (Math.random() - 0.5) * 0.01;
        }

        this.vx *= 0.94;
        this.vy *= 0.94;

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 6) {
            this.vx = (this.vx / speed) * 6;
            this.vy = (this.vy / speed) * 6;
        }

        this.x += this.vx;
        this.y += this.vy;
        
        this.hue += 0.02;
        
        const twinkle = 0.7 + 0.3 * Math.sin(time * this.twinkleSpeed + this.twinkleOffset);
        const speedFactor = Math.min(speed / 3, 1);
        this.size = this.sizeBase * twinkle + speedFactor * 1.5;
    }

    draw() {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const alpha = Math.min(0.7 + speed / 4, 1);
        const hue = (this.hue + time * 0.05) % 360;
        
        const color = `hsla(${hue}, 100%, 70%, ${alpha})`;
        
        const glowSize = this.size * (2 + speed * 0.5);
        const grad = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, glowSize
        );
        grad.addColorStop(0, `hsla(${hue}, 100%, 90%, ${alpha * 0.5})`);
        grad.addColorStop(0.3, `hsla(${hue}, 100%, 70%, ${alpha * 0.2})`);
        grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 95%, ${alpha * 0.8})`;
        
        // ✅ 7. Shadow Blur - responsive
        ctx.shadowBlur = isMobile ? this.size : this.size * 3;
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha * 0.3})`;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================================
// INITIALIZE
// ============================================================
const particles = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}

heartPoints = createHeartPoints(PARTICLE_COUNT);
textPoints = createTextPoints("I LOVE YOU", PARTICLE_COUNT);
gatherPoints = createGatherPoints(PARTICLE_COUNT);
currentTargets = gatherPoints;
morph(currentTargets);

// ============================================================
// ✅ 8. SHOCKWAVE - responsive
// ============================================================
function drawShockwave() {
    if (!shockwave.active) return;
    
    shockwave.radius += isMobile ? 8 : 12;
    shockwave.alpha *= 0.96;
    
    if (shockwave.radius > shockwave.maxRadius || shockwave.alpha < 0.01) {
        shockwave.active = false;
        return;
    }
    
    ctx.beginPath();
    ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${shockwave.alpha * 0.3})`;
    ctx.lineWidth = 3 * shockwave.alpha;
    ctx.shadowBlur = 30;
    ctx.shadowColor = `rgba(255, 255, 255, ${shockwave.alpha * 0.2})`;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    const grad = ctx.createRadialGradient(
        shockwave.x, shockwave.y, 0,
        shockwave.x, shockwave.y, shockwave.radius
    );
    grad.addColorStop(0, `rgba(255, 255, 255, ${shockwave.alpha * 0.1})`);
    grad.addColorStop(0.5, `rgba(150, 200, 255, ${shockwave.alpha * 0.05})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(shockwave.x, shockwave.y, shockwave.radius, 0, Math.PI * 2);
    ctx.fill();
}

// ============================================================
// ✅ 5. STARS - responsive
// ============================================================
const STAR_COUNT = isMobile ? 80 : 200;
const stars = [];
for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.5 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.5
    });
}

function drawStars() {
    for (const star of stars) {
        const alpha = 0.3 + 0.3 * Math.sin(time * star.speed + star.twinkle);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.fill();
    }
}

// ============================================================
// ✅ 10 + 11. UPDATE STATE - bỏ setTimeout, tăng alpha text
// ============================================================
function updateState() {
    stateTimer += 1/60;
    
    if (stateTimer > stateDuration) {
        stateTimer = 0;
        
        switch (currentState) {
            case STATE.GATHER:
                currentState = STATE.EXPLOSION;
                stateDuration = 1.5;
                explode();
                break;
                
            case STATE.EXPLOSION:
                // Chuyển sang heart ngay lập tức
                currentState = STATE.HEART;
                stateDuration = 4;
                currentTargets = heartPoints;
                morph(currentTargets);
                break;
                
            case STATE.HEART:
                currentState = STATE.EXPLOSION;
                stateDuration = 1.5;
                explode();
                // Đánh dấu để chuyển sang text sau
                nextStateTimer = 0;
                break;
                
            case STATE.TEXT:
                currentState = STATE.GATHER;
                stateDuration = 3;
                currentTargets = gatherPoints;
                morph(currentTargets);
                break;
        }
    }
    
    // Xử lý chuyển từ explosion sang text
    if (currentState === STATE.EXPLOSION && stateTimer > stateDuration * 0.6) {
        currentState = STATE.TEXT;
        stateDuration = 5;
        stateTimer = 0;
        currentTargets = textPoints;
        morph(currentTargets);
    }
}

// ============================================================
// UPDATE CAMERA SHAKE
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
// ✅ 11. drawLoveText() - tăng alpha
// ============================================================
function drawLoveText() {
    if (currentState === STATE.TEXT) {
        const alpha = Math.min(1, stateTimer / 1);
        ctx.save();
        ctx.globalAlpha = alpha * 0.08;
        ctx.font = `bold ${Math.min(w, h) * 0.15}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff2d55';
        ctx.shadowBlur = 100;
        ctx.shadowColor = 'rgba(255, 45, 85, 0.3)';
        ctx.fillText('💖 I LOVE YOU 💖', w/2, h/2);
        ctx.restore();
    }
}

// ============================================================
// ✅ 12. ANIMATE - tăng opacity nền
// ============================================================
function animate() {
    time += 0.01;
    
    ctx.fillStyle = "rgba(5, 8, 15, 0.18)";
    ctx.fillRect(0, 0, w, h);
    
    drawStars();
    updateState();
    updateShake();
    
    ctx.save();
    ctx.translate(shakeX, shakeY);
    
    for (const p of particles) {
        p.update();
        p.draw();
    }
    
    drawShockwave();
    drawLoveText();
    
    ctx.restore();
    
    // Hiển thị trạng thái
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    const stateNames = ['GATHER', 'EXPLOSION', 'HEART', 'TEXT'];
    ctx.fillText(`State: ${stateNames[currentState]} | ${isMobile ? '📱 Mobile' : '💻 Desktop'}`, 10, 20);
    
    // ✅ 15. FPS Limit cho iPhone
    if (isMobile) {
        requestAnimationFrame(animate);
    } else {
        requestAnimationFrame(animate);
    }
}

animate();

console.log('💖 Hiệu ứng trái tim với morphing particle!');
console.log(`📱 ${isMobile ? 'Mobile mode' : 'Desktop mode'} - ${PARTICLE_COUNT} particles`);
console.log('Các trạng thái: GATHER → EXPLOSION → HEART → EXPLOSION → TEXT → GATHER');
