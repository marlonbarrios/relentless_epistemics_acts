attribute vec3 aPosition;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;

void main() {
    vec4 positionVec4 = vec4(aPosition, 1.0);
    gl_Position = positionVec4;
    vTexCoord = aTexCoord;
} 