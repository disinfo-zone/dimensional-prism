const vertexShaderSource = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
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
uniform float midtones;
uniform float highlights;
uniform float shadows;
uniform float colorBalance;

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

// RGB to XYZ conversion matrix
const mat3 RGB_2_XYZ = mat3(
    0.4124564, 0.3575761, 0.1804375,
    0.2126729, 0.7151522, 0.0721750,
    0.0193339, 0.1191920, 0.9503041
);

// XYZ to RGB conversion matrix  
const mat3 XYZ_2_RGB = mat3(
    3.2404542, -1.5371385, -0.4985314,
    -0.9692660,  1.8760108,  0.0415560,
    0.0556434, -0.2040259,  1.0572252
);

// Color space conversion helpers
vec3 rgb2linear(vec3 rgb) {
    return pow(max(rgb, 0.0), vec3(2.2));
}

vec3 linear2rgb(vec3 rgb) {
    return pow(max(rgb, 0.0), vec3(1.0/2.2));
}

// XYZ to LAB conversion
vec3 xyz2lab(vec3 xyz) {
    // D65 white point reference
    const vec3 white = vec3(0.95047, 1.0, 1.08883);
    vec3 v = xyz / white;
    
    v = mix(pow(v, vec3(1.0/3.0)), 
            7.787037 * v + vec3(0.137931),
            step(v, vec3(0.008856)));
            
    return vec3(116.0 * v.y - 16.0,
                500.0 * (v.x - v.y),
                200.0 * (v.y - v.z));
}

// LAB to LCH conversion
vec3 lab2lch(vec3 lab) {
    // Use .y and .z instead of .a and .b for the second and third components
    float h = atan(lab.z, lab.y);
    h = h < 0.0 ? h + 2.0 * PI : h;
    return vec3(
        lab.x, // L
        sqrt(lab.y * lab.y + lab.z * lab.z), // C 
        h * 180.0 / PI // H in degrees
    );
}

// LCH to LAB conversion
vec3 lch2lab(vec3 lch) {
    float h = lch.z * PI / 180.0;
    return vec3(
        lch.x,
        lch.y * cos(h),
        lch.y * sin(h)
    );
}

// Perceptual sigmoid function for contrast
float sigmoid(float x, float contrast) {
    float midpoint = 0.18; // middle gray
    float slope = contrast * 2.0;
    return 1.0 / (1.0 + exp(-slope * (x - midpoint)));
}

// ACES tone mapping
vec3 acesToneMapping(vec3 color) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}

vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 adjustSMH(vec3 color, float shadows, float midtones, float highlights) {
    // Convert values from -100,100 range to proper multipliers
    float shadowsMult = 1.0 + (shadows / 100.0);
    float midtonesMult = 1.0 + (midtones / 100.0);
    float highlightsMult = 1.0 + (highlights / 100.0);
    
    // Calculate luminance
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    
    // Apply adjustments based on luminance ranges
    vec3 adjusted = color;
    
    // Shadows (dark areas)
    adjusted = mix(adjusted, adjusted * shadowsMult, smoothstep(0.0, 0.5, 1.0 - luma));
    
    // Midtones (middle range)
    float midtoneMask = 1.0 - abs(luma - 0.5) * 2.0;
    adjusted = mix(adjusted, adjusted * midtonesMult, midtoneMask);
    
    // Highlights (bright areas)
    adjusted = mix(adjusted, adjusted * highlightsMult, smoothstep(0.5, 1.0, luma));
    
    return adjusted;
}

// LAB to XYZ conversion
vec3 lab2xyz(vec3 lab) {
    const vec3 white = vec3(0.95047, 1.0, 1.08883);
    float fy = (lab.x + 16.0) / 116.0;
    float fx = lab.y / 500.0 + fy;
    float fz = fy - lab.z / 200.0;
    
    vec3 f = vec3(fx, fy, fz);
    vec3 f3 = f * f * f;
    vec3 t = step(vec3(0.008856), f3);
    
    return white * mix(
        (f - vec3(16.0/116.0)) / 7.787037,
        f3,
        t
    );
}

// Color space compression for HDR 
vec3 compressHDR(vec3 color) {
    float L = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return color * (1.0 + L)/(1.0 + L * L);
}

// Inverse compression
vec3 expandHDR(vec3 color) {
    float L = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return color / ((1.0 + L)/(1.0 + L * L));
}

vec3 reinhardToneMapping(vec3 color, float exposureOffset) {
    // More aggressive highlight compression
    float L = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float Lwhite = 2.0; // Lower white point for more contrast
    
    float toneMappedLuma = (L * (1.0 + L/(Lwhite*Lwhite)))/(1.0 + L);
    return color * (toneMappedLuma / max(L, 0.001));
}


// Color harmony constants
const int HARMONY_SPECTRAL = 0;       // Rainbow/spectrum
const int HARMONY_COMPLEMENTARY = 1;   // 180° apart
const int HARMONY_ANALOGOUS = 2;       // Adjacent colors
const int HARMONY_TRIADIC = 3;         // 120° apart
const int HARMONY_SPLIT_COMPLEMENTARY = 4; // Base + 2 colors adjacent to complement
const int HARMONY_TETRADIC = 5;        // Double complementary
const int HARMONY_MONOCHROMATIC = 6;   // Single hue variations
const int HARMONY_ANALOGOUS_COMPLEMENT = 7; // Analogous + complement
const int HARMONY_SPLIT_ANALOGOUS = 8;  // Analogous with split
const int HARMONY_WEIGHTED_COMPLEMENT = 9; // Weighted complementary transition
const int HARMONY_DYNAMIC_MONO = 10;    // Dynamic monochromatic
const int HARMONY_COMPOUND_TERTIARY = 11; // Compound with tertiary colors
const int HARMONY_GRADIENT_SPECTRAL = 12; // Continuous spectral gradient

struct PaletteInfo {
    vec3 color1;
    vec3 color2;
    vec3 color3;
    vec3 color4;
    float blendMode;
};

PaletteInfo getPaletteInfo(int harmony, float t, float s) {
    PaletteInfo info;
    float hueOffset = hueShift / 360.0;
    
    if (harmony == HARMONY_SPECTRAL) { // Prismatic Flow
        info.color1 = vec3(t, s, 1.0);
        info.color2 = vec3(fract(t + 0.15), s * 0.95, 0.98);
        info.blendMode = 0.0; // dual blend
    }
    else if (harmony == HARMONY_COMPLEMENTARY) { // Solar Winds
        info.color1 = vec3(0.12 + hueOffset, s, 1.0);      // Warm gold
        info.color2 = vec3(0.62 + hueOffset, s * 0.9, 0.95); // Azure blue
        info.blendMode = 0.0;
    }
    else if (harmony == HARMONY_ANALOGOUS) { // Ethereal Mist
        info.color1 = vec3(0.45 + hueOffset, s * 0.9, 1.0);   // Aqua
        info.color2 = vec3(0.55 + hueOffset, s * 0.85, 0.95); // Sky blue
        info.blendMode = 0.0;
    }
    else if (harmony == HARMONY_TRIADIC) { // Terra Nova
        info.color1 = vec3(0.0 + hueOffset, s, 1.0);       // Primary
        info.color2 = vec3(0.33 + hueOffset, s * 0.9, 0.95); // +120°
        info.color3 = vec3(0.66 + hueOffset, s * 0.95, 0.9); // +240°
        info.blendMode = 1.0; // triple blend
    }
    else if (harmony == HARMONY_SPLIT_COMPLEMENTARY) { // Quantum Flux
        info.color1 = vec3(0.5 + hueOffset, s, 1.0);       // Base
        info.color2 = vec3(0.92 + hueOffset, s * 0.9, 0.95); // Split 1
        info.color3 = vec3(0.08 + hueOffset, s * 0.95, 0.9); // Split 2
        info.blendMode = 1.0;
    }
    else if (harmony == HARMONY_TETRADIC) { // Astral Dream
        info.color1 = vec3(0.0 + hueOffset, s, 1.0);       // Base
        info.color2 = vec3(0.25 + hueOffset, s * 0.9, 0.95); // +90°
        info.color3 = vec3(0.5 + hueOffset, s * 0.95, 0.9);  // +180°
        info.color4 = vec3(0.75 + hueOffset, s * 0.85, 0.95); // +270°
        info.blendMode = 2.0; // quad blend
    }
    else if (harmony == HARMONY_MONOCHROMATIC) { // Lunar Phase
        info.color1 = vec3(0.6 + hueOffset, s * 0.2, 1.0);    // Light
        info.color2 = vec3(0.6 + hueOffset, s * 0.4, 0.8);    // Medium
        info.color3 = vec3(0.6 + hueOffset, s * 0.6, 0.6);    // Dark
        info.blendMode = 1.0;
    }
    else if (harmony == HARMONY_ANALOGOUS_COMPLEMENT) { // Plasma Core
        info.color1 = vec3(0.95 + hueOffset, s, 1.0);         // Main
        info.color2 = vec3(0.05 + hueOffset, s * 0.9, 0.95);  // Analogous 1
        info.color3 = vec3(0.45 + hueOffset, s * 0.85, 0.9);  // Complement
        info.blendMode = 1.0;
    }
    else if (harmony == HARMONY_SPLIT_ANALOGOUS) { // Jade Dynasty
        info.color1 = vec3(0.3 + hueOffset, s, 0.95);       // Base green
        info.color2 = vec3(0.4 + hueOffset, s * 0.9, 0.9);  // Teal
        info.color3 = vec3(0.2 + hueOffset, s * 0.85, 1.0); // Yellow-green
        info.color4 = vec3(0.5 + hueOffset, s * 0.7, 0.85); // Blue accent
        info.blendMode = 2.0;
    }
    else if (harmony == HARMONY_WEIGHTED_COMPLEMENT) { // Twilight Cascade
        info.color1 = vec3(0.6 + hueOffset, s * 0.9, 1.0);   // Main
        info.color2 = vec3(0.1 + hueOffset, s * 0.8, 0.9);   // Complement
        info.color3 = vec3(0.65 + hueOffset, s * 0.7, 0.95); // Near main
        info.blendMode = 1.0;
    }
    else if (harmony == HARMONY_DYNAMIC_MONO) { // Arctic Aurora
        float base = 0.7 + hueOffset;
        info.color1 = vec3(base, s * 0.9, 1.0);
        info.color2 = vec3(fract(base + 0.05), s * 0.7, 0.9);
        info.color3 = vec3(fract(base - 0.05), s * 0.5, 0.8);
        info.blendMode = 1.0;
    }
    else if (harmony == HARMONY_COMPOUND_TERTIARY) { // Desert Mirage
        info.color1 = vec3(0.08 + hueOffset, s * 0.9, 1.0);  // Golden
        info.color2 = vec3(0.95 + hueOffset, s * 0.85, 0.9); // Rose
        info.color3 = vec3(0.45 + hueOffset, s * 0.8, 0.85); // Aqua
        info.color4 = vec3(0.2 + hueOffset, s * 0.75, 0.95); // Spring
        info.blendMode = 2.0;
    }
    else if (harmony == HARMONY_GRADIENT_SPECTRAL) { // Nebula Drift
        float phase = fract(t * 0.5);
        info.color1 = vec3(phase, s * 0.9, 1.0);
        info.color2 = vec3(fract(phase + 0.1), s * 0.85, 0.9);
        info.color3 = vec3(fract(phase + 0.2), s * 0.8, 0.85);
        info.blendMode = 1.0;
    }
    else { // Default fallback
        info.color1 = vec3(t, s, 1.0);
        info.color2 = vec3(fract(t + 0.5), s, 1.0);
        info.color3 = vec3(0.0);
        info.color4 = vec3(0.0);
        info.blendMode = 0.0;
    }
    return info;
}

vec3 blendPaletteColors(PaletteInfo info, float t) {
    vec3 c1 = hsv2rgb(info.color1);
    vec3 c2 = hsv2rgb(info.color2);
    
    if (info.blendMode < 0.5) {
        // Dual blend
        return mix(c1, c2, sin(t * PI * 2.0) * 0.5 + 0.5);
    } else if (info.blendMode < 1.5) {
        // Triple blend
        vec3 c3 = hsv2rgb(info.color3);
        float phase = fract(t * 3.0);
        if (phase < 0.333) {
            return mix(c1, c2, phase * 3.0);
        } else if (phase < 0.666) {
            return mix(c2, c3, (phase - 0.333) * 3.0);
        } else {
            return mix(c3, c1, (phase - 0.666) * 3.0);
        }
    } else {
        // Quad blend
        vec3 c3 = hsv2rgb(info.color3);
        vec3 c4 = hsv2rgb(info.color4);
        float phase = fract(t * 4.0);
        if (phase < 0.25) {
            return mix(c1, c2, phase * 4.0);
        } else if (phase < 0.5) {
            return mix(c2, c3, (phase - 0.25) * 4.0);
        } else if (phase < 0.75) {
            return mix(c3, c4, (phase - 0.5) * 4.0);
        } else {
            return mix(c4, c1, (phase - 0.75) * 4.0);
        }
    }
}

vec3 getPaletteColor(float t) {
    t = fract(t);
    
    // Apply hue shift first at palette level
    float globalHueShift = hueShift / 360.0;
    // Pass full saturation to palette, we'll adjust it later
    PaletteInfo info = getPaletteInfo(colorPalette, t + globalHueShift, 1.0);
    vec3 color = blendPaletteColors(info, t);
    
    // Convert to linear space
    vec3 linearRGB = rgb2linear(color);
    
    // Apply exposure
    float exposureMult = pow(2.0, exposure - 0.5);
    linearRGB *= exposureMult;
    
    // Contrast
    if (contrast != 1.0) {
        float midpoint = 0.18;
        linearRGB = pow(linearRGB, vec3(contrast));
        float midpointScale = pow(midpoint, contrast - 1.0);
        linearRGB *= midpointScale;
    }
    
    // Color grading
    linearRGB = adjustSMH(linearRGB, shadows, midtones, highlights);
    
    // Color balance
    if (colorBalance != 0.0) {
        float temp = colorBalance / 100.0;
        vec3 warmth = vec3(
            1.0 + max(temp, 0.0),
            1.0,
            1.0 + max(-temp, 0.0)
        );
        linearRGB *= warmth;
    }
    
    // ACES
    vec3 tonemapped = ACESFilm(linearRGB);
    
    // Convert back to sRGB
    vec3 sRGB = linear2rgb(tonemapped);
    
    // Apply saturation last (in sRGB space)
    float luma = dot(sRGB, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), sRGB, saturation / 100.0);
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
    
    // Convert to linear space for adjustments
    color = rgb2linear(color);
    
    // Apply SMH adjustments in linear space
    color = adjustSMH(color, shadows, midtones, highlights);
    
    // Apply color balance in linear space
    float balanceMult = colorBalance / 100.0;
    vec3 warmTint = vec3(
        1.0 + max(balanceMult, 0.0),
        1.0,
        1.0 + max(-balanceMult, 0.0)
    );
    color *= warmTint;
    
    // Convert back to sRGB for saturation
    color = linear2rgb(color);
    
    // Apply saturation last in sRGB space
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, saturation / 100.0);
    
    // Final clamp
    color = clamp(color, 0.0, 1.0);
    
    gl_FragColor = vec4(color, 1.0);
}
`;