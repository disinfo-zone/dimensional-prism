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
            zoomLevel: gl.getUniformLocation(this.program, 'zoomLevel'),
            midtones: gl.getUniformLocation(this.program, 'midtones'),
            shadows: gl.getUniformLocation(this.program, 'shadows'),
            highlights: gl.getUniformLocation(this.program, 'highlights'),
            colorBalance: gl.getUniformLocation(this.program, 'colorBalance'),
            pixelGap: gl.getUniformLocation(this.program, 'pixelGap'),
            backgroundColor: gl.getUniformLocation(this.program, 'backgroundColor')
        };
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
    
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shader:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
    
        return shader;
    }

    startRenderLoop() {
        const getInputValue = (id, defaultValue) => {
            const element = document.getElementById(id);
            return element ? parseFloat(element.value) : defaultValue;
        };
    
        const getSelectValue = (id, defaultValue) => {
            const element = document.getElementById(id);
            return element ? parseInt(element.value) : defaultValue;
        };
    
        const getCheckboxValue = (id, defaultValue) => {
            const element = document.getElementById(id);
            return element ? element.checked : defaultValue;
        };
    
        const render = (time) => {
            time *= 0.001; // Convert to seconds
            const gl = this.gl;
            
            // Update uniforms with safe value retrieval
            gl.uniform2f(this.uniforms.centerPoint, 
                (getInputValue('centerX', 0) + camera.centerOffset.x) / camera.zoomLevel,
                (getInputValue('centerY', 0) + camera.centerOffset.y) / camera.zoomLevel
            );
            gl.uniform1f(this.uniforms.zoomLevel, camera.zoomLevel);
            gl.uniform1f(this.uniforms.time, time);
            gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
            gl.uniform1f(this.uniforms.complexity, getInputValue('complexity', 20));
            gl.uniform1f(this.uniforms.speed, getInputValue('speed', 0.2));
            gl.uniform1f(this.uniforms.colorSpeed, getInputValue('colorSpeed', 0.3));
            gl.uniform1f(this.uniforms.size, getInputValue('size', 20));
            gl.uniform1f(this.uniforms.mirrorFolds, getInputValue('mirrorFolds', 6));
            gl.uniform1f(this.uniforms.mirrorAngle, getInputValue('mirrorAngle', 0));
            
            // Color settings
            gl.uniform1i(this.uniforms.colorPalette, getSelectValue('colorPalette', 0));
            gl.uniform1f(this.uniforms.saturation, getInputValue('saturation', 100));
            gl.uniform1f(this.uniforms.exposure, getInputValue('exposure', 0));
            gl.uniform1f(this.uniforms.hueShift, getInputValue('hueShift', 0));
            gl.uniform1f(this.uniforms.contrast, getInputValue('contrast', 1.0));
            gl.uniform1f(this.uniforms.midtones, getInputValue('midtones', 0));
            gl.uniform1f(this.uniforms.shadows, getInputValue('shadows', 0));
            gl.uniform1f(this.uniforms.highlights, getInputValue('highlights', 0));
            gl.uniform1f(this.uniforms.colorBalance, getInputValue('colorBalance', 0));
    
            // Mirror points
            const mirrorPoints = controls?.getMirrorPoints() || [{x: 0, y: 0}];
            const mirrorPointsArray = new Float32Array(mirrorPoints.flatMap(p => [p.x, p.y]));
            gl.uniform2fv(this.uniforms.mirrorPoints, mirrorPointsArray);
            gl.uniform1i(this.uniforms.mirrorPointCount, mirrorPoints.length);
    
            // Pixelation
            gl.uniform1i(this.uniforms.enablePixelation, getCheckboxValue('enablePixelation', false));
            gl.uniform1f(this.uniforms.pixelSides, getInputValue('pixelSides', 4));
            gl.uniform1f(this.uniforms.pixelSize, getInputValue('pixelSize', 0.05));
            gl.uniform1f(this.uniforms.pixelAspect, getInputValue('pixelAspect', 1.0));
            gl.uniform1f(this.uniforms.pixelGap, getInputValue('pixelGap', 0));
    
            // Noise settings
            gl.uniform1i(this.uniforms.noiseType, getSelectValue('noiseType', 0));
            gl.uniform1f(this.uniforms.noiseScale, getInputValue('noiseScale', 1.0));
            gl.uniform1i(this.uniforms.octaves, getInputValue('octaves', 4));
            gl.uniform1f(this.uniforms.persistence, getInputValue('persistence', 0.5));
            gl.uniform1f(this.uniforms.lacunarity, getInputValue('lacunarity', 2.0));
            gl.uniform1f(this.uniforms.domainWarp, getInputValue('domainWarp', 0));
            
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            requestAnimationFrame(render);

            const bgColorSelect = document.getElementById('bgColor');
            const customBgColor = document.getElementById('customBgColor');
            let bgColor = [0, 0, 0, 1]; // Default black
        
            switch(bgColorSelect.value) {
                case 'white':
                    bgColor = [1, 1, 1, 1];
                    break;
                case 'transparent':
                    bgColor = [0, 0, 0, 0];
                    break;
                case 'custom':
                    const hex = customBgColor.value;
                    bgColor = [
                        parseInt(hex.slice(1,3), 16) / 255,
                        parseInt(hex.slice(3,5), 16) / 255,
                        parseInt(hex.slice(5,7), 16) / 255,
                        1
                    ];
                    break;
            }
            gl.uniform4fv(this.uniforms.backgroundColor, bgColor);
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