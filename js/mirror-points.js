class MirrorPointSystem {
    constructor(canvas, renderer) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.points = [];
        this.activePoint = null;
        this.hoverPoint = null;
        this.longPressTimer = null;
        this.isCreating = false;
        this.isDragging = false;
    
        // Create overlay first
        this.createOverlayCanvas();
        
        // Then bind events
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Finally setup events
        this.setupEvents();
        
        // Initialize other properties
        this.lastMousePos = { x: 0, y: 0 };
        this.touchStartTime = 0;
        
        // Start animation loop
        requestAnimationFrame(() => this.animate());
    }

    createOverlayCanvas() {
        this.overlay = document.createElement('canvas');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(this.overlay);
        this.ctx = this.overlay.getContext('2d');
        this.resizeOverlay();
        window.addEventListener('resize', () => this.resizeOverlay());
    }

    resizeOverlay() {
        const dpr = window.devicePixelRatio || 1;
        this.overlay.width = window.innerWidth * dpr;
        this.overlay.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
    }

    setupEvents() {
        // Update overlay pointer events
        this.overlay.addEventListener('mousedown', this.handleMouseDown);
        this.overlay.addEventListener('mousemove', this.handleMouseMove);
        this.overlay.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.overlay.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        
        // Keep window-level event listeners
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('touchend', this.handleTouchEnd);
    }

    handleMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const pos = this.getCanvasPosition(e);
        
        // Check if clicking near existing point
        let nearest = null;
        let minDist = Infinity;
        
        this.points.forEach(point => {
            const screenPos = this.shaderToScreenCoords(point.x, point.y);
            const dist = Math.hypot(pos.x - screenPos.x, pos.y - screenPos.y);
            if (dist < this.PROXIMITY_THRESHOLD && dist < minDist) {
                minDist = dist;
                nearest = point;
            }
        });
    
        if (nearest) {
            this.activePoint = nearest;
            this.isDragging = true;
        } else {
            this.startLongPress(pos);
        }
    }
    
    handleMouseMove(e) {
        e.preventDefault();
        const pos = this.getCanvasPosition(e);
        this.lastMousePos = pos;
        this.updateUI(pos);
    }

    handleMouseUp() {
        this.clearLongPress();
        if (this.activePoint) {
            // Handle UI interaction
            this.updateActivePoint();
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = this.getCanvasPosition(touch);
        this.startLongPress(pos);
    }

    handleTouchMove(e) {
        const touch = e.touches[0];
        const pos = this.getCanvasPosition(touch);
        this.updateUI(pos);
    }

    handleTouchEnd() {
        this.clearLongPress();
    }

    startLongPress(pos) {
        this.clearLongPress();
        this.longPressTimer = setTimeout(() => {
            this.createPoint(pos);
        }, this.LONG_PRESS_DURATION);
    }

    clearLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    createPoint(pos) {
        const shaderPos = this.screenToShaderCoords(pos);
        const point = {
            x: shaderPos.x,
            y: shaderPos.y,
            rotation: 0,
            folds: 6,
            isPreMirror: true,
            active: true
        };
        this.points.push(point);
        this.activePoint = point;
        this.render();
    }

    screenToShaderCoords(pos) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (pos.x / rect.width) * 2 - 1;
        const y = -(pos.y / rect.height) * 2 + 1;
        return { x, y };
    }

    shaderToScreenCoords(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: ((x + 1) / 2) * rect.width,
            y: ((-y + 1) / 2) * rect.height
        };
    }

    updateUI(pos) {
        // Find nearest point
        let nearest = null;
        let minDist = Infinity;
        
        this.points.forEach(point => {
            const screenPos = this.shaderToScreenCoords(point.x, point.y);
            const dist = Math.hypot(pos.x - screenPos.x, pos.y - screenPos.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = point;
            }
        });

        if (minDist < this.PROXIMITY_THRESHOLD) {
            this.hoverPoint = nearest;
        } else {
            this.hoverPoint = null;
        }

        this.render();
    }

    render() {
        this.ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        
        // Draw all points
        this.points.forEach(point => {
            const pos = this.shaderToScreenCoords(point.x, point.y);
            this.drawPoint(pos, point === this.activePoint, point === this.hoverPoint);
        });

        // Draw UI for active point
        if (this.activePoint) {
            const pos = this.shaderToScreenCoords(this.activePoint.x, this.activePoint.y);
            this.drawUI(pos);
        }
    }

    drawPoint(pos, isActive, isHover) {
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, isActive ? 8 : isHover ? 6 : 4, 0, Math.PI * 2);
        this.ctx.fillStyle = isActive ? 'rgba(0, 255, 163, 0.8)' : 
                            isHover ? 'rgba(0, 255, 163, 0.6)' : 
                            'rgba(0, 255, 163, 0.3)';
        this.ctx.fill();
    }

    drawUI(pos) {
        // Draw rotation ring
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, this.UI_RADIUS, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 255, 163, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw rotation handle
        const angle = this.activePoint.rotation * Math.PI / 180;
        const handleX = pos.x + Math.cos(angle) * this.UI_RADIUS;
        const handleY = pos.y + Math.sin(angle) * this.UI_RADIUS;
        
        this.ctx.beginPath();
        this.ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 255, 163, 0.8)';
        this.ctx.fill();

        // Draw mirror lines preview
        const folds = this.activePoint.folds;
        for (let i = 0; i < folds; i++) {
            const lineAngle = angle + (i * Math.PI * 2 / folds);
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            this.ctx.lineTo(
                pos.x + Math.cos(lineAngle) * this.UI_RADIUS * 1.5,
                pos.y + Math.sin(lineAngle) * this.UI_RADIUS * 1.5
            );
            this.ctx.strokeStyle = 'rgba(0, 255, 163, 0.3)';
            this.ctx.stroke();
        }
    }

    getMirrorPoints() {
        return this.points.map(p => ({
            x: p.x,
            y: p.y,
            rotation: p.rotation,
            folds: p.folds,
            isPreMirror: p.isPreMirror
        }));
    }

    getCanvasPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    updateActivePoint() {
        // Calculate angle from center to cursor
        const centerPos = this.shaderToScreenCoords(this.activePoint.x, this.activePoint.y);
        const angle = Math.atan2(
            this.lastMousePos.y - centerPos.y,
            this.lastMousePos.x - centerPos.x
        );
        
        // Check if cursor is near rotation ring
        const dist = Math.hypot(
            this.lastMousePos.x - centerPos.x,
            this.lastMousePos.y - centerPos.y
        );
        
        if (Math.abs(dist - this.UI_RADIUS) < 20) {
            // Update rotation
            this.activePoint.rotation = (angle * 180 / Math.PI + 360) % 360;
        }
        
        this.render();
    }
    
    addEventListeners() {
        // Add wheel event for fold adjustment
        this.overlay.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (this.activePoint) {
                const delta = Math.sign(e.deltaY);
                this.activePoint.folds = Math.max(2, Math.min(16, this.activePoint.folds - delta));
                this.render();
            }
        });
    
        // Add keyboard controls
        window.addEventListener('keydown', (e) => {
            if (this.activePoint) {
                switch(e.key) {
                    case 'Delete':
                    case 'Backspace':
                        const index = this.points.indexOf(this.activePoint);
                        if (index > -1) {
                            this.points.splice(index, 1);
                        }
                        this.activePoint = null;
                        break;
                    case ' ':
                        this.activePoint.isPreMirror = !this.activePoint.isPreMirror;
                        break;
                }
                this.render();
            }
        });
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        
        this.points.forEach(point => {
            const pos = this.shaderToScreenCoords(point.x, point.y);
            if (point === this.activePoint) {
                point.uiScale = this.lerp(point.uiScale || 0, 1, 0.2);
            } else {
                point.uiScale = this.lerp(point.uiScale || 0, 0, 0.2);
            }
            
            if (point.uiScale > 0.01) {
                this.drawPointUI(pos, point, point.uiScale);
            }
        });
        
        if (this.points.some(p => p.uiScale > 0.01)) {
            requestAnimationFrame(() => this.animate());
        }
    }
    
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }
}