#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

// Global uniforms (Excluded from parameter sliders)
uniform vec2 u_resolution;
uniform float u_time;

// Shader-specific uniforms
uniform float speed;
uniform float speedx;
uniform float speedy;
uniform float zoom;
uniform float tile;
uniform float iterations;
uniform float formuparam;
uniform float volsteps;
uniform float stepsize;
uniform float brightness;
uniform float darkmatter;
uniform float distfading;
uniform float saturation;
uniform float ma1;
uniform float ma2;

float mapr(float value, float minOut, float maxOut) {
    if (value > 1.0) return clamp(value, minOut, maxOut);
    return minOut + clamp(value, 0.0, 1.0) * (maxOut - minOut);
}

void main()
{
	// get coords and direction
	vec2 uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
	uv.y *= u_resolution.y / u_resolution.x;
	float z = max(0.05, zoom);
	vec3 dir = vec3(uv * z, 1.0);
	float time = u_time;

	// camera rotation
	float a1 = ma1 + 1.0 / u_resolution.x * 2.0;
	float a2 = ma2 + 1.0 / u_resolution.y * 2.0;
	mat2 rot1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
	mat2 rot2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
	dir.xz *= rot1;
	dir.xy *= rot2;

	// general speed modulates both forward motion and lateral speeds
	float sp = (speed <= 0.001) ? 1.0 : speed;
	float sx = (speedx - 0.5) * 0.08 * sp;
	float sy = (speedy - 0.5) * 0.08 * sp;
	float sz = 0.025 * sp;

	vec3 from = vec3(1.0, 0.5, 0.5);
	from += vec3(time * sx, time * sy, time * sz - 2.0);
	
	// volumetric rendering
	float s = 0.1, fade = 1.0;
	vec3 v = vec3(0.0);
	
	int mite = int(floor(mapr(iterations, 8.0, 22.0)));
	int mvolsteps = int(floor(mapr(volsteps, 6.0, 20.0)));
	float mbri = brightness > 0.02 ? brightness * 0.0035 : mapr(brightness, 0.0005, 0.0050);
	float mdarkmatter = mapr(darkmatter, 0.0, 1.5);
	float fparam = (formuparam <= 0.01) ? 0.53 : formuparam;
	float tsize = (tile <= 0.05) ? 0.85 : tile;
	float ssize = (stepsize <= 0.005) ? 0.1 : stepsize;

	for (int r = 0; r < mvolsteps; r++) {
		vec3 p = from + s * dir * 0.5;
		p = abs(vec3(tsize) - mod(p, vec3(tsize * 2.0))); // tiling fold
		float pa, a = pa = 0.0;
		for (int i = 0; i < mite; i++) { 
			p = abs(p) / dot(p, p) - fparam; // the magic formula
			a += abs(length(p) - pa); // absolute sum of average change
			pa = length(p);
		}
		float dm = max(0.0, mdarkmatter - a * a * 0.001); // dark matter
		a *= a * a; // add contrast
		if (r > 6) fade *= 1.0 - dm; // dark matter, don't render near
		v += fade * 0.6;
		v += vec3(s, s * s, s * s * s * s) * a * mbri * fade; // coloring based on distance
		fade *= max(0.1, distfading); // distance fading
		s += ssize;
	}
	v = mix(vec3(length(v)), v, saturation); // color adjust
	fragColor = vec4(clamp(v * 0.018, 0.0, 1.0), 1.0);
}
