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
    float t = u_time * u_speed * 0.7;
    float tile = max(1.0, u_tile);

    float r = length(st);
    float a = atan(st.y, st.x);

    // Flower Mandala trigonometry math: N petals modulated by tile and time
    float petals = 5.0 + floor(mod(tile, 4.0)) * 2.0; // 5, 7, 9...
    float f = cos(a * petals + t * 2.0);
    float d = r - (0.5 + 0.3 * f);

    // Layered petal shapes
    float shape1 = smoothstep(-0.2, 0.4, cos(d * 15.0 * tile - t * 3.0));
    float shape2 = sin(a * (petals + 2.0) - r * 10.0 + t) * 0.5 + 0.5;

    float val = clamp(shape1 * 0.6 + shape2 * 0.4, 0.0, 1.0);

    // 4-Color palette interpolation
    vec3 col;
    if (val < 0.333) {
        col = mix(u_color1, u_color2, val / 0.333);
    } else if (val < 0.666) {
        col = mix(u_color2, u_color3, (val - 0.333) / 0.333);
    } else {
        col = mix(u_color3, u_color4, (val - 0.666) / 0.334);
    }

    // Outer glow highlight
    col += u_color1 * (0.2 / (r + 0.2)) * 0.3;

    fragColor = vec4(col * u_opacity, u_opacity);
}
