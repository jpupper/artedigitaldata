#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform sampler2D u_noiseTexture;
uniform sampler2D iChannel0;
uniform float u_charSize;   // Tileo de la grilla ASCII (px)
uniform float u_glyphScale; // Tamaño de cada letra dentro de la celda (0.2 a 1.5)
uniform float u_opacity;
uniform int u_fontMode;    // Modo de tipografía ASCII (0 = Standard 5x5, 1 = Binary 0/1, 2 = Matrix Hex, 3 = Minimal Dots)

// Función de dibujo de bitmask de caracter 5x5
float character(int n, vec2 p) {
    p = floor(p);
    if (p.x >= 0.0 && p.x <= 4.0 && p.y >= 0.0 && p.y <= 4.0) {
        int a = int(p.x) + 5 * int(p.y);
        if (((n >> a) & 1) == 1) return 1.0;
    }
    return 0.0;
}

// Mapa tipográfico configurable por u_fontMode
int getCharBitmask(float gray, vec2 cellCoord) {
    int idx = int(clamp(gray * 31.0, 0.0, 31.0));

    // Modo 1: Binary (0 y 1)
    if (u_fontMode == 1) {
        if (idx < 2) return 0; // espacio
        if (idx < 17) return 15255086; // 0 bitmask
        return 32641183; // 1 bitmask
    }

    // Modo 2: Matrix Hex (0-9, A-F)
    if (u_fontMode == 2) {
        int hexChars[16];
        hexChars[0]  = 15255086; // 0
        hexChars[1]  = 32641183; // 1
        hexChars[2]  = 32540703; // 2
        hexChars[3]  = 32540687; // 3
        hexChars[4]  = 18415121; // 4
        hexChars[5]  = 32603679; // 5
        hexChars[6]  = 32603695; // 6
        hexChars[7]  = 32514081; // 7
        hexChars[8]  = 32554031; // 8
        hexChars[9]  = 32554015; // 9
        hexChars[10] = 18415150; // A
        hexChars[11] = 16301619; // B
        hexChars[12] = 31491102; // C
        hexChars[13] = 7652647;  // D
        hexChars[14] = 32554047; // E
        hexChars[15] = 1096767;  // F
        if (idx < 2) return 0;
        int hIdx = int(clamp(gray * 15.0, 0.0, 15.0));
        return hexChars[hIdx];
    }

    // Modo 3: Minimal Dots & Rings
    if (u_fontMode == 3) {
        if (idx < 4) return 0;
        if (idx < 12) return 4096;    // .
        if (idx < 20) return 65600;   // :
        if (idx < 28) return 147584;  // +
        return 332772;                // *
    }

    // Modo 0 (Por defecto): Mapa completo 32 caracteres ASCII 5x5 (A-Z, números y símbolos)
    int chars[32];
    chars[0]  = 0;        // (espacio)
    chars[1]  = 4096;     // . (punto centro)
    chars[2]  = 131072;   // , (coma)
    chars[3]  = 65600;    // : (dos puntos)
    chars[4]  = 67648;    // ; (punto y coma)
    chars[5]  = 32641183; // I
    chars[6]  = 4329631;  // T
    chars[7]  = 32539681; // L
    chars[8]  = 147584;   // +
    chars[9]  = 332772;   // *
    chars[10] = 31491102; // C
    chars[11] = 1096767;  // F
    chars[12] = 16267294; // S
    chars[13] = 4539953;  // V
    chars[14] = 1097255;  // P
    chars[15] = 32554047; // E
    chars[16] = 18415150; // A
    chars[17] = 7652647;  // D
    chars[18] = 18415153; // H
    chars[19] = 18128177; // K
    chars[20] = 18437745; // N
    chars[21] = 18136623; // R
    chars[22] = 15255086; // O
    chars[23] = 15255089; // U
    chars[24] = 18157905; // X
    chars[25] = 32575775; // Z
    chars[26] = 16301619; // B
    chars[27] = 32044094; // G
    chars[28] = 18142766; // Q
    chars[29] = 18405233; // M
    chars[30] = 18732593; // W
    chars[31] = 11512810; // # (trama tipográfica)

    return chars[idx];
}

void main() {
    vec2 pix = gl_FragCoord.xy;
    float charSize = max(4.0, u_charSize);
    
    // Muestrear en el centro de cada celda ASCII en UV [0..1]
    vec2 cellCoord = floor(pix / charSize);
    vec2 cellCenter = (cellCoord + 0.5) * charSize;
    vec2 cellUV = cellCenter / u_resolution.xy;
    
    // Muestrear color de la textura del noise de entrada (FBO)
    vec4 noiseColor = texture(u_noiseTexture, cellUV);
    if (noiseColor.a <= 0.0001) {
        noiseColor = texture(iChannel0, cellUV);
    }

    // Luminancia real del color del noise
    float gray = dot(noiseColor.rgb, vec3(0.299, 0.587, 0.114));
    
    int n = getCharBitmask(gray, cellCoord);
    if (n == 0 || noiseColor.a <= 0.001) {
        fragColor = vec4(0.0);
        return;
    }

    // Coordenadas UV locales [0..1] dentro de la celda actual
    vec2 localUV = mod(pix, charSize) / charSize;

    // Escala independiente de la letra dentro de la celda (u_glyphScale)
    float scale = max(0.1, u_glyphScale);
    vec2 p = (localUV - 0.5) / scale + 0.5;
    p *= 5.0;
    p.y = 4.0 - p.y;

    float charMask = character(n, p);
    
    fragColor = vec4(noiseColor.rgb * charMask * u_opacity, noiseColor.a * charMask * u_opacity);
}
