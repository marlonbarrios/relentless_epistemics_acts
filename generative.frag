precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uTexture;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uLevel;
uniform float uPeak;

vec3 solarize(vec3 color, float amount) {
    float fold = 1.0 + amount * 8.0;
    return abs(sin(color * 3.14159265 * fold));
}

vec3 posterize(vec3 color, float steps) {
    return floor(color * steps) / steps;
}

void main() {
    vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);

    float energy = max(uLevel, uPeak * 0.85);
    float split = 0.04 + uBass * 0.14 + uTreble * 0.06 + uPeak * 0.08;
    vec2 rUV = uv + vec2(split, split * 0.5);
    vec2 bUV = uv - vec2(split * 0.9, split * 0.35);

    vec3 color = vec3(
        texture2D(uTexture, rUV).r,
        texture2D(uTexture, uv).g,
        texture2D(uTexture, bUV).b
    );

    color.r *= 0.35 + uBass * 2.2 + uPeak * 0.8;
    color.g *= 0.35 + uMid * 2.0 + energy * 0.5;
    color.b *= 0.35 + uTreble * 2.4 + uPeak * 0.6;

    vec3 solar = solarize(color, energy);
    color = mix(color, solar, 0.45 + energy * 0.55);

    float steps = mix(16.0, 3.0, uTreble + uPeak * 0.5);
    color = mix(color, posterize(color, steps), 0.35 + uTreble * 0.55);

    float invertAmount = smoothstep(0.25, 0.95, uBass + uPeak * 0.4) * 0.55;
    color = mix(color, 1.0 - color, invertAmount);

    float contrast = 1.0 + uMid * 1.2 + uPeak * 0.6;
    color = (color - 0.5) * contrast + 0.5;

    color = clamp(color * (0.65 + energy * 0.9 + uPeak * 0.5), 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
}
