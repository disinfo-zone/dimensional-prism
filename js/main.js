class Renderer {
    constructor() {
        // Defer full initialization until DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.canvas = document.getElementById('canvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }

        this.setupContext();
        if (!this.gl) return;

        this.setupWebGL();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Start render loop immediately after init
        this.startRenderLoop();
    }

    setupContext() {
        const contextAttributes = {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
            powerPreference: 'default'
        };

        try {
            this.gl = this.canvas.getContext('webgl2', contextAttributes) || 
                     this.canvas.getContext('webgl', contextAttributes);
            
            if (!this.gl) {
                console.error('WebGL not available');
                return;
            }

            // Enable required extensions
            this.gl.getExtension('OES_standard_derivatives');
            
        } catch (err) {
            console.error('WebGL context creation failed:', err);
        }
    }

    resizeCanvas() {
        const pixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * pixelRatio;
        this.canvas.height = window.innerHeight * pixelRatio;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    setupWebGL() {
        const gl = this.gl;
        
        // Create shader program
        this.program = gl.createProgram();
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        if (!vertexShader || !fragmentShader) {
            console.error('Failed to create shaders');
            return;
        }

        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Failed to link program:', gl.getProgramInfoLog(this.program));
            return;
        }

        gl.useProgram(this.program);
        
        // Setup vertices
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const positionLocation = gl.getAttribLocation(this.program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Setup uniforms
        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'resolution'),
            time: gl.getUniformLocation(this.program, 'time'),
            complexity: gl.getUniformLocation(this.program, 'complexity'),
            speed: gl.getUniformLocation(this.program, 'speed'),
            colorSpeed: gl.getUniformLocation(this.program, 'colorSpeed'),
            size: gl.getUniformLocation(this.program, 'size'),
            mirrorFolds: gl.getUniformLocation(this.program, 'mirrorFolds'),
            mirrorAngle: gl.getUniformLocation(this.program, 'mirrorAngle'),
            centerPoint: gl.getUniformLocation(this.program, 'centerPoint'),
            colorPalette: gl.getUniformLocation(this.program, 'colorPalette'),
            saturation: gl.getUniformLocation(this.program, 'saturation'),
            exposure: gl.getUniformLocation(this.program, 'exposure'),
            mirrorPoints: gl.getUniformLocation(this.program, 'mirrorPoints'),
            mirrorPointCount: gl.getUniformLocation(this.program, 'mirrorPointCount'),
            enablePixelation: gl.getUniformLocation(this.program, 'enablePixelation'),
            pixelSides: gl.getUniformLocation(this.program, 'pixelSides'),
            pixelSize: gl.getUniformLocation(this.program, 'pixelSize'),
            pixelAspect: gl.getUniformLocation(this.program, 'pixelAspect'),
            hueShift: gl.getUniformLocation(this.program, 'hueShift'),
            contrast: gl.getUniformLocation(this.program, 'contrast'),
            noiseType: gl.getUniformLocation(this.program, 'noiseType'),
            noiseScale: gl.getUniformLocation(this.program, 'noiseScale'),
            octaves: gl.getUniformLocation(this.program, 'octaves'),
            persistence: gl.getUniformLocation(this.program, 'persistence'),
            lacunarity: gl.getUniformLocation(this.program, 'lacunarity'),
            domainWarp: gl.getUniformLocation(this.program, 'domainWarp'),
            zoomLevel: gl.getUniformLocation(this.program, 'zoomLevel')
        };
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        return shader;
    }

    startRenderLoop() {
        const render = (time) => {
            time *= 0.001; // Convert to seconds
            const gl = this.gl;
            
            // Update uniforms
            gl.uniform2f(this.uniforms.centerPoint, 
                (parseFloat(document.getElementById('centerX').value) + camera.centerOffset.x) / camera.zoomLevel,
                (parseFloat(document.getElementById('centerY').value) + camera.centerOffset.y) / camera.zoomLevel
            );
            gl.uniform1f(this.uniforms.zoomLevel, camera.zoomLevel);
            gl.uniform1f(this.uniforms.time, time);
            gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
            gl.uniform1f(this.uniforms.complexity, parseFloat(document.getElementById('complexity').value));
            gl.uniform1f(this.uniforms.speed, parseFloat(document.getElementById('speed').value));
            gl.uniform1f(this.uniforms.colorSpeed, parseFloat(document.getElementById('colorSpeed').value));
            gl.uniform1f(this.uniforms.size, parseFloat(document.getElementById('size').value));
            gl.uniform1f(this.uniforms.mirrorFolds, parseFloat(document.getElementById('mirrorFolds').value));
            gl.uniform1f(this.uniforms.mirrorAngle, parseFloat(document.getElementById('mirrorAngle').value));
            
            // Color settings
            gl.uniform1i(this.uniforms.colorPalette, document.getElementById('colorPalette').selectedIndex);
            gl.uniform1f(this.uniforms.saturation, parseFloat(document.getElementById('saturation').value));
            gl.uniform1f(this.uniforms.exposure, parseFloat(document.getElementById('exposure').value));
            gl.uniform1f(this.uniforms.hueShift, parseFloat(document.getElementById('hueShift').value));
            gl.uniform1f(this.uniforms.contrast, parseFloat(document.getElementById('contrast').value));

            // Mirror points
            const mirrorPoints = controls.getMirrorPoints();
            const mirrorPointsArray = new Float32Array(mirrorPoints.flatMap(p => [p.x, p.y]));
            gl.uniform2fv(this.uniforms.mirrorPoints, mirrorPointsArray);
            gl.uniform1i(this.uniforms.mirrorPointCount, mirrorPoints.length);

            // Pixelation
            gl.uniform1i(this.uniforms.enablePixelation, document.getElementById('enablePixelation').checked);
            gl.uniform1f(this.uniforms.pixelSides, parseFloat(document.getElementById('pixelSides').value));
            gl.uniform1f(this.uniforms.pixelSize, parseFloat(document.getElementById('pixelSize').value));
            gl.uniform1f(this.uniforms.pixelAspect, parseFloat(document.getElementById('pixelAspect').value));

            // Noise settings
            gl.uniform1i(this.uniforms.noiseType, parseInt(document.getElementById('noiseType').value));
            gl.uniform1f(this.uniforms.noiseScale, parseFloat(document.getElementById('noiseScale').value));
            gl.uniform1i(this.uniforms.octaves, parseInt(document.getElementById('octaves').value));
            gl.uniform1f(this.uniforms.persistence, parseFloat(document.getElementById('persistence').value));
            gl.uniform1f(this.uniforms.lacunarity, parseFloat(document.getElementById('lacunarity').value));
            gl.uniform1f(this.uniforms.domainWarp, parseFloat(document.getElementById('domainWarp').value));
            
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }
}

// Create global renderer instance
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.renderer = new Renderer();
    });
} else {
    window.renderer = new Renderer();
}