class BinauralToneGenerator {
        constructor() {
            this.isPlaying = false;
            this.isEnhanced = false;
            this.isSwapped = false;
            this.isInitialized = false;
            this.harmonics = {
                left: [],
                right: []
            };
    
            // Initialize Tone.js context in suspended state
            Tone.setContext(new Tone.Context({ latencyHint: "interactive" }));
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupControls());
            } else {
                this.setupControls();
            }
        }

    async init() {
        if (!this.isInitialized) {
            try {
                await Tone.start();
                await this.setupAudioChain();
                this.setupHarmonics();
                this.isInitialized = true;
            } catch (err) {
                console.error('Initialization error:', err);
                throw err;
            }
        }
    }    

    async setupAudioChain() {
        try {
            // Create amplitude envelopes for fading
            this.leftEnv = new Tone.AmplitudeEnvelope({
                attack: 0.1,
                decay: 0.0,
                sustain: 1.0,
                release: 0.1
            });
    
            this.rightEnv = new Tone.AmplitudeEnvelope({
                attack: 0.1,
                decay: 0.0,
                sustain: 1.0,
                release: 0.1
            });
    
            // Create oscillators
            this.leftChain = {
                osc: new Tone.Oscillator({
                    type: "sine",
                    frequency: 432
                }),
                gain: new Tone.Gain(0),
                panner: new Tone.Panner(-1) // Pan hard left
            };
    
            this.rightChain = {
                osc: new Tone.Oscillator({
                    type: "sine",
                    frequency: 442
                }),
                gain: new Tone.Gain(0),
                panner: new Tone.Panner(1) // Pan hard right
            };
    
            // Create effects chains
            this.leftEffects = {
                limiter: new Tone.Limiter(-1),
                chorus: new Tone.Chorus({
                    frequency: 1.5,
                    delayTime: 3.5,
                    depth: 0.7,
                    wet: 0
                }).start(),
                reverb: new Tone.Reverb({
                    decay: 1.5,
                    preDelay: 0.01,
                    wet: 0
                })
            };
    
            this.rightEffects = {
                limiter: new Tone.Limiter(-1),
                chorus: new Tone.Chorus({
                    frequency: 1.5,
                    delayTime: 3.5,
                    depth: 0.7,
                    wet: 0
                }).start(),
                reverb: new Tone.Reverb({
                    decay: 1.5,
                    preDelay: 0.01,
                    wet: 0
                })
            };

            // Connect left channel
            this.leftChain.osc.connect(this.leftEnv);
            this.leftEnv.connect(this.leftChain.gain);
            this.leftChain.gain.connect(this.leftEffects.limiter);
            this.leftEffects.limiter.connect(this.leftEffects.chorus);
            this.leftEffects.chorus.connect(this.leftEffects.reverb);
            this.leftEffects.reverb.connect(this.leftChain.panner);
            this.leftChain.panner.toDestination();
    
            // Connect right channel
            this.rightChain.osc.connect(this.rightEnv);
            this.rightEnv.connect(this.rightChain.gain);
            this.rightChain.gain.connect(this.rightEffects.limiter);
            this.rightEffects.limiter.connect(this.rightEffects.chorus);
            this.rightEffects.chorus.connect(this.rightEffects.reverb);
            this.rightEffects.reverb.connect(this.rightChain.panner);
            this.rightChain.panner.toDestination();
    
        } catch (err) {
            console.error('Audio chain setup error:', err);
            throw err;
        }
    }

    setupHarmonics() {
        // Create 4 harmonics for each channel (2nd through 5th)
        for (let i = 2; i <= 5; i++) {
            // Left channel harmonic
            const leftHarmonic = {
                osc: new Tone.Oscillator({
                    type: "sine",
                    frequency: 432 * i
                }),
                gain: new Tone.Gain(0)
            };
            
            // Right channel harmonic
            const rightHarmonic = {
                osc: new Tone.Oscillator({
                    type: "sine",
                    frequency: 442 * i
                }),
                gain: new Tone.Gain(0)
            };
    
            // Connect through same effects chain
            leftHarmonic.osc.connect(leftHarmonic.gain);
            leftHarmonic.gain.connect(this.leftEffects.limiter);
            
            rightHarmonic.osc.connect(rightHarmonic.gain);
            rightHarmonic.gain.connect(this.rightEffects.limiter);
    
            this.harmonics.left.push(leftHarmonic);
            this.harmonics.right.push(rightHarmonic);
        }
    }

    setupControls() {
        const controls = {
            toggleBtn: document.querySelector('#toggleAudio'),
            audioControls: document.querySelector('#audioControls'),
            playBtn: document.querySelector('#toggleTone'),
            enhancedMode: document.querySelector('#enhancedMode'),
            warmth: document.querySelector('#warmth'),
            space: document.querySelector('#space'),
            swapEars: document.querySelector('#swapEars'),
            volume: document.querySelector('#volume'),
            baseFreq: document.querySelector('#baseFreq'),
            binauralDiff: document.querySelector('#binauralDiff'),
            waveform: document.querySelector('#waveform'),
            enhancementControls: document.querySelector('#enhancementControls'),
            enableHarmonics: document.querySelector('#enableHarmonics'),
            harmonicControls: document.querySelector('#harmonicControls')
        };
    
        // Check for missing elements
        const missingElements = Object.entries(controls)
            .filter(([key, element]) => !element)
            .map(([key]) => key);
    
        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements.join(', '));
            throw new Error(`Required DOM elements not found: ${missingElements.join(', ')}`);
        }
    
        // Add event listeners
        controls.toggleBtn.addEventListener('click', () => {
            controls.audioControls.classList.toggle('visible');
        });
    
        controls.playBtn.addEventListener('click', async () => {
            try {
                if (!this.isInitialized) {
                    await this.init();
                }
                
                if (!this.isPlaying) {
                    await this.start();
                    controls.playBtn.textContent = 'Stop';
                } else {
                    await this.stop();
                    controls.playBtn.textContent = 'Start';
                }
            } catch (err) {
                console.error('Playback error:', err);
            }
        });
    
        controls.volume.addEventListener('input', (e) => {
            const db = parseFloat(e.target.value);
            const volume = Math.pow(10, db/20);
            // Add ramp time
            this.leftChain.gain.gain.rampTo(volume, 0.05);
            this.rightChain.gain.gain.rampTo(volume, 0.05);
            document.getElementById('volumeValue').textContent = db;
        });
    
        controls.baseFreq.addEventListener('input', () => {
            if (this.isPlaying) {
                this.updateFrequencies();
            }
        });
    
        controls.binauralDiff.addEventListener('change', () => {
            if (this.isPlaying) {
                this.updateFrequencies();
            }
        });
    
        controls.waveform.addEventListener('change', (e) => {
            this.leftChain.osc.type = e.target.value;
            this.rightChain.osc.type = e.target.value;
        });
    
        controls.swapEars.addEventListener('change', (e) => {
            this.isSwapped = e.target.checked;
            if (this.isPlaying) {
                this.updateFrequencies();
            }
        });
    
        controls.enhancedMode.addEventListener('change', (e) => {
            this.isEnhanced = e.target.checked;
            controls.enhancementControls.style.display = e.target.checked ? 'block' : 'none';
            this.updateEffects();
        });
    
        controls.warmth.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            // Add smooth ramping to chorus wet parameter
            this.leftEffects.chorus.wet.rampTo(value, 0.1);
            this.rightEffects.chorus.wet.rampTo(value, 0.1);
            document.getElementById('warmthValue').textContent = value;
        });
        
        controls.space.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            // Add smooth ramping to reverb wet parameter
            this.leftEffects.reverb.wet.rampTo(value, 0.1);
            this.rightEffects.reverb.wet.rampTo(value, 0.1);
            document.getElementById('spaceValue').textContent = value;
        });

        // Add harmonic controls
        controls.enableHarmonics.addEventListener('change', (e) => {
        controls.harmonicControls.style.display = e.target.checked ? 'block' : 'none';
            this.updateHarmonics();
        });

        for (let i = 2; i <= 5; i++) {
            const toggle = document.getElementById(`harmonic${i}`);
            const level = document.getElementById(`harmonic${i}Level`);
            const value = document.getElementById(`harmonic${i}Value`);
    
            toggle.addEventListener('change', () => this.updateHarmonics());
            level.addEventListener('input', (e) => {
                value.textContent = `${e.target.value}%`;
                this.updateHarmonics();
            });
        }
    }
    

    updateFrequencies() {
        const baseFreq = parseFloat(document.getElementById('baseFreq').value);
        const diff = parseFloat(document.getElementById('binauralDiff').value);
    
        if (this.isSwapped) {
            this.leftChain.osc.frequency.value = baseFreq + diff;
            this.rightChain.osc.frequency.value = baseFreq;
            
            // Update harmonic frequencies
            this.harmonics.left.forEach((h, i) => {
                h.osc.frequency.value = (baseFreq + diff) * (i + 2);
            });
            this.harmonics.right.forEach((h, i) => {
                h.osc.frequency.value = baseFreq * (i + 2);
            });
        } else {
            this.leftChain.osc.frequency.value = baseFreq;
            this.rightChain.osc.frequency.value = baseFreq + diff;
            
            // Update harmonic frequencies
            this.harmonics.left.forEach((h, i) => {
                h.osc.frequency.value = baseFreq * (i + 2);
            });
            this.harmonics.right.forEach((h, i) => {
                h.osc.frequency.value = (baseFreq + diff) * (i + 2);
            });
        }
    
        document.getElementById('baseFreqValue').textContent = baseFreq;
        this.updateHarmonics(); // Make sure harmonics are updated
    }

    updateHarmonics() {
        const enableHarmonics = document.getElementById('enableHarmonics');
        
        if (!enableHarmonics.checked) {
            // Disable all harmonics with smooth ramp
            this.harmonics.left.forEach(h => h.gain.gain.rampTo(0, 0.05));
            this.harmonics.right.forEach(h => h.gain.gain.rampTo(0, 0.05));
            return;
        }
    
        // Get master volume for scaling
        const masterVolume = this.getVolume();
    
        // Update each harmonic
        for (let i = 2; i <= 5; i++) {
            const toggle = document.getElementById(`harmonic${i}`);
            const level = document.getElementById(`harmonic${i}Level`);
            const idx = i - 2;
            
            // Calculate gain (percentage of master volume)
            const gainValue = toggle.checked ? 
                (parseInt(level.value) / 100) * masterVolume : 0;
                
            // Apply gains with smooth ramp
            this.harmonics.left[idx].gain.gain.rampTo(gainValue, 0.05);
            this.harmonics.right[idx].gain.gain.rampTo(gainValue, 0.05);
        }
    }

    updateEffects() {
        const chorusWetValue = parseFloat(document.getElementById('warmth').value);
        const reverbWetValue = parseFloat(document.getElementById('space').value);
    
        if (this.isEnhanced) {
            this.leftEffects.chorus.wet.value = chorusWetValue;
            this.rightEffects.chorus.wet.value = chorusWetValue;
            this.leftEffects.reverb.wet.value = reverbWetValue;
            this.rightEffects.reverb.wet.value = reverbWetValue;
        } else {
            this.leftEffects.chorus.wet.value = 0;
            this.rightEffects.chorus.wet.value = 0;
            this.leftEffects.reverb.wet.value = 0;
            this.rightEffects.reverb.wet.value = 0;
        }
    }

    getVolume() {
        const volume = document.getElementById('volume');
        const db = parseFloat(volume.value);
        return Math.pow(10, db / 20);
    }

    async start() {
        try {
            // Initialize only after user gesture
            if (!this.isInitialized) {
                await this.init();
            }
            
            // Ensure Tone.js context is running
            if (Tone.context.state !== 'running') {
                await Tone.context.resume();
            }
            
            this.isPlaying = true;
    
            // Start oscillators silently (gain is 0)
            this.leftChain.osc.start();
            this.rightChain.osc.start();
            this.harmonics.left.forEach(h => h.osc.start());
            this.harmonics.right.forEach(h => h.osc.start());
    
            // Update frequencies before ramping up
            this.updateFrequencies();
            
            // Smoothly ramp up main gains
            const volume = this.getVolume();
            await Promise.all([
                this.leftChain.gain.gain.rampTo(volume, 0.1),
                this.rightChain.gain.gain.rampTo(volume, 0.1)
            ]);
    
            // Trigger envelopes after gains are set
            this.leftEnv.triggerAttack();
            this.rightEnv.triggerAttack();
    
        } catch (err) {
            console.error('Start error:', err);
            throw err;
        }
    }

    async stop() {
        try {
            // First ramp down all gains smoothly
            const fadeTime = 0.3; // Longer fade time
            
            const allRamps = [
                // Main channel gains
                this.leftChain.gain.gain.rampTo(0, fadeTime),
                this.rightChain.gain.gain.rampTo(0, fadeTime),
                // Harmonic gains
                ...this.harmonics.left.map(h => h.gain.gain.rampTo(0, fadeTime)),
                ...this.harmonics.right.map(h => h.gain.gain.rampTo(0, fadeTime))
            ];
    
            // Start envelope release in parallel
            this.leftEnv.triggerRelease();
            this.rightEnv.triggerRelease();
    
            // Wait for all ramps to complete
            await Promise.all(allRamps);
            
            // Additional safety delay for release completion
            await new Promise(resolve => setTimeout(resolve, fadeTime * 1000 + 50));
    
            // Now safe to stop oscillators
            this.leftChain.osc.stop();
            this.rightChain.osc.stop();
            this.harmonics.left.forEach(h => h.osc.stop());
            this.harmonics.right.forEach(h => h.osc.stop());
    
            this.isPlaying = false;
    
        } catch (err) {
            console.error('Stop error:', err);
            throw err;
        }
    }

}

// Initialize the BinauralToneGenerator when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    window.audio = new BinauralToneGenerator();
});