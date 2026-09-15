#version 300 es
precision highp float;
precision highp int;

// Global helper functions
float mapr(float value, float minOut, float maxOut) {
    return minOut + clamp(value, 0.0, 1.0) * (maxOut - minOut);
}
