// js/controls.js
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
            { id: 'pixelAspect' }
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
        return {
            speed: document.getElementById('speed').value,
            complexity: document.getElementById('complexity').value,
            size: document.getElementById('size').value,
            centerX: document.getElementById('centerX').value,
            centerY: document.getElementById('centerY').value,
            mirrorFolds: document.getElementById('mirrorFolds').value,
            mirrorAngle: document.getElementById('mirrorAngle').value,
            colorSpeed: document.getElementById('colorSpeed').value,
            colorPalette: document.getElementById('colorPalette').value,
            saturation: document.getElementById('saturation').value,
            exposure: document.getElementById('exposure').value,
            hueShift: document.getElementById('hueShift').value,
            contrast: document.getElementById('contrast').value,
            enablePixelation: document.getElementById('enablePixelation').checked,
            pixelSides: document.getElementById('pixelSides').value,
            pixelSize: document.getElementById('pixelSize').value,
            pixelAspect: document.getElementById('pixelAspect').value,
            noiseType: document.getElementById('noiseType').value,
            noiseScale: document.getElementById('noiseScale').value,
            octaves: document.getElementById('octaves').value,
            persistence: document.getElementById('persistence').value,
            lacunarity: document.getElementById('lacunarity').value,
            domainWarp: document.getElementById('domainWarp').value,
            mirrorPoints: this.mirrorPoints,
            zoomLevel: camera.zoomLevel,
            centerOffset: camera.centerOffset
        };
    }

    applySettings(settings) {
        for (const [key, value] of Object.entries(settings)) {
            if (key === 'mirrorPoints') {
                this.mirrorPoints = value;
                // Rebuild mirror points UI
                const container = document.getElementById('mirrorPoints');
                container.innerHTML = '';
                value.forEach((point, index) => {
                    const div = document.createElement('div');
                    div.className = 'mirror-point';
                    div.dataset.index = index;
                    div.innerHTML = `
                        <label>Point ${index + 1} X <span class="value-display" id="mirrorPoint${index}XValue">${point.x}</span>
                            <input type="range" class="mirror-point-x" min="-1" max="1" step="0.01" value="${point.x}">
                        </label>
                        <label>Point ${index + 1} Y <span class="value-display" id="mirrorPoint${index}YValue">${point.y}</span>
                            <input type="range" class="mirror-point-y" min="-1" max="1" step="0.01" value="${point.y}">
                        </label>
                    `;
                    container.appendChild(div);
                });
                this.updateMirrorPointControls();
            } else if (key === 'zoomLevel') {
                camera.zoomLevel = value;
            } else if (key === 'centerOffset') {
                camera.centerOffset = value;
            } else if (key === 'enablePixelation') {
                document.getElementById(key).checked = value;
            } else {
                const element = document.getElementById(key);
                if (element) {
                    element.value = value;
                    element.dispatchEvent(new Event('input'));
                }
            }
        }
    }

    getMirrorPoints() {
        return this.mirrorPoints;
    }
}

// Create global controls instance
const controls = new Controls();