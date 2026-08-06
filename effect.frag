precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

void main() {
    vec2 uv = vTexCoord;
    
    // Center coordinates
    vec2 center = vec2(0.5, 0.5) + uMouse * 0.1;
    
    // Calculate distance from center
    float dist = distance(uv, center);
    
    // Create lens distortion
    float strength = 0.5 + sin(uTime) * 0.1;
    float distortion = 1.0 + strength * dist * dist;
    
    // Apply distortion
    vec2 distortedUV = center + (uv - center) * distortion;
    
    // Add chromatic aberration
    float r = texture2D(uTexture, distortedUV + vec2(0.01, 0.0)).r;
    float g = texture2D(uTexture, distortedUV).g;
    float b = texture2D(uTexture, distortedUV - vec2(0.01, 0.0)).b;
    
    gl_FragColor = vec4(r, g, b, 1.0);
} 