precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

// Noise utilities
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Inner mask: Behind the logo disc (dist < innerRadius), alpha is 0 so background letters show through
    float innerRadius = 0.28;
    float outerRadius = 0.48;

    if (dist < innerRadius) {
        gl_FragColor = vec4(0.0);
        return;
    }

    // Dynamic solar turbulence and ray flares
    float time = u_time * 0.5;
    float fbmVal = fbm(vec2(angle * 4.0 + time * 0.2, dist * 8.0 - time * 0.6));
    float flares = fbm(vec2(angle * 8.0 - time * 0.4, dist * 5.0));
    
    // Corona gradient falloff
    float edgeSmooth = smoothstep(innerRadius, innerRadius + 0.03, dist);
    float fadeOut = smoothstep(outerRadius, innerRadius + 0.01, dist);
    
    float intensity = (0.55 + 0.45 * fbmVal) * fadeOut * edgeSmooth;
    intensity += 0.4 * flares * fadeOut * edgeSmooth;

    // Fiery solar color palette (Gold / Orange / Deep Red)
    vec3 coreColor = vec3(1.0, 0.88, 0.35);
    vec3 midColor = vec3(1.0, 0.42, 0.02);
    vec3 outerColor = vec3(0.85, 0.12, 0.0);

    float colorMix = smoothstep(innerRadius, outerRadius, dist);
    vec3 sunColor = mix(mix(coreColor, midColor, colorMix * 1.4), outerColor, colorMix);

    float alpha = clamp(intensity * 1.25, 0.0, 1.0);
    gl_FragColor = vec4(sunColor * alpha, alpha);
}
