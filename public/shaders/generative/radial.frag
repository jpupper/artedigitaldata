#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_tile;
uniform float u_opacity;
uniform float u_speed;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;

void main() {
    vec2 st = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float t = u_time * u_speed * 0.8;
    float tile = max(1.0, u_tile);

    float r = length(st);
    float a = atan(st.y, st.x);

    // Spirals and radial wave interference
    float wave1 = sin(r * 12.0 * tile - t * 2.0 + a * 4.0);
    float wave2 = cos(r * 8.0 * tile + t * 1.5 - a * 6.0);
    float wave3 = sin((st.x * st.x + st.y * st.y) * 10.0 * tile - t * 3.0);

    float v = (wave1 + wave2 + wave3) / 3.0; // [-1, 1]
    float normV = clamp((v + 1.0) * 0.5, 0.0, 1.0);

    // 4-Color palette interpolation
    vec3 col;
    if (normV < 0.333) {
        col = mix(u_color1, u_color2, normV / 0.333);
    } else if (normV < 0.666) {
        col = mix(u_color2, u_color3, (normV - 0.333) / 0.333);
    } else {
        col = mix(u_color3, u_color4, (normV - 0.666) / 0.334);
    }

    // Edge radial vignette fade
    float ringPattern = sin(r * 20.0 * tile - t * 4.0) * 0.5 + 0.5;
    col *= (0.7 + 0.3 * ringPattern);

    fragColor = vec4(col * u_opacity, u_opacity);
}
