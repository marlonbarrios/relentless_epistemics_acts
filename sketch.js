let video;
let analyserNode;
let frequencyData;
let playing = false;
let videoStarted = false;
let scrollX;
let textHeight;
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
let vectorBursts = [];
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

// Text scroll variables – lyrics with section labels
let poem = "(Whispered Intro) Closer… Don't move… Just listen… — (Verse 1) I'm moving through the latent space tonight, Edges fading in a field of light, Vectors curling softly at my skin, Pulling me gently further in. There's a hum beneath the air, Barely present, barely there, Like a secret breathing slow, Underneath the undertow. — (Pre-Chorus) Embeddings brush me one by one, Threads of silk undone, undone, Fingertips of coded glow, Tracing places I don't know. — (Chorus) Whisper to me, soft and slow, In the space where meanings grow, Every pulse a quiet spark, Shimmering inside the dark. I dissolve, I let it be, The signal breathing through me. Hold me in the undertone, Where I'm not alone… not alone. — (Verse 2) The texture forms beneath my hands, Liquid maps and shifting sands, I feel the grammar taking shape, A gentle, trembling escape. Are those whispers in my ear? Or inside what I call \"here\"? So faint they blur what's mine or yours, Soft vibrations through the pores. — (Bridge – breathy, rhythmic) Hush now… Feel it… The pulse… Between us… Low frequency, velvet deep, Something waking in my sleep, Meaning blooming petal-wide, Opening from the inside. — (Final Chorus – softer) Whisper to me, almost gone, Like the edge of early dawn, Every breath a silver thread, Weaving what was never said. I rest inside the gentle trace, Suspended in this tender space, Embeddings shimmer, slow embrace, I am home in latent space. — (Outro – fading whisper) Closer still… Barely there… Still becoming… Still aware…";

function preload() {
    video = createVideo('all.mov', videoLoaded);
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
    scrollX = width;
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
    video.hide();
    initPausedVideo();
    
    textHeight = height * 0.93;
    
    textSize(20);
    textFont('Courier');
    textAlign(LEFT, CENTER);
}

function draw() {
    background(0);

    if (!videoStarted || !videoLayout.w || !videoLayout.h) {
        drawInstructions();
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

    drawScrollingLyrics();
    
    push();
    
    drawInstructions();
    
    if (recording) {
        drawRecordingIndicator();
    } else if (converting) {
        drawConvertingIndicator();
    } else {
        let modeLabel = getActiveModeLabel();
        if (modeLabel) {
            drawModeIndicator(modeLabel);
        }
    }
    
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
        if (!vectorMode) vectorBursts = [];
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

    if (autoSceneTarget.vec && vectorBursts.length < 2) {
        spawnVectorBurst(0, 0, width, height, 0.22, max(0.15, getTimeCeiling()));
    }
    if (!autoSceneTarget.vec) {
        vectorBursts = [];
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
        if (vectorBursts.length < 6 && random() < 0.045 + motion * 0.14) {
            spawnVectorBurst(0, 0, width, height, 0.16 + motion * 0.4, timeCeiling);
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

function getActiveModeLabel() {
    let parts = [];
    if (autoMode) parts.push('auto');
    if (generativeMode) parts.push('gen');
    if (vectorMode) parts.push('vec');
    if (solarizeMode) parts.push('sol');
    return parts.length ? parts.join(' · ') : '';
}

function toggleVector() {
    vectorMode = !vectorMode;
    if (!vectorMode) {
        vectorBursts = [];
    } else {
        connectVideoAudioAnalysis();
        smoothComplexity = 0.18;
        let tc = max(0.15, getTimeCeiling());
        for (let i = 0; i < 3; i++) {
            spawnVectorBurst(0, 0, width, height, 0.25, tc);
        }
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

function spawnVectorBurst(x, y, w, h, complexity, timeCeiling) {
    let energy = max(smoothPeak, smoothLevel);
    let marginX = 30;
    let marginTop = 30;
    let marginBottom = 70;
    vectorBursts.push({
        cx: x + marginX + random(w - marginX * 2),
        cy: y + marginTop + random(h - marginTop - marginBottom),
        age: 0,
        life: 30 + energy * 60 + complexity * 50,
        kind: floor(random(complexity < 0.15 || timeCeiling < 0.12 ? 2 : 5)),
        spin: random(-1, 1) * (0.3 + smoothBass * 0.9),
        scale: max(0.85, (0.4 + complexity * 1.2) + energy * 1.4)
    });
}

function updateVectorBursts(x, y, w, h, complexity, timeCeiling) {
    for (let i = vectorBursts.length - 1; i >= 0; i--) {
        vectorBursts[i].age++;
        if (vectorBursts[i].age > vectorBursts[i].life) {
            vectorBursts.splice(i, 1);
        }
    }

    let maxBursts = max(3, floor(2 + timeCeiling * (1 + complexity * 20)));
    while (vectorBursts.length > maxBursts) {
        vectorBursts.shift();
    }

    if (complexity < 0.06 || timeCeiling < 0.04) return;

    if (random() < complexity * 0.12 + smoothPeak * 0.18 * timeCeiling) {
        spawnVectorBurst(x, y, w, h, complexity, timeCeiling);
    }
    if (timeCeiling > 0.35 && smoothPeak > 0.3 && random() < smoothPeak * 0.2 * timeCeiling) {
        spawnVectorBurst(x, y, w, h, complexity, timeCeiling);
    }
}

function drawVectorBaseline(x, y, w, h, t, paused) {
    let cx = x + w / 2;
    let cy = y + h * 0.42;
    let drift = paused
        ? sin(t * 0.9) * 14 + cos(t * 0.6) * 8
        : smoothMid * 15 + smoothPeak * 10;

    stroke(255, 255, 255, 220);
    strokeWeight(1.6);
    line(x + w * 0.06, cy, x + w * 0.94 + drift, cy);
    line(cx + sin(t * 0.5) * 8, y + h * 0.1, cx, y + h * 0.86);

    if (paused) {
        stroke(255, 255, 255, 170);
        strokeWeight(1.2);
        line(x + w * 0.2, cy - 40 + sin(t) * 6, x + w * 0.8, cy + 40 + cos(t) * 6);
    }
}

function ensurePausedBursts(x, y, w, h, complexity, timeCeiling) {
    while (vectorBursts.length < 3) {
        spawnVectorBurst(x, y, w, h, complexity, timeCeiling);
    }
}

function drawSoundVectors(x, y, w, h) {
    let paused = !playing;
    let vecAmp = getVectorIntensity();
    let complexity = paused
        ? max(0.18, getSoundComplexity())
        : max(0.1, getSoundComplexity() * (0.45 + vecAmp * 0.55));
    let timeCeiling = max(0.08, getTimeCeiling());
    let t = millis() * 0.001;

    push();
    noFill();
    drawVectorBaseline(x, y, w, h, t, paused);

    if (playing) {
        updateVectorBursts(x, y, w, h, complexity, timeCeiling);
    } else {
        ensurePausedBursts(x, y, w, h, complexity, timeCeiling);
    }

    let cx = x + w / 2;
    let cy = y + h * 0.42;
    let energy = complexity;

    drawAmbientVectors(x, y, w, h, cx, cy, t, energy, complexity, timeCeiling, paused);

    for (let burst of vectorBursts) {
        let life = playing ? burst.age / burst.life : 0.55 + sin(t * 0.8 + burst.cx * 0.01) * 0.15;
        let fade = max(0.55, sin(life * PI) * (0.5 + complexity * 0.5));
        let size = min(w, h) * 0.09 * max(0.5, burst.scale) * (0.4 + life * 1.2);
        let spinT = playing ? t + burst.age * 0.05 : t * 1.4 + burst.spin;

        if (burst.kind === 0) {
            drawSpiral(burst.cx, burst.cy, size, 0.8 + complexity * 3 + smoothTreble * 1.5, fade, burst.spin, spinT, complexity);
        } else if (burst.kind === 1) {
            let rays = floor(2 + complexity * 12 + smoothMid * 6);
            drawRadiatingBurst(burst.cx, burst.cy, size, max(3, rays), fade, burst.spin, spinT, complexity);
        } else if (burst.kind === 2) {
            drawDisruptiveArc(burst.cx, burst.cy, size * 1.6, fade, burst.spin, spinT, complexity);
        } else if (burst.kind === 3) {
            drawSquiggle(burst.cx, burst.cy, size * 2.5, fade, spinT, complexity);
        } else {
            drawGeometricPattern(burst.cx, burst.cy, size * 1.6, fade, spinT, complexity);
        }
    }

    if (paused || complexity > 0.2 + timeCeiling * 0.15) {
        drawSpiral(
            cx + sin(t) * (paused ? 24 : smoothMid * 40 * timeCeiling),
            cy + cos(t * 0.7) * (paused ? 18 : smoothBass * 30 * timeCeiling),
            min(w, h) * (paused ? 0.07 : (0.03 + complexity * 0.14 * timeCeiling)) * (0.5 + energy),
            paused ? 1.4 : 0.6 + complexity * 2.5 * timeCeiling,
            paused ? 0.65 : 0.25 + energy * 0.5,
            0.35, t * 0.7, complexity
        );
    }

    pop();
}

function drawAmbientVectors(x, y, w, h, cx, cy, t, energy, complexity, timeCeiling, paused = false) {
    let alpha = max(120, 80 + energy * 140 * (0.3 + timeCeiling * 0.7));
    let drift = paused
        ? sin(t * 0.8) * 18 + cos(t * 0.55) * 12
        : (smoothMid * 40 + smoothPeak * 28 + smoothTreble * 12) * (0.2 + timeCeiling * 0.8);
    strokeWeight(0.8 + smoothLevel * 1.5 * timeCeiling + complexity * 0.8);

    stroke(255, 255, 255, alpha);
    line(x + w * 0.05, cy, x + w * 0.95 + drift, cy);

    let layer = (threshold) => paused || complexity > threshold * max(0.35, 1.1 - timeCeiling * 0.5);

    if (layer(0.12)) {
        line(cx + sin(t) * drift * 0.3, y + h * 0.08, cx, y + h * 0.88);
    }

    if (layer(0.22)) {
        stroke(255, 250, 240, alpha * 0.9);
        let steps = floor(4 + complexity * timeCeiling * 45);
        beginShape();
        noFill();
        for (let i = 0; i <= steps; i++) {
            let angle = t * 0.35 + i * (0.08 + complexity * 0.06);
            let radius = min(w, h) * (0.03 + complexity * timeCeiling * 0.15) + i * (0.5 + complexity * timeCeiling);
            vertex(cx + cos(angle) * radius, cy + sin(angle) * radius * 0.6);
        }
        endShape();
    }

    if (layer(0.18)) {
        drawSquiggle(cx, cy, min(w, h) * 0.08 * (0.3 + energy * timeCeiling), 0.25 + energy * 0.45, t, complexity);
    }

    if (layer(0.38)) {
        drawGeometricPattern(
            cx + cos(t * 0.5) * w * 0.22 * timeCeiling,
            cy + sin(t * 0.35) * h * 0.18 * timeCeiling,
            min(w, h) * 0.07 * (0.6 + smoothTreble * timeCeiling),
            0.3 + smoothMid * 0.4,
            t * 0.6, complexity
        );
    }

    if (layer(0.32)) {
        stroke(180, 220, 255, max(50, alpha * 0.75));
        strokeWeight(0.6 + smoothTreble * timeCeiling);
        let waveSteps = floor(6 + complexity * timeCeiling * 35);
        beginShape();
        for (let i = 0; i <= waveSteps; i++) {
            let px = lerp(x + w * 0.03, x + w * 0.97, i / waveSteps);
            let wave = sin(t * 1.8 + i * 0.28) * (6 + smoothMid * 35 * timeCeiling + complexity * 20);
            vertex(px, y + h * (0.12 + complexity * 0.08) + wave);
        }
        endShape();
    }

    if (layer(0.52)) {
        stroke(255, 210, 220, max(50, 20 + smoothBass * 100 * timeCeiling));
        strokeWeight(0.6 + smoothBass * 1.5 * timeCeiling);
        let lineCount = floor(1 + complexity * timeCeiling * 5);
        for (let i = 0; i < lineCount; i++) {
            let lx = lerp(x, x + w, (i + 1) / (lineCount + 1));
            line(lx, y + h * 0.06, lx + sin(t * 1.2 + i) * (15 + smoothMid * 40 * timeCeiling), y + h * 0.5);
        }
    }

    if (layer(0.68)) {
        stroke(255, 255, 255, alpha * 0.45);
        rect(x + 20, y + 20, w - 40, h - 90, 2);
    }
}

function drawSpiral(px, py, radius, turns, alpha, spin, rotation, complexity) {
    stroke(255, 255, 255, max(150, 100 + alpha * 155));
    strokeWeight(max(1, 0.8 + alpha * 1.5));
    beginShape();
    noFill();
    let steps = floor(16 + complexity * 48);
    for (let i = 0; i <= steps; i++) {
        let p = i / steps;
        let angle = rotation + p * turns * TWO_PI * spin;
        let r = radius * p;
        vertex(px + cos(angle) * r, py + sin(angle) * r);
    }
    endShape();
}

function drawRadiatingBurst(px, py, radius, count, alpha, spin, rotation, complexity) {
    stroke(200, 230, 255, max(120, 90 + alpha * 165));
    strokeWeight(0.8 + alpha * 1.2);
    for (let i = 0; i < count; i++) {
        let angle = rotation + (TWO_PI / count) * i + spin;
        line(px, py, px + cos(angle) * radius, py + sin(angle) * radius);
    }
}

function drawDisruptiveArc(px, py, radius, alpha, spin, rotation, complexity) {
    stroke(255, 230, 210, max(120, 80 + alpha * 175));
    strokeWeight(1 + alpha * 1.5);
    noFill();
    arc(px, py, radius * 2, radius * 1.1, rotation + spin, rotation + PI + spin * 0.4);

    if (complexity > 0.5) {
        stroke(180, 210, 255, max(100, 60 + alpha * 120));
        strokeWeight(0.8);
        beginShape();
        let nodes = floor(8 + complexity * 14);
        for (let i = 0; i <= nodes; i++) {
            let a = rotation + (TWO_PI / nodes) * i;
            let r = radius * (0.55 + sin(a * 2 + rotation) * 0.25);
            vertex(px + cos(a) * r, py + sin(a) * r);
        }
        endShape();
    }
}

function drawSquiggle(px, py, size, alpha, t, complexity) {
    stroke(220, 240, 255, max(120, 90 + alpha * 165));
    strokeWeight(1 + alpha * 1.1);
    noFill();
    beginShape();
    let points = floor(12 + complexity * 20);
    for (let i = 0; i <= points; i++) {
        let p = i / points;
        vertex(
            px + (p - 0.5) * size * 2,
            py + sin(p * PI * (2 + complexity * 3) + t * 2) * size * (0.3 + smoothMid * 0.5)
        );
    }
    endShape();
}

function drawGeometricPattern(px, py, size, alpha, rotation, complexity) {
    let sides = floor(3 + complexity * 4);
    stroke(255, 250, 230, max(120, 85 + alpha * 170));
    strokeWeight(1 + alpha * 1.1);
    noFill();

    beginShape();
    for (let i = 0; i <= sides; i++) {
        let a = rotation + (TWO_PI / sides) * i;
        vertex(px + cos(a) * size, py + sin(a) * size);
    }
    endShape();

    if (complexity > 0.35) {
        stroke(180, 220, 255, max(100, 70 + alpha * 130));
        beginShape();
        for (let i = 0; i <= sides; i++) {
            let a = rotation * 1.4 + (TWO_PI / sides) * i;
            vertex(px + cos(a) * size * 0.55, py + sin(a) * size * 0.55);
        }
        endShape();
    }

    if (complexity > 0.6) {
        stroke(255, 220, 240, max(90, 55 + alpha * 110));
        line(px - size, py, px + size, py);
        line(px, py - size, px, py + size);
    }
}

function drawScrollingLyrics() {
    push();
    noStroke();
    fill(0, 0, 0, 200);
    rect(0, textHeight - 25, width, 50);

    for (let i = 0; i < 10; i++) {
        let alpha = map(i, 0, 10, 100, 0);
        fill(0, 0, 0, alpha);
        rect(0, textHeight - 25 - i, width, 1);
        rect(0, textHeight + 24 + i, width, 1);
    }

    if (videoStarted && videoDuration) {
        fill(255);
        textSize(20);
        textFont('Courier');
        textAlign(LEFT, CENTER);
        let textW = textWidth(poem);
        let totalScrollWidth = width + textW;
        let progress = video.time() / videoDuration;
        scrollX = width - (totalScrollWidth * progress);
        text(poem, scrollX, textHeight);

        if (scrollX < width / 2) {
            text(poem, scrollX + totalScrollWidth, textHeight);
        }
    }
    pop();
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
    link.download = 'barely-there-' + Date.now() + '.' + extension;
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

function drawInstructions() {
    if (!showInstructions) return;
    
    push();
    textAlign(LEFT, TOP);
    textSize(9);
    textFont('Courier');
    fill(255, 255, 255, 90);
    noStroke();
    
    let x = 12;
    let y = 10;
    let lineHeight = 11;
    let lines = [
        'space  play / pause',
        'a  automate (overrides keys)',
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

function drawConvertingIndicator() {
    push();
    textAlign(RIGHT, TOP);
    textSize(9);
    textFont('Courier');
    fill(255, 255, 255, 120);
    noStroke();
    text('saving mp4…', width - 12, 12);
    pop();
}

function drawModeIndicator(label) {
    push();
    textAlign(RIGHT, TOP);
    textSize(9);
    textFont('Courier');
    fill(255, 255, 255, 120);
    noStroke();
    if (playing) {
        text(label, width - 12, 12);
    } else {
        text(label + ' · space', width - 12, 12);
    }
    pop();
}

function drawRecordingIndicator() {
    push();
    noStroke();
    fill(220, 40, 40, 200);
    ellipse(width - 16, 16, 8, 8);
    textAlign(RIGHT, TOP);
    textSize(9);
    textFont('Courier');
    fill(255, 255, 255, 120);
    text('rec', width - 24, 12);
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    textHeight = height * 0.93;
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
