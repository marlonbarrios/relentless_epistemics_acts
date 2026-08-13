let video;
let analyserNode;
let frequencyData;
let playing = false;
let videoStarted = false;
let videoDuration;
let videoNativeWidth = 0;
let videoNativeHeight = 0;
let videoLayout = { x: 0, y: 0, w: 0, h: 0 };
let videoZoom = 1;
let targetVideoZoom = 1;
const MIN_VIDEO_ZOOM = 1;
const MAX_VIDEO_ZOOM = 3.5;
const VIDEO_ZOOM_STEP = 0.06;
const VIDEO_ZOOM_SMOOTH = 0.055;
const AUTO_VIDEO_ZOOM_SMOOTH = 0.012;
let loopMode = false;
let showInstructions = true;
let generativeMode = false;
let vectorMode = false;
let solarizeMode = false;
let autoMode = false;
let autoMix = { gen: 0, vec: 0, sol: 0 };
let effectMix = { gen: 0, vec: 0, sol: 0 };
let manualSnapshot = null;
let autoSceneTarget = { gen: false, vec: false, sol: false, zoom: 1 };
let lastAutoSceneChange = 0;
let nextAutoSceneDelay = 3000;
let audioConnected = false;
let smoothBass = 0;
let smoothMid = 0;
let smoothTreble = 0;
let smoothLevel = 0;
let smoothPeak = 0;
let smoothComplexity = 0;
let visualVariant = 0;
let lastVariantChange = 0;
let swarmAgents = [];
const SWARM_TRAIL_LEN = 14;
const SWARM_MIN = 28;
const SWARM_MAX = 90;
let recording = false;
let mediaRecorder;
let recordedChunks = [];
let lastRecordingUrl = null;
let lastRecordingBlob = null;
let recordingExtension = 'mp4';
let recordingNeedsConversion = false;
let hasRecording = false;
let converting = false;
let videoPausedInit = false;

function preload() {
    video = createVideo('all.mp4', videoLoaded);
}

function initPausedVideo() {
    if (!video) return;

    playing = false;
    video.pause();
    video.volume(1);

    let el = video.elt;
    el.preload = 'auto';
    el.autoplay = false;
    el.playsInline = true;
    el.muted = false;

    let holdFirstFrame = () => {
        playing = false;
        video.pause();
        if (el.readyState >= 2 && el.currentTime > 0.05) {
            el.currentTime = 0;
        }
        lockVideoDimensions();
    };

    if (!videoPausedInit) {
        videoPausedInit = true;
        el.addEventListener('loadedmetadata', lockVideoDimensions);
        el.addEventListener('loadeddata', holdFirstFrame);
        el.addEventListener('seeked', () => {
            playing = false;
            video.pause();
        });
    }

    if (el.readyState >= 1) {
        lockVideoDimensions();
    }
    if (el.readyState >= 2) {
        holdFirstFrame();
    }
}

function videoLoaded() {
    initPausedVideo();
}

function lockVideoDimensions() {
    let nativeW = video.elt.videoWidth;
    let nativeH = video.elt.videoHeight;
    if (!nativeW || !nativeH) return;

    videoNativeWidth = nativeW;
    videoNativeHeight = nativeH;
    videoDuration = video.duration();
    updateVideoLayout();
    videoStarted = true;
}

function updateVideoLayout() {
    if (!videoNativeWidth || !videoNativeHeight) return;

    let baseScale = height / videoNativeHeight;
    let baseW = videoNativeWidth * baseScale;
    let baseH = height;

    videoLayout.w = baseW * videoZoom;
    videoLayout.h = baseH * videoZoom;
    videoLayout.x = (width - videoLayout.w) / 2;
    videoLayout.y = (height - videoLayout.h) / 2;
}

function updateVideoZoom() {
    if (!autoMode) {
        if (keyIsDown(90)) {
            targetVideoZoom = min(MAX_VIDEO_ZOOM, targetVideoZoom + VIDEO_ZOOM_STEP * 0.25);
        }
        if (keyIsDown(70)) {
            targetVideoZoom = max(MIN_VIDEO_ZOOM, targetVideoZoom - VIDEO_ZOOM_STEP * 0.25);
        }
    }

    let zoomSmooth = autoMode ? AUTO_VIDEO_ZOOM_SMOOTH : VIDEO_ZOOM_SMOOTH;
    videoZoom = lerp(videoZoom, targetVideoZoom, zoomSmooth);
    if (abs(videoZoom - targetVideoZoom) < 0.001) {
        videoZoom = targetVideoZoom;
    }
    updateVideoLayout();
}

function zoomVideoIn() {
    targetVideoZoom = min(MAX_VIDEO_ZOOM, targetVideoZoom + VIDEO_ZOOM_STEP);
}

function zoomVideoOut() {
    targetVideoZoom = max(MIN_VIDEO_ZOOM, targetVideoZoom - VIDEO_ZOOM_STEP);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noCursor();
    video.hide();
    initPausedVideo();
}

function draw() {
    background(0);

    if (!videoStarted || !videoLayout.w || !videoLayout.h) {
        drawInstructions();
        drawCrosshair();
        return;
    }

    if (generativeMode || vectorMode || autoMode || solarizeMode) {
        updateAudioLevels();
    }

    if (autoMode && playing) {
        updateAutoMode();
    } else if (playing && (generativeMode || vectorMode || solarizeMode)) {
        updateManualEffectMix();
    }

    updateVideoZoom();

    drawVideo(videoLayout.x, videoLayout.y, videoLayout.w, videoLayout.h);

    if (vectorMode) {
        drawSoundVectors(0, 0, width, height);
    }

    drawInstructions();
    drawCrosshair();
}

function drawInstructions() {
    if (!showInstructions) return;

    push();
    textAlign(LEFT, TOP);
    textSize(9);
    textFont('Courier');
    fill(255, 95);
    noStroke();

    let x = 12;
    let y = 10;
    let lineHeight = 11;
    let lines = [
        'space  play / pause',
        'a  automate',
        'l  loop',
        'g  generative',
        's  solarize',
        'z  zoom in',
        'f  zoom out',
        'v  vectors',
        'r  record',
        'd  download',
        'h  hide'
    ];

    for (let i = 0; i < lines.length; i++) {
        text(lines[i], x, y);
        y += lineHeight;
    }
    pop();
}

function drawCrosshair() {
    let cx = mouseX;
    let cy = mouseY;
    if (cx < 0 || cy < 0 || cx > width || cy > height) return;

    let arm = 14;
    let gap = 4;
    let bracket = 6;

    push();
    strokeCap(SQUARE);
    noFill();

    // faint full-window guides
    stroke(255, 28);
    strokeWeight(0.5);
    line(0, cy, width, cy);
    line(cx, 0, cx, height);

    // main crosshair
    stroke(255, 210);
    strokeWeight(1.1);
    line(cx - arm, cy, cx - gap, cy);
    line(cx + gap, cy, cx + arm, cy);
    line(cx, cy - arm, cx, cy - gap);
    line(cx, cy + gap, cx, cy + arm);

    // corner brackets
    stroke(255, 160);
    strokeWeight(0.9);
    line(cx - bracket, cy - bracket, cx - bracket + 4, cy - bracket);
    line(cx - bracket, cy - bracket, cx - bracket, cy - bracket + 4);
    line(cx + bracket, cy - bracket, cx + bracket - 4, cy - bracket);
    line(cx + bracket, cy - bracket, cx + bracket, cy - bracket + 4);
    line(cx - bracket, cy + bracket, cx - bracket + 4, cy + bracket);
    line(cx - bracket, cy + bracket, cx - bracket, cy + bracket - 4);
    line(cx + bracket, cy + bracket, cx + bracket - 4, cy + bracket);
    line(cx + bracket, cy + bracket, cx + bracket, cy + bracket - 4);

    // center point
    noStroke();
    fill(255, 230);
    rectMode(CENTER);
    rect(cx, cy, 2, 2);
    rectMode(CORNER);
    pop();
}

function connectVideoAudioAnalysis() {
    if (audioConnected) return;
    try {
        userStartAudio();
        let audioContext = getAudioContext();
        video.volume(1);
        video.elt.muted = false;

        let source = audioContext.createMediaElementSource(video.elt);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 1024;
        analyserNode.smoothingTimeConstant = 0.08;
        frequencyData = new Uint8Array(analyserNode.frequencyBinCount);

        source.connect(analyserNode);
        source.connect(audioContext.destination);
        audioConnected = true;
    } catch (err) {
        console.warn('Video audio analysis unavailable:', err);
    }
}

function readVideoAudioBands() {
    if (!analyserNode || !frequencyData) {
        return { bass: 0, mid: 0, treble: 0, level: 0, peak: 0 };
    }

    analyserNode.getByteFrequencyData(frequencyData);
    let len = frequencyData.length;
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    let totalSum = 0;
    let peak = 0;
    let bassEnd = floor(len * 0.12);
    let midEnd = floor(len * 0.5);

    for (let i = 0; i < len; i++) {
        let value = frequencyData[i];
        peak = max(peak, value);
        totalSum += value;
        if (i < bassEnd) bassSum += value;
        else if (i < midEnd) midSum += value;
        else trebleSum += value;
    }

    return {
        bass: amplifyAudio(bassSum / max(1, bassEnd)),
        mid: amplifyAudio(midSum / max(1, midEnd - bassEnd)),
        treble: amplifyAudio(trebleSum / max(1, len - midEnd)),
        level: amplifyAudio(totalSum / len),
        peak: amplifyAudio(peak)
    };
}

function amplifyAudio(value) {
    let normalized = value / 255;
    return constrain(pow(normalized, 0.45) * 2.8, 0, 1);
}

function toggleGenerative() {
    generativeMode = !generativeMode;
    if (generativeMode) connectVideoAudioAnalysis();
}

function toggleSolarize() {
    solarizeMode = !solarizeMode;
    if (solarizeMode) connectVideoAudioAnalysis();
}

function toggleAutoMode() {
    autoMode = !autoMode;
    if (autoMode) {
        manualSnapshot = {
            gen: generativeMode,
            vec: vectorMode,
            sol: solarizeMode,
            zoom: targetVideoZoom
        };
        connectVideoAudioAnalysis();
        pickNewAutoScene();
        lastAutoSceneChange = millis();
        generativeMode = autoSceneTarget.gen;
        vectorMode = autoSceneTarget.vec;
        solarizeMode = autoSceneTarget.sol;
        targetVideoZoom = autoSceneTarget.zoom;
    } else if (manualSnapshot) {
        generativeMode = manualSnapshot.gen;
        vectorMode = manualSnapshot.vec;
        solarizeMode = manualSnapshot.sol;
        targetVideoZoom = manualSnapshot.zoom;
        if (!vectorMode) swarmAgents = [];
        manualSnapshot = null;
    }
}

function pickAutoZoom() {
    let roll = random();
    if (roll < 0.55) return MIN_VIDEO_ZOOM;
    if (roll < 0.82) return random(MIN_VIDEO_ZOOM, 1.7);
    return random(1.7, MAX_VIDEO_ZOOM);
}

function pickNewAutoScene(initial = false) {
    if (random() < 0.14) {
        autoSceneTarget.gen = false;
        autoSceneTarget.vec = false;
        autoSceneTarget.sol = false;
        autoSceneTarget.zoom = MIN_VIDEO_ZOOM;
    } else if (random() < 0.1) {
        autoSceneTarget.gen = true;
        autoSceneTarget.vec = true;
        autoSceneTarget.sol = true;
        autoSceneTarget.zoom = pickAutoZoom();
    } else if (random() < 0.3) {
        let pick = floor(random(3));
        autoSceneTarget.gen = pick === 0;
        autoSceneTarget.vec = pick === 1;
        autoSceneTarget.sol = pick === 2;
        autoSceneTarget.zoom = pickAutoZoom();
    } else {
        autoSceneTarget.gen = random() < 0.5;
        autoSceneTarget.vec = random() < 0.5;
        autoSceneTarget.sol = random() < 0.4;
        autoSceneTarget.zoom = pickAutoZoom();
    }

    if (smoothPeak > 0.5 && random() < 0.3) autoSceneTarget.sol = true;
    if (smoothMid > 0.4 && random() < 0.3) autoSceneTarget.vec = true;
    if (smoothLevel > 0.35 && random() < 0.3) autoSceneTarget.gen = true;

    nextAutoSceneDelay = random(1000, 6000);

    if (autoSceneTarget.vec && swarmAgents.length < SWARM_MIN) {
        seedSwarm(0, 0, width, height, SWARM_MIN);
    }
    if (!autoSceneTarget.vec) {
        swarmAgents = [];
    }
}

function updateAutoMode() {
    let energy = max(smoothLevel, smoothPeak * 0.96);
    let motion = smoothMid * 0.52 + smoothTreble * 0.33 + smoothBass * 0.15;
    let hit = max(smoothPeak, smoothTreble * 0.9);
    let timeCeiling = max(0.08, getTimeCeiling());

    if (millis() - lastAutoSceneChange > nextAutoSceneDelay) {
        pickNewAutoScene();
        lastAutoSceneChange = millis();
        targetVideoZoom = autoSceneTarget.zoom;
    }

    generativeMode = autoSceneTarget.gen;
    vectorMode = autoSceneTarget.vec;
    solarizeMode = autoSceneTarget.sol;

    autoMix.gen = lerp(autoMix.gen, autoSceneTarget.gen ? max(0.2, energy) : 0, 0.12);
    autoMix.vec = lerp(autoMix.vec, autoSceneTarget.vec ? max(0.2, motion) : 0, 0.13);
    autoMix.sol = lerp(autoMix.sol, autoSceneTarget.sol ? max(0.15, hit) : 0, 0.16);

    effectMix.gen = autoMix.gen;
    effectMix.vec = autoMix.vec;
    effectMix.sol = autoMix.sol;

    if (vectorMode) {
        smoothComplexity = lerp(
            smoothComplexity,
            computeVectorComplexityTarget() * (0.35 + autoMix.vec * 0.65),
            0.88
        );
        let targetCount = floor(SWARM_MIN + motion * (SWARM_MAX - SWARM_MIN) * 0.55);
        if (swarmAgents.length < targetCount && random() < 0.08 + motion * 0.2) {
            spawnSwarmAgent(0, 0, width, height);
        }
    }

    if (generativeMode && random() < 0.004 + energy * 0.01) {
        visualVariant = floor(random(5));
    }
}

function updateManualEffectMix() {
    let energy = max(smoothLevel, smoothPeak * 0.96);
    let motion = smoothMid * 0.52 + smoothTreble * 0.33 + smoothBass * 0.15;
    let hit = max(smoothPeak, smoothTreble * 0.9);

    effectMix.gen = generativeMode ? lerp(effectMix.gen, energy, 0.18) : 0;
    effectMix.vec = vectorMode ? lerp(effectMix.vec, motion, 0.2) : 0;
    effectMix.sol = solarizeMode ? lerp(effectMix.sol, hit, 0.24) : 0;

    if (vectorMode) {
        smoothComplexity = lerp(
            smoothComplexity,
            computeVectorComplexityTarget() * (0.4 + effectMix.vec * 0.6),
            0.88
        );
    }
}

function getGenerativeIntensity() {
    if (!generativeMode || !playing) return 0;
    return autoMode ? max(0.15, effectMix.gen) : max(0.55, effectMix.gen);
}

function getVectorIntensity() {
    if (!vectorMode) return 0;
    if (!playing) return 1;
    return autoMode ? max(0.12, effectMix.vec) : max(0.45, effectMix.vec);
}

function getSolarizeIntensity() {
    if (!solarizeMode) return 0;
    if (!playing) return 1;
    return autoMode ? max(0.1, effectMix.sol) : max(0.45, effectMix.sol);
}

function toggleVector() {
    vectorMode = !vectorMode;
    if (!vectorMode) {
        swarmAgents = [];
    } else {
        connectVideoAudioAnalysis();
        smoothComplexity = 0.18;
        seedSwarm(0, 0, width, height, SWARM_MIN);
    }
}

function updateAudioLevels() {
    if (!generativeMode && !vectorMode && !autoMode && !solarizeMode) {
        smoothBass = lerp(smoothBass, 0, 0.12);
        smoothMid = lerp(smoothMid, 0, 0.12);
        smoothTreble = lerp(smoothTreble, 0, 0.12);
        smoothLevel = lerp(smoothLevel, 0, 0.12);
        smoothPeak = lerp(smoothPeak, 0, 0.12);
        smoothComplexity = lerp(smoothComplexity, 0, 0.1);
        return;
    }

    if (!playing) {
        if (vectorMode || autoMode) {
            smoothComplexity = max(0.18, lerp(smoothComplexity, 0.18, 0.04));
        }
        return;
    }

    connectVideoAudioAnalysis();
    let bands = readVideoAudioBands();
    let response = (vectorMode || autoMode || solarizeMode) ? 0.92 : 0.82;
    smoothBass = lerp(smoothBass, bands.bass, response);
    smoothMid = lerp(smoothMid, bands.mid, response);
    smoothTreble = lerp(smoothTreble, bands.treble, response);
    smoothLevel = lerp(smoothLevel, bands.level, response);
    smoothPeak = lerp(smoothPeak, bands.peak, min(0.98, response * 1.18));
}

function getTimeCeiling() {
    return pow(getSongProgress(), 1.45);
}

function computeVectorComplexityTarget() {
    let timeCeiling = getTimeCeiling();
    let soundAmp = max(smoothLevel, smoothPeak * 1.08);

    if (soundAmp < 0.055) {
        return 0.06;
    }

    return constrain(
        0.06 + timeCeiling * pow(soundAmp, 0.88) * (0.2 + timeCeiling * 0.8),
        0.06,
        1
    );
}

function getSoundComplexity() {
    return smoothComplexity;
}

function getSongProgress() {
    if (!videoDuration) return 0;
    return constrain(video.time() / videoDuration, 0, 1);
}

function drawVideo(x, y, w, h) {
    image(video, x, y, w, h);

    if (solarizeMode) {
        applyStrongSolarizeOverlay(x, y, w, h);
    }

    if (generativeMode && playing) {
        applyGenerativeOverlay(x, y, w, h);
    }
}

function updateVisualVariant() {
    if (!generativeMode || !playing) return;

    let energy = max(smoothLevel, smoothPeak);
    let motion = smoothMid + smoothTreble * 0.6;
    if ((energy > 0.35 && millis() - lastVariantChange > 450) ||
        (motion > 0.4 && millis() - lastVariantChange > 700) ||
        millis() - lastVariantChange > 4000) {
        visualVariant = (visualVariant + 1) % 5;
        lastVariantChange = millis();
    }
}

function spawnSwarmAgent(x, y, w, h, near = null) {
    let margin = 40;
    let px = near ? near.x + random(-40, 40) : x + margin + random(w - margin * 2);
    let py = near ? near.y + random(-40, 40) : y + margin + random(h - margin * 2);
    px = constrain(px, x + margin, x + w - margin);
    py = constrain(py, y + margin, y + h - margin);
    let angle = random(TWO_PI);
    let speed = random(0.4, 1.4);
    swarmAgents.push({
        x: px,
        y: py,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed,
        noiseX: random(1000),
        noiseY: random(1000),
        phase: random(TWO_PI),
        mass: random(0.7, 1.4),
        trail: [{ x: px, y: py }],
        curl: random(-1, 1)
    });
}

function seedSwarm(x, y, w, h, count) {
    swarmAgents = [];
    for (let i = 0; i < count; i++) {
        spawnSwarmAgent(x, y, w, h);
    }
}

function updateSwarm(x, y, w, h, complexity, timeCeiling, paused) {
    let targetCount = paused
        ? SWARM_MIN
        : floor(SWARM_MIN + complexity * (SWARM_MAX - SWARM_MIN) * (0.35 + timeCeiling * 0.65));
    targetCount = constrain(targetCount, SWARM_MIN, SWARM_MAX);

    while (swarmAgents.length < targetCount) {
        let buddy = swarmAgents.length ? random(swarmAgents) : null;
        spawnSwarmAgent(x, y, w, h, buddy);
    }
    while (swarmAgents.length > targetCount) {
        swarmAgents.shift();
    }

    let t = millis() * 0.001;
    let energy = paused ? 0.22 : max(smoothLevel, smoothPeak * 0.9);
    let flowScale = 0.0024 + complexity * 0.0028;
    let maxSpeed = paused
        ? 1.35
        : 1.6 + energy * 4.2 + complexity * 2.8 + smoothBass * 1.4;
    let neighborRadius = 60 + complexity * 80;
    let pulse = paused ? 0 : smoothPeak * 3.4;
    let grid = 18 + complexity * 10;

    for (let i = 0; i < swarmAgents.length; i++) {
        let a = swarmAgents[i];
        let n = noise(a.noiseX + a.x * flowScale, a.noiseY + a.y * flowScale, t * 0.28);
        // quantize flow into techno 8-way angles
        let rawAngle = n * TWO_PI * 2 + a.phase * 0.2;
        let sectors = 8;
        let flowAngle = round(rawAngle / (TWO_PI / sectors)) * (TWO_PI / sectors);
        let flowForce = paused ? 0.11 : 0.14 + energy * 0.28 + smoothTreble * 0.1;

        a.vx += cos(flowAngle) * flowForce;
        a.vy += sin(flowAngle) * flowForce;

        // hard clock-spin instead of soft curl
        let spinAmt = (paused ? 0.03 : 0.04 + smoothMid * 0.09) * a.curl;
        let cxv = a.vx;
        a.vx = a.vx * cos(spinAmt) - a.vy * sin(spinAmt);
        a.vy = cxv * sin(spinAmt) + a.vy * cos(spinAmt);

        let alignX = 0;
        let alignY = 0;
        let cohereX = 0;
        let cohereY = 0;
        let separateX = 0;
        let separateY = 0;
        let neighbors = 0;

        for (let j = 0; j < swarmAgents.length; j++) {
            if (i === j) continue;
            let b = swarmAgents[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let d = sqrt(dx * dx + dy * dy);
            if (d > neighborRadius || d < 0.001) continue;

            neighbors++;
            alignX += b.vx;
            alignY += b.vy;
            cohereX += b.x;
            cohereY += b.y;

            if (d < 24) {
                let push = (24 - d) / 24;
                separateX += (dx / d) * push;
                separateY += (dy / d) * push;
            }
        }

        if (neighbors > 0) {
            alignX /= neighbors;
            alignY /= neighbors;
            cohereX = cohereX / neighbors - a.x;
            cohereY = cohereY / neighbors - a.y;

            a.vx += alignX * 0.06 + cohereX * 0.0022 + separateX * 0.16;
            a.vy += alignY * 0.06 + cohereY * 0.0022 + separateY * 0.16;
        }

        // snap herd centers to a coarse lattice
        let centerPull = paused ? 0.001 : 0.0016 + smoothBass * 0.003;
        let herdX = x + w * (0.3 + 0.4 * noise(floor(t * 2) * 0.37 + a.phase));
        let herdY = y + h * (0.3 + 0.4 * noise(floor(t * 2) * 0.29 + a.noiseY));
        herdX = x + round((herdX - x) / grid) * grid;
        herdY = y + round((herdY - y) / grid) * grid;
        a.vx += (herdX - a.x) * centerPull;
        a.vy += (herdY - a.y) * centerPull;

        if (pulse > 0.35) {
            let fromCx = a.x - (x + w * 0.5);
            let fromCy = a.y - (y + h * 0.45);
            let distC = max(1, sqrt(fromCx * fromCx + fromCy * fromCy));
            a.vx += (fromCx / distC) * pulse * 0.12;
            a.vy += (fromCy / distC) * pulse * 0.12;
        }

        // kick: brief axis lock on bass hits
        if (!paused && smoothBass > 0.45 && smoothPeak > 0.35) {
            if (abs(a.vx) > abs(a.vy)) a.vy *= 0.35;
            else a.vx *= 0.35;
        }

        let speed = sqrt(a.vx * a.vx + a.vy * a.vy);
        let limit = maxSpeed / a.mass;
        if (speed > limit) {
            a.vx = (a.vx / speed) * limit;
            a.vy = (a.vy / speed) * limit;
        }

        a.x += a.vx;
        a.y += a.vy;

        let pad = 20;
        if (a.x < x - pad) a.x = x + w + pad;
        if (a.x > x + w + pad) a.x = x - pad;
        if (a.y < y - pad) a.y = y + h + pad;
        if (a.y > y + h + pad) a.y = y - pad;

        a.trail.push({ x: a.x, y: a.y });
        if (a.trail.length > SWARM_TRAIL_LEN) a.trail.shift();
    }
}

function drawSoundVectors(x, y, w, h) {
    let paused = !playing;
    let vecAmp = getVectorIntensity();
    let complexity = paused
        ? max(0.22, getSoundComplexity())
        : max(0.14, getSoundComplexity() * (0.45 + vecAmp * 0.55));
    let timeCeiling = max(0.08, getTimeCeiling());
    let t = millis() * 0.001;
    let energy = paused ? 0.25 : max(complexity, smoothLevel);

    push();
    noFill();
    updateSwarm(x, y, w, h, complexity, timeCeiling, paused);
    drawTechnoField(x, y, w, h, t, energy, complexity, timeCeiling, paused);
    pop();
}

function drawTechnoField(x, y, w, h, t, energy, complexity, timeCeiling, paused) {
    let beat = paused ? 0.2 : max(smoothPeak, smoothBass * 0.85);
    let strobe = (!paused && beat > 0.55) ? 0.55 + beat * 0.45 : 1;
    let linkDist = 48 + complexity * 62;
    let alphaBase = (paused ? 130 : 100 + energy * 150) * strobe;

    drawTechnoGrid(x, y, w, h, t, energy, complexity, timeCeiling, paused, beat);

    // angular network — straight neon links
    strokeCap(SQUARE);
    for (let i = 0; i < swarmAgents.length; i++) {
        let a = swarmAgents[i];
        let links = 0;
        for (let j = i + 1; j < swarmAgents.length; j++) {
            if (links > 3) break;
            let b = swarmAgents[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let d = sqrt(dx * dx + dy * dy);
            if (d > linkDist) continue;
            links++;

            let closeness = 1 - d / linkDist;
            stroke(255, alphaBase * closeness * (0.4 + complexity * 0.45));
            strokeWeight(0.5 + closeness * (0.8 + beat * 1.2));

            // manhattan elbow for circuit look
            if ((i + j) % 2 === 0) {
                line(a.x, a.y, b.x, a.y);
                line(b.x, a.y, b.x, b.y);
            } else {
                line(a.x, a.y, a.x, b.y);
                line(a.x, b.y, b.x, b.y);
            }
        }
    }

    // sharp polyline trails + techno glyphs at heads
    for (let a of swarmAgents) {
        if (a.trail.length < 2) continue;

        let speed = sqrt(a.vx * a.vx + a.vy * a.vy);
        let hot = beat > 0.5 && (floor(a.phase * 10) % 3 === 0);
        strokeWeight(0.85 + a.mass * 0.45 + speed * 0.18);
        stroke(
            255,
            (paused ? 150 : (hot ? 150 : 110) + energy * 120) * strobe * (0.55 + a.mass * 0.25)
        );
        beginShape();
        for (let k = 0; k < a.trail.length; k++) {
            vertex(a.trail[k].x, a.trail[k].y);
        }
        endShape();

        drawTechnoNode(a.x, a.y, a.mass, energy, beat, a.phase, paused, strobe);
    }

    drawTechnoOrnaments(x, y, w, h, t, energy, complexity, timeCeiling, paused, beat, strobe);
}

function drawTechnoNode(px, py, mass, energy, beat, phase, paused, strobe) {
    let s = 2.2 + mass * 2.4 + energy * 2.5 + beat * 3;
    let kind = floor((phase * 7) % 4);
    strokeWeight(0.9 + beat * 0.8);
    noFill();

    if (kind === 0) {
        stroke(255, (paused ? 200 : 160 + beat * 90) * strobe);
        rectMode(CENTER);
        rect(px, py, s, s);
        rectMode(CORNER);
    } else if (kind === 1) {
        stroke(255, (paused ? 190 : 150 + beat * 100) * strobe);
        line(px - s, py, px + s, py);
        line(px, py - s, px, py + s);
    } else if (kind === 2) {
        stroke(255, (paused ? 180 : 140 + beat * 110) * strobe);
        triangle(px, py - s, px + s * 0.9, py + s * 0.7, px - s * 0.9, py + s * 0.7);
    } else {
        stroke(255, (paused ? 190 : 150 + beat * 90) * strobe);
        ellipse(px, py, s * 1.4, s * 1.4);
        point(px, py);
    }

    if (!paused && beat > 0.62) {
        stroke(255, 90 * strobe);
        strokeWeight(0.5);
        ellipse(px, py, s * (2.2 + beat), s * (2.2 + beat));
    }
}

function drawTechnoGrid(x, y, w, h, t, energy, complexity, timeCeiling, paused, beat) {
    if (!paused && complexity < 0.16 && beat < 0.25) return;

    let cols = floor(6 + complexity * 10);
    let rows = floor(4 + complexity * 7);
    let alpha = (paused ? 35 : 18 + energy * 55 + beat * 40) * (0.4 + timeCeiling * 0.6);
    strokeWeight(0.4 + beat * 0.5);
    stroke(255, alpha);

    for (let i = 1; i < cols; i++) {
        let gx = x + (w * i) / cols;
        // dashed verticals
        for (let yy = y; yy < y + h; yy += 10) {
            line(gx, yy, gx, min(y + h, yy + 4));
        }
    }
    for (let j = 1; j < rows; j++) {
        let gy = y + (h * j) / rows;
        let scan = (paused ? 0 : sin(t * 8 + j) * beat * 6);
        for (let xx = x; xx < x + w; xx += 12) {
            line(xx, gy + scan, min(x + w, xx + 5), gy + scan);
        }
    }

    // scrolling techno scan beam
    if (!paused && (beat > 0.2 || complexity > 0.2)) {
        let scanY = y + ((t * (80 + smoothMid * 220)) % h);
        stroke(255, 40 + beat * 90);
        strokeWeight(1 + beat);
        line(x, scanY, x + w, scanY);
    }
}

function drawTechnoOrnaments(x, y, w, h, t, energy, complexity, timeCeiling, paused, beat, strobe) {
    let cx = x + w * 0.5;
    let cy = y + h * 0.45;

    // radar rings on kick
    let rings = paused ? 2 : floor(1 + beat * 4 + complexity * 2);
    strokeWeight(0.7 + beat * 0.9);
    for (let r = 0; r < rings; r++) {
        let rad = (30 + r * (28 + complexity * 20) + (paused ? t * 20 : t * (40 + smoothBass * 80)) % 160);
        stroke(255, (paused ? 50 : 25 + beat * 90) * strobe * (1 - r / (rings + 1)));
        ellipse(cx, cy, rad * 2, rad * 1.15);
    }

    // hard saw / square waveform rails
    let rails = paused ? 2 : floor(1 + complexity * 3 + smoothTreble * 2);
    for (let r = 0; r < rails; r++) {
        let y0 = y + h * (0.18 + r * 0.12 + (paused ? 0 : smoothMid * 0.05));
        let steps = floor(24 + complexity * 40);
        stroke(255, (paused ? 70 : 35 + energy * 100) * strobe * (0.7 + (r % 3) * 0.15));
        strokeWeight(0.7 + beat * 0.6);
        beginShape();
        for (let i = 0; i <= steps; i++) {
            let p = i / steps;
            let wave;
            if (r % 2 === 0) {
                wave = (floor(p * (8 + smoothBass * 10) + t * 4) % 2 === 0 ? 1 : -1) * (6 + energy * 18 + beat * 14);
            } else {
                wave = ((p * 12 + t * 3) % 1) * 2 - 1;
                wave *= (8 + energy * 20);
            }
            vertex(x + w * (0.04 + p * 0.92), y0 + wave);
        }
        endShape();
    }

    // rotating techno hex around densest agent
    if (swarmAgents.length > 6 && (paused || complexity > 0.22)) {
        let sample = swarmAgents[floor((t * 7) % swarmAgents.length)];
        let s = 12 + complexity * 36 + beat * 20;
        let rot = t * (paused ? 0.6 : 1.4 + smoothTreble) + sample.phase;
        stroke(255, (paused ? 100 : 55 + beat * 120) * strobe);
        strokeWeight(1 + beat * 0.7);
        beginShape();
        for (let i = 0; i <= 6; i++) {
            let a = rot + (TWO_PI / 6) * i;
            vertex(sample.x + cos(a) * s, sample.y + sin(a) * s);
        }
        endShape();
        // inner diamond
        stroke(255, (paused ? 90 : 45 + smoothPeak * 120) * strobe);
        beginShape();
        for (let i = 0; i <= 4; i++) {
            let a = -rot + HALF_PI * i;
            vertex(sample.x + cos(a) * s * 0.45, sample.y + sin(a) * s * 0.45);
        }
        endShape();
    }

    // corner brackets
    let br = 18 + beat * 10;
    let ba = (paused ? 80 : 40 + energy * 90) * strobe;
    stroke(255, ba);
    strokeWeight(1.1);
    line(x + 16, y + 16, x + 16 + br, y + 16);
    line(x + 16, y + 16, x + 16, y + 16 + br);
    line(x + w - 16, y + 16, x + w - 16 - br, y + 16);
    line(x + w - 16, y + 16, x + w - 16, y + 16 + br);
    line(x + 16, y + h - 16, x + 16 + br, y + h - 16);
    line(x + 16, y + h - 16, x + 16, y + h - 16 - br);
    line(x + w - 16, y + h - 16, x + w - 16 - br, y + h - 16);
    line(x + w - 16, y + h - 16, x + w - 16, y + h - 16 - br);
}

function applyGenerativeOverlay(x, y, w, h) {
    updateVisualVariant();
    let amp = getGenerativeIntensity();
    if (amp < 0.04) return;

    switch (visualVariant) {
        case 0:
            applyRgbSplitOverlay(x, y, w, h, amp);
            break;
        case 1:
            applySolarOverlay(x, y, w, h, amp);
            break;
        case 2:
            applyBloomOverlay(x, y, w, h, amp);
            break;
        case 3:
            applyInvertOverlay(x, y, w, h, amp);
            break;
        case 4:
            applyDriftOverlay(x, y, w, h, amp);
            break;
    }
}

function applyRgbSplitOverlay(x, y, w, h, amp = 1) {
    let split = (3 + smoothBass * 22 + smoothPeak * 12) * (0.5 + amp * 0.5);
    let glow = (60 + smoothLevel * 160) * amp;

    push();
    blendMode(ADD);
    tint(255, 50, 50, glow * (0.4 + smoothBass));
    image(video, x + split, y, w, h);
    tint(50, 255, 50, glow * (0.3 + smoothMid));
    image(video, x, y, w, h);
    tint(50, 50, 255, glow * (0.4 + smoothTreble));
    image(video, x - split, y, w, h);
    pop();
}

function applySolarOverlay(x, y, w, h, amp = 1) {
    push();
    blendMode(SCREEN);
    tint(255, 220 + smoothMid * 35, 180 + smoothBass * 40, (50 + smoothLevel * 150) * amp);
    image(video, x, y, w, h);
    pop();

    if (smoothPeak > 0.2) {
        push();
        blendMode(DIFFERENCE);
        tint(255, 255 * (1 - smoothPeak * 0.75 * amp));
        image(video, x, y, w, h);
        pop();
    }

    push();
    blendMode(MULTIPLY);
    tint(255, 210 + smoothTreble * 45, 160 + smoothBass * 50, (90 + smoothLevel * 120) * amp);
    image(video, x, y, w, h);
    pop();
}

function applyStrongSolarizeOverlay(x, y, w, h) {
    let amp = getSolarizeIntensity();
    if (amp < 0.04) return;

    let ctx = drawingContext;
    let contrast = 2.8 + amp * 1.4;
    let bright = 1.15 + amp * 0.25;
    let alpha = (v) => v * amp;

    push();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.filter = `grayscale(1) contrast(${contrast}) brightness(${bright})`;
    tint(255, 255, 255, alpha(255));
    image(video, x, y, w, h);

    blendMode(DIFFERENCE);
    ctx.filter = `grayscale(1) invert(1) contrast(${contrast * 0.85}) brightness(${bright})`;
    tint(255, 255, 255, alpha(250));
    image(video, x, y, w, h);

    blendMode(SCREEN);
    ctx.filter = `grayscale(1) contrast(${contrast * 0.75}) brightness(${bright * 1.08})`;
    tint(255, 255, 255, alpha(230));
    image(video, x, y, w, h);

    blendMode(MULTIPLY);
    ctx.filter = 'grayscale(1) contrast(2.2)';
    tint(255, 255, 255, alpha(210));
    image(video, x, y, w, h);

    blendMode(HARD_LIGHT);
    ctx.filter = 'none';
    tint(255, 255, 255, alpha(180 + smoothPeak * 60));
    let edge = 1 + smoothPeak * 3 * amp;
    image(video, x, y - edge, w, h);
    image(video, x, y + edge, w, h);

    ctx.filter = 'none';
    ctx.restore();
    pop();
}

function applyBloomOverlay(x, y, w, h, amp = 1) {
    push();
    blendMode(BLEND);
    tint(255, 255, 255, (40 + smoothLevel * 80) * amp);
    image(video, x, y, w, h);
    pop();

    push();
    blendMode(ADD);
    tint(255, 255, 255, (20 + smoothTreble * 100) * amp);
    image(video, x, y - smoothMid * 6, w, h);
    image(video, x, y + smoothMid * 4, w, h);
    pop();

    push();
    blendMode(OVERLAY);
    tint(200 + smoothBass * 55, 200 + smoothMid * 40, 255, (100 + smoothPeak * 120) * amp);
    image(video, x, y, w, h);
    pop();
}

function applyInvertOverlay(x, y, w, h, amp = 1) {
    let amount = (smoothBass * 0.55 + smoothPeak * 0.45) * amp;

    push();
    blendMode(DIFFERENCE);
    tint(255, 255 * (1 - amount * 0.5));
    image(video, x, y, w, h);
    pop();

    push();
    blendMode(ADD);
    tint(255, 100, 100, smoothBass * 140 * amp);
    image(video, x + smoothPeak * 10, y, w, h);
    tint(100, 100, 255, smoothTreble * 140 * amp);
    image(video, x - smoothPeak * 10, y, w, h);
    pop();
}

function applyDriftOverlay(x, y, w, h, amp = 1) {
    let drift = (smoothMid * 14 + smoothPeak * 8) * (0.5 + amp * 0.5);
    let glow = (70 + smoothLevel * 130) * amp;

    push();
    blendMode(ADD);
    tint(255, 180, 120, glow * 0.5);
    image(video, x + drift, y, w, h);
    tint(120, 180, 255, glow * 0.5);
    image(video, x - drift, y, w, h);
    pop();

    push();
    blendMode(MULTIPLY);
    tint(255, 255, 255, (100 + smoothLevel * 100) * amp);
    image(video, x, y + smoothBass * 5, w, h);
    pop();

    push();
    blendMode(SCREEN);
    tint(255, 255, 255, smoothTreble * 90);
    image(video, x, y, w, h);
    pop();
}

function getRecordingFormat() {
    let formats = [
        { mimeType: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', extension: 'mp4' },
        { mimeType: 'video/mp4', extension: 'mp4' },
        { mimeType: 'video/quicktime', extension: 'mov' },
        { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
        { mimeType: 'video/webm', extension: 'webm' }
    ];
    
    for (let format of formats) {
        if (MediaRecorder.isTypeSupported(format.mimeType)) {
            return format;
        }
    }
    
    return { mimeType: '', extension: 'webm' };
}

async function downloadRecording() {
    if (!lastRecordingBlob || !hasRecording || converting) return;
    
    let blob = lastRecordingBlob;
    let extension = recordingExtension;
    
    if (recordingNeedsConversion) {
        converting = true;
        try {
            blob = await convertRecordingToMp4(blob);
            extension = 'mp4';
        } catch (err) {
            console.error('Could not convert recording to MP4:', err);
            converting = false;
            return;
        }
        converting = false;
    }
    
    let link = document.createElement('a');
    let url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'Relentless-Epistemic-Acts-' + Date.now() + '.' + extension;
    link.click();
    URL.revokeObjectURL(url);
}

async function convertRecordingToMp4(inputBlob) {
    const { FFmpeg } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    const { fetchFile, toBlobURL } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
    
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
        coreURL: await toBlobURL(baseURL + '/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL(baseURL + '/ffmpeg-core.wasm', 'application/wasm')
    });
    
    await ffmpeg.writeFile('input.webm', await fetchFile(inputBlob));
    await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart', 'output.mp4']);
    let data = await ffmpeg.readFile('output.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    updateVideoLayout();
}

function keyPressed() {
    if (keyCode === 32) {
        togglePlayPause();
        return false;
    } else if (key.toLowerCase() === 'a') {
        toggleAutoMode();
    } else if (key.toLowerCase() === 'l') {
        toggleLoop();
    } else if (!autoMode && key.toLowerCase() === 'g') {
        toggleGenerative();
    } else if (!autoMode && key.toLowerCase() === 's') {
        toggleSolarize();
    } else if (!autoMode && key.toLowerCase() === 'z') {
        zoomVideoIn();
    } else if (!autoMode && key.toLowerCase() === 'f') {
        zoomVideoOut();
    } else if (!autoMode && key.toLowerCase() === 'v') {
        toggleVector();
    } else if (key.toLowerCase() === 'r') {
        toggleRecording();
    } else if (key.toLowerCase() === 'd') {
        downloadRecording();
    } else if (key.toLowerCase() === 'h') {
        showInstructions = !showInstructions;
    }
}

function togglePlayPause() {
    if (playing) {
        video.pause();
        playing = false;
    } else {
        video.play();
        playing = true;
    }
}

function toggleLoop() {
    loopMode = !loopMode;
    if (loopMode) {
        video.loop();
    } else {
        video.noLoop();
    }
}

function toggleRecording() {
    if (recording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    let canvas = document.querySelector('canvas');
    if (!canvas || !canvas.captureStream) return;
    
    let stream = canvas.captureStream(30);
    let videoEl = video.elt;
    
    if (videoEl && videoEl.captureStream) {
        let videoStream = videoEl.captureStream();
        videoStream.getAudioTracks().forEach(track => stream.addTrack(track));
    }
    
    recordedChunks = [];
    let format = getRecordingFormat();
    recordingExtension = format.extension;
    recordingNeedsConversion = format.extension === 'webm';
    
    let options = format.mimeType ? { mimeType: format.mimeType } : {};
    mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
        if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
        let mimeType = format.mimeType || mediaRecorder.mimeType || 'video/webm';
        lastRecordingBlob = new Blob(recordedChunks, { type: mimeType });
        lastRecordingUrl = URL.createObjectURL(lastRecordingBlob);
        hasRecording = true;
    };
    mediaRecorder.start();
    recording = true;
    
    if (!playing) {
        video.play();
        playing = true;
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    recording = false;
}
