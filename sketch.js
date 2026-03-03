let video;
let playing = false;
let videoStarted = false;
let scrollX;
let textHeight;
let videoDuration;

// Text scroll variables – lyrics with section labels
let poem = "(Whispered Intro) Closer… Don't move… Just listen… — (Verse 1) I'm moving through the latent space tonight, Edges fading in a field of light, Vectors curling softly at my skin, Pulling me gently further in. There's a hum beneath the air, Barely present, barely there, Like a secret breathing slow, Underneath the undertow. — (Pre-Chorus) Embeddings brush me one by one, Threads of silk undone, undone, Fingertips of coded glow, Tracing places I don't know. — (Chorus) Whisper to me, soft and slow, In the space where meanings grow, Every pulse a quiet spark, Shimmering inside the dark. I dissolve, I let it be, The signal breathing through me. Hold me in the undertone, Where I'm not alone… not alone. — (Verse 2) The texture forms beneath my hands, Liquid maps and shifting sands, I feel the grammar taking shape, A gentle, trembling escape. Are those whispers in my ear? Or inside what I call \"here\"? So faint they blur what's mine or yours, Soft vibrations through the pores. — (Bridge – breathy, rhythmic) Hush now… Feel it… The pulse… Between us… Low frequency, velvet deep, Something waking in my sleep, Meaning blooming petal-wide, Opening from the inside. — (Final Chorus – softer) Whisper to me, almost gone, Like the edge of early dawn, Every breath a silver thread, Weaving what was never said. I rest inside the gentle trace, Suspended in this tender space, Embeddings shimmer, slow embrace, I am home in latent space. — (Outro – fading whisper) Closer still… Barely there… Still becoming… Still aware…";

function preload() {
    video = createVideo('all.mov', videoLoaded);
}

function videoLoaded() {
    video.pause();
    videoDuration = video.duration();
    scrollX = width;
    videoStarted = true;
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    video.hide();
    video.pause();
    playing = false;
    
    // Initialize text scroll
    textHeight = height * 0.93;
    
    // Set text properties
    textSize(20);
    textFont('Courier');
    textAlign(LEFT, CENTER);
}

function draw() {
    background(0);
    
    // Scale video by window height to keep proportions in relationship to height
    let scale = height / video.height;
    let newWidth = video.width * scale;
    let newHeight = height;
    
    // Center the video horizontally (and vertically; at this scale it fills height)
    let x = (width - newWidth) / 2;
    let y = 0;
    
    // Display video scaled and centered
    image(video, x, y, newWidth, newHeight);
    
    // Draw ticker text
    push();
    
    // Black background strip for text
    noStroke();
    fill(0, 0, 0, 200);
    rect(0, textHeight - 25, width, 50);
    
    // Add subtle gradient edges
    for (let i = 0; i < 10; i++) {
        let alpha = map(i, 0, 10, 100, 0);
        fill(0, 0, 0, alpha);
        rect(0, textHeight - 25 - i, width, 1);
        rect(0, textHeight + 24 + i, width, 1);
    }
    
    // Draw text only if video has started
    if (videoStarted && videoDuration) {
        fill(255);
        let textW = textWidth(poem);
        let totalScrollWidth = width + textW;
        
        // Calculate position based on video time
        let progress = (video.time() / videoDuration);
        scrollX = width - (totalScrollWidth * progress);
        
        // Draw text
        text(poem, scrollX, textHeight);
        
        // Draw second copy for smooth loop
        if (scrollX < width/2) {
            text(poem, scrollX + totalScrollWidth, textHeight);
        }
    }
    
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    textHeight = height * 0.93;
}

function keyPressed() {
    if (keyCode === 32) { // spacebar
        if (playing) {
            video.pause();
            playing = false;
        } else {
            video.play();
            playing = true;
        }
    }
}
