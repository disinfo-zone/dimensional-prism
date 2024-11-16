class BinauralToneGenerator {
    constructor() {
        this.isPlaying = false;
        this.isEnhanced = false;
        this.isSwapped = false;
        this.isInitialized = false;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupControls());
        } else {
            this.setupControls();
        }
    }

    async init() {
        if (!this.isInitialized) {
            try {
                await this.setupAudioChain();
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
            enhancementControls: document.querySelector('#enhancementControls')
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
            this.leftChain.gain.gain.value = volume;
            this.rightChain.gain.gain.value = volume;
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
            this.chorus.wet.value = value;
            document.getElementById('warmthValue').textContent = value;
        });
    
        controls.space.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.reverb.wet.value = value;
            document.getElementById('spaceValue').textContent = value;
        });
    }
    

    updateFrequencies() {
        const baseFreq = parseFloat(document.getElementById('baseFreq').value);
        const diff = parseFloat(document.getElementById('binauralDiff').value);
    
        if (this.isSwapped) {
            this.leftChain.osc.frequency.value = baseFreq + diff;
            this.rightChain.osc.frequency.value = baseFreq;
        } else {
            this.leftChain.osc.frequency.value = baseFreq;
            this.rightChain.osc.frequency.value = baseFreq + diff;
        }
    
        document.getElementById('baseFreqValue').textContent = baseFreq;
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
            await Tone.start();
            this.isPlaying = true;

            // Stop any existing oscillators with release
            if (this.leftChain.osc.state === "started") {
                await this.leftEnv.triggerRelease();
                this.leftChain.osc.stop();
            }
            if (this.rightChain.osc.state === "started") {
                await this.rightEnv.triggerRelease();
                this.rightChain.osc.stop();
            }

            // Start oscillators
            this.leftChain.osc.start();
            this.rightChain.osc.start();

            // Update frequencies and trigger envelopes
            this.updateFrequencies();
            const volume = this.getVolume();
            this.leftChain.gain.gain.value = volume;
            this.rightChain.gain.gain.value = volume;

            // Trigger attack for smooth fade in
            this.leftEnv.triggerAttack();
            this.rightEnv.triggerAttack();

        } catch (err) {
            console.error('Start error:', err);
            throw err;
        }
    }


    async stop() {
        // Trigger release for smooth fade out
        await Promise.all([
            this.leftEnv.triggerRelease(),
            this.rightEnv.triggerRelease()
        ]);

        this.isPlaying = false;

        // Stop oscillators after fade
        this.leftChain.osc.stop();
        this.rightChain.osc.stop();

        // Reset gains
        this.leftChain.gain.gain.value = 0;
        this.rightChain.gain.gain.value = 0;
    }

}

// Initialize the BinauralToneGenerator when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    window.audio = new BinauralToneGenerator();
});