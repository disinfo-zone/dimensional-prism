precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float complexity;
uniform float speed;
uniform float colorSpeed;
uniform float size;
uniform float mirrorFolds;
uniform float mirrorAngle;
uniform vec2 centerPoint;
uniform int colorPalette;
uniform float saturation;
uniform float exposure;
uniform vec2 mirrorPoints[4];
uniform int mirrorPointCount; 
uniform float pixelSides;
uniform float pixelSize;
uniform float pixelAspect;
uniform bool enablePixelation;
uniform float hueShift;
uniform float contrast;
uniform int noiseType;
uniform float noiseScale;
uniform int octaves;
uniform float persistence;
uniform float lacunarity;
uniform float domainWarp;
uniform float zoomLevel;

const float PI = 3.14159265359;

// Base hash function
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Single value hash
float hash(vec2 p) {
    p = fract(p * vec2(123.45, 678.90));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// 2D Perlin noise
float perlinNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Simplex noise
float simplexNoise(vec2 p) {
    const float K1 = 0.366025404;
    const float K2 = 0.211324865;
    
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    vec2 o = step(a.yx, a.xy);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    
    vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
    
    return dot(n, vec3(70.0));
}

// Voronoi noise
float voronoiNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    float minDist = 1.0;
    
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash2(i + neighbor);
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            minDist = min(minDist, dist);
        }
    }
    
    return minDist;
}

// Basic noise function
float getNoise(vec2 p, int type) {
    if(type == 0) {
        return sin(p.x + cos(p.y)) * cos(p.y + sin(p.x));
    } else if(type == 1) {
        return perlinNoise(p);
    } else if(type == 2) {
        return simplexNoise(p);
    } else if(type == 3) {
        return voronoiNoise(p);
    }
    return 0.0;
}

// Fractal Brownian Motion (fBm)
float fbm(vec2 p, int type) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for(int i = 0; i < 8; i++) {
        if(i >= octaves) break;
        value += amplitude * getNoise(p * frequency, type);
        maxValue += amplitude;
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    
    return value / maxValue;
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 reinhardToneMapping(vec3 color, float exposureEV) {
    // Convert EV to linear multiplier
    float exposure = pow(2.0, exposureEV);
            
    // Apply exposure while preserving hue ratios
    color *= exposure;
            
    // Calculate luminance using perceptual weights
    float L = dot(color, vec3(0.2126, 0.7152, 0.0722));
            
    // Reinhard operator with improved highlight handling
    float Lwhite = 4.0; // White point
    L = (L * (1.0 + L/(Lwhite*Lwhite)))/(1.0 + L);
            
    // Preserve color ratios while applying tone mapping
    return color * (L / max(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0.001));
}

vec3 getPaletteColor(float t) {
    // First apply hue shift to the input parameter
    float hueOffset = hueShift / 360.0;
    t = fract(t + hueOffset); // Apply hue shift before any other color calculations
            
    // Generate full saturation color first
    vec3 color;
    float s = 1.0; // Use full saturation for initial color generation
            
    if (colorPalette == 0) { // Rainbow Flow
        color = hsv2rgb(vec3(t, s, 1.0));
    }
    else if (colorPalette == 1) { // Cosmos
        vec3 c1 = hsv2rgb(vec3(0.72 + hueOffset, s, 1.0)); // Deep purple
        vec3 c2 = hsv2rgb(vec3(0.65 + hueOffset, s, 1.0)); // Rich blue
        vec3 c3 = hsv2rgb(vec3(0.58 + hueOffset, s, 0.9)); // Bright blue
        color = mix(mix(c1, c2, t), c3, sin(t * PI * 1.5));
    }
    else if (colorPalette == 2) { // Forest
        vec3 c1 = hsv2rgb(vec3(0.25 + hueOffset, s, 0.9)); // Rich green
        vec3 c2 = hsv2rgb(vec3(0.32 + hueOffset, s * 0.9, 0.8)); // Moss
        vec3 c3 = hsv2rgb(vec3(0.12 + hueOffset, s * 0.8, 0.9)); // Golden
        color = mix(mix(c1, c2, t), c3, sin(t * PI * 0.8));
    }
    else if (colorPalette == 3) { // Ocean
        vec3 c1 = hsv2rgb(vec3(0.5 + hueOffset, s, 0.9)); // Deep teal
        vec3 c2 = hsv2rgb(vec3(0.55 + hueOffset, s * 0.9, 1.0)); // Bright aqua
        vec3 c3 = hsv2rgb(vec3(0.48 + hueOffset, s * 0.95, 0.85)); // Sea blue
        color = mix(mix(c1, c2, t), c3, sin(t * PI * 1.2));
    }
    else if (colorPalette == 4) { // Sunset
        vec3 c1 = hsv2rgb(vec3(0.05 + hueOffset, s, 1.0)); // Orange
        vec3 c2 = hsv2rgb(vec3(0.95 + hueOffset, s * 0.9, 0.9)); // Pink
        vec3 c3 = hsv2rgb(vec3(0.75 + hueOffset, s * 0.85, 0.8)); // Purple
        color = mix(mix(c1, c2, t), c3, sin(t * PI * 0.7));
    }
    else if (colorPalette == 5) { // Northern Lights
        vec3 c1 = hsv2rgb(vec3(0.35 + hueOffset, s * 0.9, 1.0)); // Ethereal green
        vec3 c2 = hsv2rgb(vec3(0.45 + hueOffset, s * 0.8, 0.9)); // Cyan
        vec3 c3 = hsv2rgb(vec3(0.6 + hueOffset, s * 0.85, 0.95)); // Blue
        color = mix(mix(c1, c2, t), c3, sin(t * PI * 2.0));
    }
    else if (colorPalette == 6) { // Crystal
        vec3 c1 = hsv2rgb(vec3(0.5 + hueOffset, s * 0.3, 1.0)); // Ice blue
        vec3 c2 = hsv2rgb(vec3(0.6 + hueOffset, s * 0.2, 0.95)); // Pale cyan
        vec3 c3 = hsv2rgb(vec3(0.45 + hueOffset, s * 0.4, 0.9)); // Cool blue
        color = mix(mix(c1, c2, t), c3, sin(t * PI * 1.3));
    }
    else { // Sacred Flame
        vec3 c1 = hsv2rgb(vec3(0.02 + hueOffset, s, 1.0)); // Bright red-orange
        vec3 c2 = hsv2rgb(vec3(0.05 + hueOffset, s * 0.95, 0.95)); // Orange
        vec3 c3 = hsv2rgb(vec3(0.08 + hueOffset, s * 0.9, 0.9)); // Gold
        color = mix(mix(c1, c2, t), c3, sin(t * PI * 1.1));
    }
            
    // Apply tone mapping first
    color = reinhardToneMapping(color, exposure);
            
    // Calculate luminance for true grayscale
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 grayscale = vec3(luminance);
            
    // Apply saturation
    float sat = saturation / 100.0;
    sat = pow(sat, 1.2);
    vec3 saturatedColor = mix(grayscale, color, sat);
            
    // Apply contrast as final step using proper gamma curve
    float cont = pow(2.0, contrast);
    vec3 finalColor = pow(saturatedColor, vec3(cont));
            
    // Ensure colors stay in valid range
    return clamp(finalColor, 0.0, 1.0);
}

vec2 pixelate(vec2 uv) {
    vec2 aspectCellSize = vec2(pixelSize * pixelAspect, pixelSize);
            
    // Square grid
    if (pixelSides == 4.0) {
        return floor(uv / aspectCellSize) * aspectCellSize + aspectCellSize * 0.5;
    }
            
    // Triangular grid
    else if (pixelSides == 3.0) {
        float triHeight = aspectCellSize.y * 0.866; // sqrt(3)/2
        float triWidth = aspectCellSize.x;
                
        float row = floor(uv.y / triHeight);
        float offset = mod(row, 2.0) * 0.5;
        float col = floor(uv.x / triWidth - offset);
                
        vec2 center = vec2(
            (col + offset + 0.5) * triWidth,
            (row + 0.5) * triHeight
        );
                
        // Find the nearest triangle center
        vec2 p = uv - center;
        float angle = atan(p.y, p.x) + PI;
        float sextant = floor(angle / (PI / 3.0));
        angle = (sextant + 0.5) * (PI / 3.0);
                
        return center + vec2(cos(angle), sin(angle)) * triWidth * 0.5;
    }
            
    // Hexagonal grid
    else if (pixelSides == 6.0) {
        float hexWidth = aspectCellSize.x * 1.5;
        float hexHeight = aspectCellSize.y * 0.866 * 2.0;
        vec2 repeating = vec2(hexWidth * 2.0, hexHeight);
        vec2 center = vec2(0.0);
        float offset = mod(floor(uv.y / hexHeight), 2.0) * hexWidth;
                
        vec2 coord = vec2(uv.x - offset, uv.y);
        center.x = floor(coord.x / repeating.x) * repeating.x + hexWidth;
        center.y = floor(coord.y / repeating.y) * repeating.y + hexHeight * 0.5;
                
        if (offset != 0.0) {
            center.x += hexWidth;
        }
                
        // Find the nearest hexagon center
        vec2 deltaFromCenter = uv - center;
        float angle = atan(deltaFromCenter.y, deltaFromCenter.x);
        angle = floor((angle + PI) / (PI / 3.0)) * (PI / 3.0);
                
        return center + vec2(cos(angle), sin(angle)) * hexWidth * 0.5;
    }
            
    return uv;
}

vec2 applyMirrors(vec2 uv) {
    vec2 result = uv;
            
    // Apply all mirror points iteratively
    for(int i = 0; i < 4; i++) {
        if(i >= mirrorPointCount) break;
                
        // Create a mirror line through the point
        // Using perpendicular vector (y, -x) as normal
        vec2 normal = normalize(vec2(mirrorPoints[i].y, -mirrorPoints[i].x));
                
        // Calculate signed distance to mirror line
        vec2 toPoint = result - mirrorPoints[i];
        float signedDist = dot(toPoint, normal);
                
        // Reflect point if it's on negative side of line
        if(signedDist < 0.0) {
            result = result - 2.0 * signedDist * normal;
        }
    }
    return result;
}
        
void main() {
    // Initialize UV coordinates
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
            
    // Apply zoom and pan in one step
    uv = uv * zoomLevel - centerPoint;
    
    // Store the original centerPoint + offset for later use
    vec2 totalOffset = centerPoint;
    
    // 1. First apply mirror point reflections
    vec2 mirroredUV = applyMirrors(uv);
    
    // 2. Then apply radial mirror folding
    vec2 centered = mirroredUV;
    float angle = mirrorAngle * PI / 180.0;
    vec2 rotatedUV = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * centered;
    
    float folds = PI / mirrorFolds;
    float a = atan(rotatedUV.y, rotatedUV.x);
    a = mod(a, folds * 2.0);
    if(a > folds) a = folds * 2.0 - a;
    
    float l = length(rotatedUV);
    vec2 foldedUV = vec2(cos(a), sin(a)) * l; // Remove centerPoint addition here
    
    // 3. Finally apply pixelation to the folded result
    vec2 finalUV = enablePixelation ? pixelate(foldedUV) : foldedUV;
        
    // Create organic flowing patterns using the final UV
    float t = time * speed;
    float pattern = 0.0;
    vec2 noiseUV = finalUV * noiseScale;
            
    // Apply domain warping if enabled
    if(domainWarp > 0.0) {
        vec2 warp = vec2(
            perlinNoise(noiseUV + t),
            perlinNoise(noiseUV + t + vec2(43.84, 38.32))
        );
        noiseUV += warp * domainWarp;
    }
            
    if(noiseType == 0) {
        // Sine wave pattern (original)
        pattern = fbm(noiseUV, 0);
        pattern *= (complexity / 20.0);
    } else if(noiseType == 1) {
        // Perlin noise
        pattern = fbm(noiseUV, 1);
        pattern *= (complexity / 8.0);
    } else if(noiseType == 2) {
        // Simplex noise
        pattern = fbm(noiseUV, 2);
        pattern *= (complexity / 8.0);
    } else if(noiseType == 3) {
        // Voronoi noise
        pattern = fbm(noiseUV, 3);
        pattern *= complexity;
    } else {
        // Legacy fbm (backwards compatibility)
        pattern = fbm(noiseUV, 1);
    }
            
    pattern *= size;
            
    vec3 color = getPaletteColor(pattern * 0.5 + time * colorSpeed);
    gl_FragColor = vec4(color, 1.0);
}