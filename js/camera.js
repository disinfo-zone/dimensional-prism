class Camera {
    constructor() {
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.centerOffset = { x: 0, y: 0 };
        this.zoomLevel = 1.0;
        this.MIN_ZOOM = 0.1;
        this.MAX_ZOOM = 10.0;
        this.lastTouchDistance = 0;
        this.initialGestureDistance = 0;
        this.initialZoom = 1.0;
        this.canvas = document.getElementById('canvas');

        this.setupEventListeners();
        this.setupResizeHandling();
        this.resizeToDisplay(); // Initial resize
    }

    setupResizeHandling() {
        // Create ResizeObserver
        const resizeObserver = new ResizeObserver(() => this.resizeToDisplay());
        resizeObserver.observe(this.canvas);

        // Also handle window resize
        window.addEventListener('resize', () => this.resizeToDisplay());
    }

    resizeToDisplay() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
        }
    }

    setupEventListeners() {
        const canvas = document.getElementById('canvas');
        canvas.style.cursor = 'grab';
        canvas.style.touchAction = 'none';

        canvas.addEventListener('mousedown', this.startPan.bind(this));
        canvas.addEventListener('mousemove', this.pan.bind(this));
        canvas.addEventListener('mouseup', this.endPan.bind(this));
        canvas.addEventListener('mouseleave', this.endPan.bind(this));
        canvas.addEventListener('touchstart', this.handleTouch(this.startPan.bind(this)));
        canvas.addEventListener('touchmove', this.handleTouch(this.pan.bind(this)));
        canvas.addEventListener('touchend', this.handleTouch(this.endPan.bind(this)));
        canvas.addEventListener('wheel', this.handleZoom.bind(this), { passive: false });
        canvas.addEventListener('gesturestart', this.handleGestureStart.bind(this));
        canvas.addEventListener('gesturechange', this.handleGestureChange.bind(this));
        canvas.addEventListener('gestureend', this.handleGestureEnd.bind(this));

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                this.lastTouchDistance = this.getTouchDistance(e.touches);
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const newDistance = this.getTouchDistance(e.touches);
                const delta = (newDistance - this.lastTouchDistance) / this.lastTouchDistance;
                
                const zoomSensitivity = 0.75;
                const newZoom = this.clamp(this.zoomLevel * (1 - delta * zoomSensitivity), this.MIN_ZOOM, this.MAX_ZOOM);
                this.zoomLevel = newZoom;
                
                this.lastTouchDistance = newDistance;
            }
        });

        document.getElementById('resetCamera').addEventListener('click', this.reset.bind(this));
    }

    handleTouch(func) {
        return function(e) {
            e.preventDefault();
            if (e.touches) {
                e.clientX = e.touches[0].clientX;
                e.clientY = e.touches[0].clientY;
            }
            func(e);
        };
    }

    startPan(e) {
        this.isPanning = true;
        document.getElementById('canvas').style.cursor = 'grabbing';
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
    }

    pan(e) {
        if (!this.isPanning) return;
        
        const canvas = document.getElementById('canvas');
        const baseScaleFactor = 2.0;
        const zoomScaleFactor = Math.pow(this.zoomLevel, 1.5);
        
        const dx = ((e.clientX - this.lastPanPoint.x) / canvas.width) * baseScaleFactor * zoomScaleFactor;
        const dy = ((e.clientY - this.lastPanPoint.y) / canvas.height) * baseScaleFactor * zoomScaleFactor;
        
        this.centerOffset.x += dx;
        this.centerOffset.y -= dy;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
    }

    endPan() {
        this.isPanning = false;
        document.getElementById('canvas').style.cursor = 'grab';
    }

    handleZoom(e) {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * 0.1;
        this.zoomLevel = this.clamp(this.zoomLevel * (1 + delta), this.MIN_ZOOM, this.MAX_ZOOM);
    }

    handleGestureStart(e) {
        e.preventDefault();
        this.initialGestureDistance = e.scale;
        this.initialZoom = this.zoomLevel;
    }

    handleGestureChange(e) {
        e.preventDefault();
        const delta = e.scale - this.initialGestureDistance;
        this.zoomLevel = this.clamp(this.initialZoom * (1 + delta), this.MIN_ZOOM, this.MAX_ZOOM);
    }

    handleGestureEnd(e) {
        e.preventDefault();
    }

    getTouchDistance(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    reset() {
        this.centerOffset = { x: 0, y: 0 };
        this.zoomLevel = 1.0;
    }

    getCameraState() {
        return {
            centerOffset: this.centerOffset,
            zoomLevel: this.zoomLevel
        };
    }

    setCameraState(state) {
        if (state.centerOffset) this.centerOffset = state.centerOffset;
        if (state.zoomLevel) this.zoomLevel = state.zoomLevel;
    }
}

// Create global camera instance
const camera = new Camera();