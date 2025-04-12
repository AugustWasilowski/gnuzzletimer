document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');
    const timerDisplay = document.getElementById('timerDisplay');
    const hourglassContainer = document.getElementById('hourglassContainer');
    const beepsAudio = document.getElementById('beepsAudio');
    const timerAudio = document.getElementById('timerAudio');
    const tenLeftAudio = document.getElementById('tenLeftAudio');

    const timerDuration = 60;
    let timeLeft = timerDuration;
    let isRunning = false;
    let timerInterval = null;
    let particleInterval = null;
    let particlesSpawned = 0;

    // Logo Colors for Confetti
    const logoColors = ['#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0', '#4DD0E1', '#FF8A65']; // Added lighter blue/orange from logo

    // --- Matter.js Setup ---
    const Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Composite = Matter.Composite,
        Events = Matter.Events,
        Vector = Matter.Vector;

    const engine = Engine.create();
    const world = engine.world;
    engine.gravity.y = 0.8;

    const render = Render.create({
        element: hourglassContainer,
        engine: engine,
        options: {
            width: hourglassContainer.clientWidth,
            height: hourglassContainer.clientHeight,
            wireframes: false,
            background: 'transparent'
        }
    });

    const runner = Runner.create();

    // --- Hourglass Shape Definition ---
    const wallOptions = {
        isStatic: true,
        render: { fillStyle: '#c6b088', strokeStyle: '#a58e6f', lineWidth: 2, zIndex: 10 },
        friction: 0.1
    };
    const glassOptions = {
        isStatic: true,
        render: { fillStyle: 'rgba(173, 216, 230, 0.2)', strokeStyle: 'rgba(173, 216, 230, 0.5)', lineWidth: 1, zIndex: 5 },
        friction: 0.01
    };
    const particleOptions = {
        friction: 0.5, frictionStatic: 0.8, restitution: 0.1, density: 0.1,
        render: { fillStyle: '#e4d4a4', zIndex: 1 }
    };

    const containerWidth = render.options.width;
    const containerHeight = render.options.height;
    const neckWidth = 15;
    const bulbHeight = containerHeight * 0.4;
    const neckHeight = containerHeight * 0.05;
    const baseHeight = containerHeight * 0.05;
    const bulbMaxWidth = containerWidth * 0.4;
    const midY = containerHeight / 2;
    const wallThickness = 15;
    const baseWidth = containerWidth * 0.85;

    const topBase = Bodies.rectangle(containerWidth / 2, baseHeight / 2, baseWidth, baseHeight, wallOptions);
    const bottomBase = Bodies.rectangle(containerWidth / 2, containerHeight - baseHeight / 2, baseWidth, baseHeight, wallOptions);
    const leftPillar = Bodies.rectangle(containerWidth / 2 - baseWidth/2 + wallThickness/2, containerHeight / 2, wallThickness, containerHeight-baseHeight*2, wallOptions);
    const rightPillar = Bodies.rectangle(containerWidth / 2 + baseWidth/2 - wallThickness/2, containerHeight / 2, wallThickness, containerHeight-baseHeight*2, wallOptions);

    const glassVertices = [
        { x: containerWidth / 2 - neckWidth / 2, y: midY - neckHeight / 2 },
        { x: containerWidth / 2 - bulbMaxWidth, y: midY - neckHeight / 2 - bulbHeight * 0.5 },
        { x: containerWidth / 2 - bulbMaxWidth * 0.8, y: baseHeight + baseHeight*0.5 },
        { x: containerWidth / 2 + bulbMaxWidth * 0.8, y: baseHeight + baseHeight*0.5 },
        { x: containerWidth / 2 + bulbMaxWidth, y: midY - neckHeight / 2 - bulbHeight * 0.5 },
        { x: containerWidth / 2 + neckWidth / 2, y: midY - neckHeight / 2 },
        { x: containerWidth / 2 + neckWidth / 2, y: midY + neckHeight / 2 },
        { x: containerWidth / 2 + bulbMaxWidth, y: midY + neckHeight / 2 + bulbHeight * 0.5 },
        { x: containerWidth / 2 + bulbMaxWidth * 0.8, y: containerHeight - baseHeight - baseHeight*0.5 },
        { x: containerWidth / 2 - bulbMaxWidth * 0.8, y: containerHeight - baseHeight - baseHeight*0.5 },
        { x: containerWidth / 2 - bulbMaxWidth, y: midY + neckHeight / 2 + bulbHeight * 0.5 },
        { x: containerWidth / 2 - neckWidth / 2, y: midY + neckHeight / 2 },
    ];

    const glassWallSegments = [];
    const segmentThickness = 6;
    const createSegment = (x1, y1, x2, y2) => {
        const center = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const effectiveLength = Math.max(length, segmentThickness);
        return Bodies.rectangle(center.x, center.y, effectiveLength, segmentThickness, { ...glassOptions, angle: angle });
    }
    for (let i = 0; i < glassVertices.length; i++) {
        const p1 = glassVertices[i];
        const p2 = glassVertices[(i + 1) % glassVertices.length];
        glassWallSegments.push(createSegment(p1.x, p1.y, p2.x, p2.y));
    }

    Composite.add(world, [topBase, bottomBase, leftPillar, rightPillar, ...glassWallSegments]);

    // --- Sand Particle Logic ---
    const particleSize = 3;
    const totalParticlesToSpawn = 1440;
    const spawnDurationSeconds = 45;
    const spawnRatePerSecond = totalParticlesToSpawn / spawnDurationSeconds;
    const spawnIntervalMs = 1000 / spawnRatePerSecond;
    let sandParticles = [];

    function createSandParticle() {
        const spawnAreaWidth = neckWidth * 1.5;
        const x = containerWidth / 2 + (Math.random() - 0.5) * spawnAreaWidth;
        const y = baseHeight + baseHeight*0.5 + Math.random() * 20;
        if (x < containerWidth / 2 - bulbMaxWidth || x > containerWidth / 2 + bulbMaxWidth) { return; }
        const particle = Bodies.circle(x, y, particleSize, particleOptions);
        sandParticles.push(particle);
        Composite.add(world, particle);
        particlesSpawned++;
        if (particlesSpawned >= totalParticlesToSpawn) {
            clearInterval(particleInterval);
            particleInterval = null;
            console.log("Target particle count reached.");
        }
    }

    // --- Audio Handling --- 
    const stopAllAudio = () => {
        beepsAudio.pause();
        timerAudio.pause();
        tenLeftAudio.pause();
        beepsAudio.currentTime = 0;
        timerAudio.currentTime = 0;
        tenLeftAudio.currentTime = 0;
    }
    
    const playTimerLoop = () => {
        if (isRunning && timeLeft > 11) { 
             try {
                timerAudio.currentTime = 0;
                timerAudio.play();
            } catch (e) { console.error("Error playing timer loop audio:", e); }
        }
        beepsAudio.removeEventListener('ended', playTimerLoop);
    };

    // --- Confetti --- 
    function triggerConfetti() {
        // Check if confetti function exists (library loaded)
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150, // More particles
                spread: 90,       // Wider spread
                origin: { y: 0.6 }, // Start slightly below the center
                colors: logoColors, // Use logo colors
                scalar: 1.2 // Slightly larger confetti
            });
        } else {
            console.warn('Confetti library not loaded.');
        }
    }

    // --- Timer Logic ---
    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        timeLeft = timerDuration;
        particlesSpawned = 0;
        updateDisplay();
        clearParticles();
        stopAllAudio();

        try {
            beepsAudio.currentTime = 0;
            beepsAudio.play();
            beepsAudio.addEventListener('ended', playTimerLoop); 
        } catch (e) { 
            console.error("Error playing beeps audio:", e);
            playTimerLoop();
        }

        timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();

            if (timeLeft <= timerDuration - spawnDurationSeconds && particleInterval) {
                console.log("Spawning duration ended.");
                clearInterval(particleInterval);
                particleInterval = null;
            }

            if (timeLeft === 11) {
                try {
                    timerAudio.pause();
                    timerAudio.currentTime = 0;
                    tenLeftAudio.currentTime = 0;
                    tenLeftAudio.play();
                    beepsAudio.removeEventListener('ended', playTimerLoop);
                } catch (e) { console.error("Error playing 10-left audio:", e); }
            }

            if (timeLeft <= 0) {
                stopTimer(true);
                triggerConfetti(); // <<< Trigger confetti burst
            }
        }, 1000);

        if (particleInterval) clearInterval(particleInterval);
        particleInterval = setInterval(createSandParticle, spawnIntervalMs);

        Runner.run(runner, engine);
        Render.run(render);
        startButton.textContent = "Pause";
        startButton.style.background = "linear-gradient(45deg, #ff9800, #ff5722)";
    }

    function pauseTimer() {
         if (!isRunning) return;
         isRunning = false;
         clearInterval(timerInterval);
         clearInterval(particleInterval);
         particleInterval = null;
         Runner.stop(runner);
         startButton.textContent = "Resume";
         startButton.style.background = "linear-gradient(45deg, #4CAF50, #2196F3)";
         beepsAudio.pause(); 
         timerAudio.pause(); 
         tenLeftAudio.pause();
         beepsAudio.removeEventListener('ended', playTimerLoop); 
    }

     function resumeTimer() {
         if (isRunning || timeLeft <= 0) return;
         isRunning = true;

         if (timeLeft > 11) {
             if (!beepsAudio.paused) {
                 beepsAudio.play().catch(e => console.error("Error resuming beeps:", e));
                 beepsAudio.addEventListener('ended', playTimerLoop);
             } else if (!timerAudio.paused || timeLeft <= timerDuration) {
                  try { timerAudio.play(); } catch (e) { console.error("Error resuming timer loop:", e); }
             }
         } else if (!tenLeftAudio.paused) {
             try { tenLeftAudio.play(); } catch (e) { console.error("Error resuming 10-left audio:", e); }
         }

         timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();

             if (timeLeft <= timerDuration - spawnDurationSeconds && particleInterval) {
                 console.log("Spawning duration ended after resume.");
                 clearInterval(particleInterval);
                 particleInterval = null;
             }

            if (timeLeft === 11) {
                try {
                    timerAudio.pause();
                    timerAudio.currentTime = 0;
                    if (tenLeftAudio.paused) { 
                         tenLeftAudio.currentTime = 0;
                        tenLeftAudio.play();
                    }
                     beepsAudio.removeEventListener('ended', playTimerLoop);
                } catch (e) { console.error("Error playing 10-left audio:", e); }
            }

            if (timeLeft <= 0) {
                stopTimer(true);
                triggerConfetti(); // <<< Trigger confetti burst
            }
        }, 1000);

        if (particlesSpawned < totalParticlesToSpawn && timeLeft > timerDuration - spawnDurationSeconds) {
            if (particleInterval) clearInterval(particleInterval);
             particleInterval = setInterval(createSandParticle, spawnIntervalMs);
        }

        Runner.run(runner, engine);
        startButton.textContent = "Pause";
        startButton.style.background = "linear-gradient(45deg, #ff9800, #ff5722)";
    }

    function stopTimer(playSound = false) {
        isRunning = false;
        clearInterval(timerInterval);
        clearInterval(particleInterval);
        timerInterval = null;
        particleInterval = null;
        Runner.stop(runner);
        startButton.textContent = "Start";
        startButton.style.background = "linear-gradient(45deg, #4CAF50, #2196F3)";
        beepsAudio.removeEventListener('ended', playTimerLoop); 

        if (!playSound) {
            stopAllAudio();
        }
    }

     function clearParticles() {
        Composite.remove(world, sandParticles);
        sandParticles = [];
        particlesSpawned = 0;
    }

    function resetTimer() {
        stopTimer();
        timeLeft = timerDuration;
        updateDisplay();
        clearParticles();
        Engine.clear(engine);
         Composite.add(world, [topBase, bottomBase, leftPillar, rightPillar, ...glassWallSegments]);
        Render.world(render);
        stopAllAudio();
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        if (startButton.textContent === "Start") {
            resetTimer();
            startTimer();
        } else if (startButton.textContent === "Resume"){
             resumeTimer();
        } else { // Pause
            pauseTimer();
        }
    });

    resetButton.addEventListener('click', resetTimer);

    // Handle window resize
    window.addEventListener('resize', () => {
        render.canvas.width = hourglassContainer.clientWidth;
        render.canvas.height = hourglassContainer.clientHeight;
        Render.setPixelRatio(render, window.devicePixelRatio);
        console.warn("Canvas resized. For accurate physics after resize, consider refreshing or implementing full world reconstruction.");
    });

    // --- Initial State ---
    updateDisplay();
    Render.run(render);
    Runner.stop(runner);
    resetTimer();

});
