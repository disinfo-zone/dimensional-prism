const SETTINGS_MAP = [
    ['speed', 1000], 
    ['complexity', 1],  // Already integer
    ['size', 100],
    ['centerX', 100],
    ['centerY', 100],
    ['mirrorFolds', 1], // Already integer
    ['mirrorAngle', 1], // Already integer
    ['colorSpeed', 1000],
    ['colorPalette', 1], // Already integer
    ['saturation', 1],   // Already integer
    ['exposure', 100],
    ['hueShift', 1],    // Already integer
    ['contrast', 100],
    ['noiseType', 1],   // Already integer
    ['noiseScale', 100],
    ['octaves', 1],     // Already integer
    ['persistence', 1000],
    ['lacunarity', 100],
    ['domainWarp', 100],
    ['pixelSize', 1000],
    ['pixelAspect', 100],
    ['enablePixelation', 1], // Boolean to 1/0
    ['zoomLevel', 100],
    ['centerOffsetX', 100], 
    ['centerOffsetY', 100],
    ['midtones', 100],
    ['highlights', 100], 
    ['shadows', 100],
    ['colorBalance', 100],
    ['pixelGap', 100]
];

const MULTIPLIERS = {
    speed: 1000,
    complexity: 100,
    size: 100,
    centerX: 100,
    centerY: 100,
    mirrorFolds: 100,
    mirrorAngle: 100,
    colorSpeed: 1000,
    saturation: 100,
    exposure: 100,
    hueShift: 100,
    contrast: 100,
    noiseScale: 100,
    persistence: 1000,
    lacunarity: 100,
    domainWarp: 100,
    pixelSize: 100,
    pixelAspect: 100
};


class Controls {
    constructor() {
        this.MAX_MIRROR_POINTS = 4;
        this.mirrorPoints = [{x: 0, y: 0}];
        this.setupControlPanel();
        this.setupMirrorPoints();
        this.setupValueDisplays();
        this.setupResetButtons();
        this.setupShareButton();
        this.setupURLHandling();
    }

    setupControlPanel() {
        const toggleBtn = document.getElementById('toggleControls');
        const controls = document.getElementById('controls');
        
        toggleBtn.addEventListener('click', () => {
            controls.classList.toggle('visible');
        });

        // Show controls by default
        controls.classList.add('visible');
    }

    setupMirrorPoints() {
        this.updateMirrorPointControls();
        this.setupAddMirrorPointButton();
    }

    updateMirrorPointControls() {
        document.querySelectorAll('.mirror-point').forEach(point => {
            const index = parseInt(point.dataset.index);
            const xInput = point.querySelector('.mirror-point-x');
            const yInput = point.querySelector('.mirror-point-y');
            const xDisplay = document.getElementById(`mirrorPoint${index}XValue`);
            const yDisplay = document.getElementById(`mirrorPoint${index}YValue`);

            // Remove existing listeners before adding new ones
            xInput.removeEventListener('input', xInput.updateHandler);
            yInput.removeEventListener('input', yInput.updateHandler);

            // Store handlers to allow removal
            xInput.updateHandler = () => {
                this.mirrorPoints[index].x = parseFloat(xInput.value);
                xDisplay.textContent = xInput.value;
            };
            yInput.updateHandler = () => {
                this.mirrorPoints[index].y = parseFloat(yInput.value);
                yDisplay.textContent = yInput.value;
            };

            // Add new listeners
            xInput.addEventListener('input', xInput.updateHandler);
            yInput.addEventListener('input', yInput.updateHandler);
        });
    }

    setupAddMirrorPointButton() {
        document.getElementById('addMirrorPoint').addEventListener('click', () => {
            if (this.mirrorPoints.length < this.MAX_MIRROR_POINTS) {
                const index = this.mirrorPoints.length;
                this.mirrorPoints.push({x: 0, y: 0});
        
                const div = document.createElement('div');
                div.className = 'mirror-point';
                div.dataset.index = index;
                div.innerHTML = `
                    <label>Point ${index + 1} X <span class="value-display" id="mirrorPoint${index}XValue">0.0</span>
                        <input type="range" class="mirror-point-x" min="-1" max="1" step="0.01" value="0">
                    </label>
                    <label>Point ${index + 1} Y <span class="value-display" id="mirrorPoint${index}YValue">0.0</span>
                        <input type="range" class="mirror-point-y" min="-1" max="1" step="0.01" value="0">
                    </label>
                `;
                document.getElementById('mirrorPoints').appendChild(div);
                this.updateMirrorPointControls();
            }
        });
    }

    setupValueDisplays() {
        const displayConfigs = [
            { id: 'speed' },
            { id: 'complexity' },
            { id: 'size' },
            { id: 'centerX' },
            { id: 'centerY' },
            { id: 'mirrorFolds' },
            { id: 'mirrorAngle', suffix: '°' },
            { id: 'colorSpeed' },
            { id: 'saturation', suffix: '%' },
            { id: 'exposure', suffix: ' EV' },
            { id: 'hueShift', suffix: '°' },
            { id: 'contrast' },
            { id: 'noiseScale' },
            { id: 'octaves' },
            { id: 'persistence' },
            { id: 'lacunarity' },
            { id: 'domainWarp' },
            { id: 'pixelSize' },
            { id: 'pixelAspect' },
            { id: 'midtones' },
            { id: 'shadows' },
            { id: 'highlights' },
            { id: 'colorBalance' }
        ];

        displayConfigs.forEach(config => {
            this.updateValueDisplay(config.id, config.suffix || '');
        });

        // Special case for pixelSides select
        document.getElementById('pixelSides').addEventListener('change', function(e) {
            const display = document.getElementById('pixelSidesValue');
            if (display) display.textContent = e.target.value;
        });
    }

    updateValueDisplay(inputId, suffix = '') {
        const input = document.getElementById(inputId);
        const display = document.getElementById(inputId + 'Value');
        if (input && display) {
            input.addEventListener('input', () => {
                display.textContent = input.value + suffix;
            });
            // Set initial value
            display.textContent = input.value + suffix;
        }
    }

    setupResetButtons() {
        document.querySelectorAll('.control-group').forEach(group => {
            const resetBtn = document.createElement('button');
            resetBtn.className = 'reset-button';
            resetBtn.textContent = '↺';
            resetBtn.title = 'Reset to default';
            
            resetBtn.addEventListener('click', () => {
                group.querySelectorAll('input[type="range"]').forEach(input => {
                    input.value = input.defaultValue;
                    input.dispatchEvent(new Event('input'));
                });
                group.querySelectorAll('select').forEach(select => {
                    select.value = select.firstElementChild.value;
                    select.dispatchEvent(new Event('change'));
                });
                group.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                    checkbox.dispatchEvent(new Event('change'));
                });
            });
            
            group.insertBefore(resetBtn, group.firstChild);
        });
    }

    setupShareButton() {
        document.getElementById('shareButton').addEventListener('click', async () => {
            const settings = this.getAllSettings();
            const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(settings));
            const url = `${window.location.origin}${window.location.pathname}?s=${compressed}`;
            
            try {
                await navigator.clipboard.writeText(url);
                const tooltip = document.querySelector('.copied-tooltip');
                tooltip.classList.add('visible');
                setTimeout(() => tooltip.classList.remove('visible'), 2000);
            } catch (err) {
                console.error('Failed to copy URL:', err);
            }
        });
    }

    setupURLHandling() {
        window.addEventListener('load', () => {
            const params = new URLSearchParams(window.location.search);
            const encoded = params.get('s');
            if (encoded) {
                try {
                    const json = LZString.decompressFromEncodedURIComponent(encoded);
                    const settings = JSON.parse(json);
                    this.applySettings(settings);
                } catch (err) {
                    console.error('Failed to load settings:', err);
                }
            }
        });
    }

    getAllSettings() {
        // Convert to array format
        const values = SETTINGS_MAP.map(([key, multiplier]) => {
            const el = document.getElementById(key);
            if (!el) {
                // Handle camera settings
                if (key === 'zoomLevel') return Math.round(camera.zoomLevel * multiplier);
                if (key === 'centerOffsetX') return Math.round(camera.centerOffset.x * multiplier);
                if (key === 'centerOffsetY') return Math.round(camera.centerOffset.y * multiplier);
                return 0;
            }
            const val = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value;
            return Math.round(parseFloat(val) * multiplier);
        });
        
        // Add mirror points as flat array
        const points = this.mirrorPoints.map(p => [
            Math.round(p.x * 100),
            Math.round(p.y * 100)
        ]).flat();
        
        return btoa(values.concat(points).join(','));
    }

    applySettings(encoded) {
        const values = atob(encoded).split(',').map(Number);
        
        // Extract main settings
        SETTINGS_MAP.forEach(([key, multiplier], i) => {
            // Handle camera settings
            if (key === 'zoomLevel') {
                camera.zoomLevel = values[i] / multiplier;
                return;
            }
            if (key === 'centerOffsetX') {
                camera.centerOffset.x = values[i] / multiplier;
                return;
            }
            if (key === 'centerOffsetY') {
                camera.centerOffset.y = values[i] / multiplier;
                return;
            }
    
            const el = document.getElementById(key);
            if (!el) return;
            const val = values[i] / multiplier;
            if (el.type === 'checkbox') {
                el.checked = val === 1;
            } else {
                el.value = val;
            }
            el.dispatchEvent(new Event('input'));
        });
        
        // Extract mirror points
        const pointCount = (values.length - SETTINGS_MAP.length) / 2;
        this.mirrorPoints = Array(pointCount).fill().map((_, i) => ({
            x: values[SETTINGS_MAP.length + i*2] / 100,
            y: values[SETTINGS_MAP.length + i*2 + 1] / 100
        }));
        
        this.rebuildMirrorPointsUI();
    }

    getMirrorPoints() {
        return this.mirrorPoints;
    }

    rebuildMirrorPointsUI() {
        // Clear existing mirror points UI
        const container = document.getElementById('mirrorPoints');
        container.innerHTML = '';
    
        // Rebuild UI for each mirror point
        this.mirrorPoints.forEach((point, index) => {
            const div = document.createElement('div');
            div.className = 'mirror-point';
            div.dataset.index = index;
            div.innerHTML = `
                <label>Point ${index + 1} X <span class="value-display" id="mirrorPoint${index}XValue">${point.x.toFixed(2)}</span>
                    <input type="range" class="mirror-point-x" min="-1" max="1" step="0.01" value="${point.x}">
                </label>
                <label>Point ${index + 1} Y <span class="value-display" id="mirrorPoint${index}YValue">${point.y.toFixed(2)}</span>
                    <input type="range" class="mirror-point-y" min="-1" max="1" step="0.01" value="${point.y}">
                </label>
            `;
            container.appendChild(div);
        });
    
        // Update event listeners for the new controls
        this.updateMirrorPointControls();
    }
}
// Create global controls instance
const controls = new Controls();

