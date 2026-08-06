# Barely There

![Screenshot 1](all1.png)

**Barely There** is an interactive visual piece for a song sung with ASMR. The lyrics explore the latent space as an intimate space—soft, close, and barely present. Video, scrolling lyrics, and generative visuals respond to playback and sound.

## Live App

**[View Live →](https://marlonbarrios.github.io/barely_there/)**

## Repository

**[github.com/marlonbarrios/barely_there](https://github.com/marlonbarrios/barely_there)**

```bash
git clone https://github.com/marlonbarrios/barely_there.git
```

![Screenshot 2](all2.png)

## Description

The video loads **paused** on the first frame. Press **Space** to play or pause. Lyrics scroll in sync with the video. On-screen hints (top-left) list the controls; press **H** to hide them. Active modes appear top-right (`gen`, `vec`, `sol`, `auto`).

You can perform the piece manually—toggling effects and zoom—or press **A** to let the app cycle through visual combinations on its own.

## Controls

| Key | Action |
|-----|--------|
| **Space** | Play / pause |
| **A** | Toggle **automate** — random visual scenes driven by sound (overrides G, V, S, Z, F while active) |
| **G** | Toggle **generative** video effects (RGB split, bloom, invert, drift, etc.) |
| **S** | Toggle **solarize** — strong white solarization overlay |
| **V** | Toggle **vectors** — sound-reactive lines, spirals, and geometry |
| **Z** | Zoom in (hold for slow drift) |
| **F** | Zoom out (hold for slow drift) |
| **L** | Toggle loop |
| **R** | Start / stop canvas recording |
| **D** | Download recording as MP4 (WebM converted in-browser when needed) |
| **H** | Hide / show on-screen hints |

## Manual Mode

When **automate** is off, each key controls one layer independently. Effects can be combined:

- **Generative (G)** — Color overlays on the video that pulse with bass, mids, and treble. Cycles through five variants on audio peaks and over time. Only renders while playing.
- **Solarize (S)** — A dedicated high-contrast white solarize pass, independent of generative mode. Works while paused or playing; intensity follows peaks when playing.
- **Vectors (V)** — White vector graphics across the full window. Complexity grows with song progress and sound amplitude. Works while paused (gentle idle animation) or playing (audio-reactive bursts).
- **Zoom (Z / F)** — Scales the video within the window (1× to 3.5×), centered and clipped to the frame. Smooth, slow movement when holding the keys.

While playing, active manual effects subtly respond to the music (brightness, density, intensity)—but only **you** decide which layers are on.

## Automate Mode (A)

Press **A** while playing to hand control to the system. It picks random combinations of generative, vectors, solarize, and zoom every **1–6 seconds**, so you see many different visual possibilities over time:

- Sometimes one effect alone, sometimes several at once, sometimes none
- Zoom often stays at full frame; when it changes, the move is a **very slow swim** in or out
- Sound can nudge choices (peaks → solarize, mids → vectors, energy → generative)
- Generative variant shuffles randomly during automate

Press **A** again to exit automate. Your previous manual settings (which effects were on and your zoom level) are restored.

## Recording

1. Press **R** to start recording the canvas (and video audio when available).
2. Press **R** again to stop.
3. Press **D** to download. Chrome may save WebM first and convert to MP4 via ffmpeg.wasm.

## Technical Details

- **Stack:** p5.js, p5.sound, Web Audio API (`AnalyserNode` on the video element)
- **Video:** Loads paused at frame 0; scaled to window height, centered, aspect ratio preserved
- **Lyrics:** Scrolling ticker synced to `video.time() / duration`
- **Generative:** 2D blend-mode overlays (no WebGL shader); five cycling variants
- **Vectors:** Time ceiling × sound amplitude for complexity; burst system for spirals, arcs, squiggles, geometry
- **Solarize:** Multi-pass grayscale contrast / invert / screen stack
- **Zoom:** `videoZoom` lerps toward target; slower easing in automate mode
- **Automate:** Scene picker with weighted random combos; snapshot restores manual state on exit

## Local Development

1. Clone this repository:

   ```bash
   git clone https://github.com/marlonbarrios/barely_there.git
   cd barely_there
   ```

2. Serve the folder with a local web server (required for video and audio analysis — do not open as `file://`):

   ```bash
   python -m http.server 8000
   ```

3. Open `http://localhost:8000` in a browser

## Credits

- Concept & Development: Marlon Barrios Solano
- Technical implementation: p5.js

## License

MIT License

Copyright (c) 2024 Marlon Barrios Solano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
