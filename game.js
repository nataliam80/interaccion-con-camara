/**
 * Game
 * Motor del runner controlado por gestos de mano.
 * Estados: start | playing | paused | gameover
 */
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Estado del juego
    this.state = 'start'; // start | playing | paused | gameover
    this.score = 0;
    this.startTime = 0;

    // Personaje (posici�n X fija, solo se mueve en Y con las animaciones)
    this.char = {
      x: 100,
      y: 300,
      width: 40,
      height: 50,
      baseY: 300,
      vy: 0,
      gravity: 0.8,
      jumpForce: -13,
      isJumping: false,
      isCrouching: false,
      crouchTimer: 0,
      isStopped: false,
      stopTimer: 0
    };

    // Obst\u00e1culos: cuadrados, mismo tama�o, velocidad constante
    this.obstacles = [];
    this.obstacleTimer = 0;
    this.obstacleInterval = 90; // frames entre obst\u00e1culos
    this.obstacleSize = 40;
    this.gameSpeed = 6;

    // Fondo (se desplaza cuando el personaje act\u00faa / avanza)
    this.bgX = 0;

    // Detector de manos
    this.detector = null;
    this.currentGesture = null;

    // Referencias DOM
    this.scoreEl = document.getElementById('scoreDisplay');
    this.overlayStart = document.getElementById('overlayStart');
    this.overlayPaused = document.getElementById('overlayPaused');
    this.overlayMultiHand = document.getElementById('overlayMultiHand');
    this.overlayGameOver = document.getElementById('overlayGameOver');
    this.cameraErrorEl = document.getElementById('cameraError');
    this.finalScoreEl = document.getElementById('finalScore');

    this.init();
  }

  init() {
    const video = document.getElementById('cameraPreview');
    this.detector = new HandDetector(video, (gesture) => {
      this.currentGesture = gesture;
    });

    this.detector.init().then(() => {
      if (this.detector.isCameraError()) {
        this.cameraErrorEl.classList.remove('hidden');
      }
    });

    this.bindButtons();
    this.loop();
  }

  bindButtons() {
    document.getElementById('btnStart').addEventListener('click', () => this.startGame());
    document.getElementById('btnRestart').addEventListener('click', () => this.startGame());
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.startTime = Date.now();
    this.obstacles = [];
    this.obstacleTimer = 0;
    this.bgX = 0;
    this.char.y = this.char.baseY;
    this.char.vy = 0;
    this.char.isJumping = false;
    this.char.isCrouching = false;
    this.char.isStopped = false;

    this.overlayStart.classList.remove('active');
    this.overlayStart.classList.add('hidden');
    this.overlayPaused.classList.add('hidden');
    this.overlayMultiHand.classList.add('hidden');
    this.overlayGameOver.classList.add('hidden');
    this.cameraErrorEl.classList.add('hidden');
  }

  // Ejecutar acci�n de personaje seg�n gesto detectado
  handleGesture() {
    const gesture = this.currentGesture;

    if (gesture === 'jump' && !this.char.isJumping && !this.char.isCrouching) {
      this.jump();
    } else if (gesture === 'crouch') {
      this.crouch();
    } else if (gesture === 'stop') {
      this.stopChar();
    }

    // El fondo se mueve cuando el personaje realiza una acci�n
    if (gesture === 'jump' || gesture === 'crouch' || gesture === 'stop') {
      this.bgX -= this.gameSpeed * 2;
    }
  }

  jump() {
    this.char.vy = this.char.jumpForce;
    this.char.isJumping = true;
  }

  crouch() {
    if (this.char.isJumping) return;
    this.char.isCrouching = true;
    this.char.height = 30;
    this.char.y = this.char.baseY + 20;
    this.char.crouchTimer = 30; // frames agachado
  }

  stopChar() {
    this.char.isStopped = true;
    this.char.stopTimer = 60; // frames detenido
  }

  update() {
    if (this.state === 'start') return;

    if (this.state === 'playing') {
      this.handleGesture();

      // Puntuaci�n = tiempo transcurrido
      this.score = (Date.now() - this.startTime) / 1000;
      this.scoreEl.textContent = `Tiempo: ${this.score.toFixed(1)}s`;

      // F\u00edsica del personaje (salto)
      if (this.char.isJumping) {
        this.char.y += this.char.vy;
        this.char.vy += this.char.gravity;
        if (this.char.y >= this.char.baseY) {
          this.char.y = this.char.baseY;
          this.char.vy = 0;
          this.char.isJumping = false;
        }
      }

      // Temporizador de agachado
      if (this.char.isCrouching) {
        this.char.crouchTimer--;
        if (this.char.crouchTimer <= 0) {
          this.char.isCrouching = false;
          this.char.height = 50;
          this.char.y = this.char.baseY;
        }
      }

      // Temporizador de detenido
      if (this.char.isStopped) {
        this.char.stopTimer--;
        if (this.char.stopTimer <= 0) {
          this.char.isStopped = false;
        }
      }

      // El fondo se desplaza constantemente (runner avanza autom\u00e1ticamente)
      this.bgX -= this.gameSpeed;
      if (this.bgX <= -this.canvas.width) {
        this.bgX = 0;
      }

      // Generar obst\u00e1culos
      this.obstacleTimer++;
      if (this.obstacleTimer >= this.obstacleInterval) {
        this.spawnObstacle();
        this.obstacleTimer = 0;
      }

      // Mover y chequear obst\u00e1culos
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= this.gameSpeed;

        // Colisi\u00f3n
        if (this.checkCollision(this.char, obs)) {
          this.gameOver();
        }

        // Eliminar fuera de pantalla
        if (obs.x + obs.size < 0) {
          this.obstacles.splice(i, 1);
        }
      }
    }
  }

  spawnObstacle() {
    const obs = {
      x: this.canvas.width,
      y: this.char.baseY - this.obstacleSize,
      size: this.obstacleSize
    };
    this.obstacles.push(obs);
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.size &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.size &&
      rect1.y + rect1.height > rect2.y
    );
  }

  gameOver() {
    this.state = 'gameover';
    this.finalScoreEl.textContent = `Puntaje: ${this.score.toFixed(1)}s`;
    this.overlayGameOver.classList.remove('hidden');
    this.overlayGameOver.classList.add('active');
    this.overlayPaused.classList.add('hidden');
    this.overlayMultiHand.classList.add('hidden');
  }

  draw() {
    // Limpieza
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'start') return;

    // Fondo con movimiento (rayas del suelo)
    this.drawBackground();

    // Suelo
    this.ctx.fillStyle = '#4a4a4a';
    this.ctx.fillRect(0, this.char.baseY + this.char.height, this.canvas.width, 100);
    this.ctx.fillStyle = '#3a3a3a';
    this.ctx.fillRect(0, this.char.baseY + this.char.height + 100, this.canvas.width, 100);

    // Personaje
    this.drawCharacter();

    // Obst\u00e1culos
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.strokeStyle = '#c0392b';
    this.ctx.lineWidth = 2;
    for (const obs of this.obstacles) {
      this.ctx.fillRect(obs.x, obs.y, obs.size, obs.size);
      this.ctx.strokeRect(obs.x, obs.y, obs.size, obs.size);
    }

    // Overlay de pausa dibujado en canvas
    if (this.state === 'paused') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 32px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSADO - Muestra tu mano', this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  drawBackground() {
    // Rayas de suelo que se desplazan para simular movimiento del fondo
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    const stripeSpacing = 40;
    const stripeLen = 25;
    const start = Math.floor((this.bgX % stripeSpacing) - stripeSpacing);
    for (let x = start; x < this.canvas.width + stripeSpacing; x += stripeSpacing) {
      const sx = x - this.bgX;
      this.ctx.moveTo(sx, this.char.baseY + this.char.height);
      this.ctx.lineTo(sx + stripeLen, this.char.baseY + this.char.height + 30);
    }
    this.ctx.stroke();
  }

  drawCharacter() {
    let drawY = this.char.y;
    let drawHeight = this.char.height;
    let drawWidth = this.char.width;
    let color = '#f39c12';

    if (this.char.isCrouching) {
      color = '#e67e22';
    } else if (this.char.isStopped) {
      color = '#95a5a6';
    }

    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = this.char.isStopped ? 0.6 : 1;
    this.ctx.fillRect(this.char.x, drawY, drawWidth, drawHeight);
    this.ctx.globalAlpha = 1;

    // Ojos
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(this.char.x + 10, drawY + 10, 6, 6);
    this.ctx.fillRect(this.char.x + 24, drawY + 10, 6, 6);

    // Estela al saltar hacia arriba
    if (this.char.isJumping && this.char.vy < 0) {
      this.ctx.fillStyle = 'rgba(243, 156, 18, 0.25)';
      this.ctx.fillRect(this.char.x, drawY + drawHeight, drawWidth, 12);
    }
  }

  loop() {
    this.update();
    this.draw();

    // Gesti\u00f3n de estados seg�n detecci\u00f3n de manos
    if (this.detector && this.detector.isRunning) {
      const gesture = this.detector.getCurrentGesture();

      if (this.state === 'playing') {
        if (gesture === 'pause') {
          // Sin mano: pausar
          this.state = 'paused';
          this.overlayPaused.classList.remove('hidden');
          this.overlayPaused.classList.add('active');
          this.overlayMultiHand.classList.add('hidden');
        } else if (gesture === 'multi') {
          // Dos o m\u00e1s manos: advertencia, juego congelado
          this.overlayMultiHand.classList.remove('hidden');
          this.overlayMultiHand.classList.add('active');
          this.overlayPaused.classList.add('hidden');
        } else {
          this.overlayPaused.classList.add('hidden');
          this.overlayMultiHand.classList.add('hidden');
        }
      } else if (this.state === 'paused') {
        // Volver a jugar s\u00f3lo con una mano detectada (cualquier gesto v\u00e1lido o mano presente)
        if (gesture !== 'pause' && gesture !== 'multi') {
          this.state = 'playing';
          this.overlayPaused.classList.add('hidden');
          this.overlayPaused.classList.remove('active');
          this.overlayMultiHand.classList.add('hidden');
          // Ajustar tiempo para no perder lo transcurrido en pausa
          this.startTime = Date.now() - this.score * 1000;
        } else if (gesture === 'multi') {
          this.overlayMultiHand.classList.remove('hidden');
          this.overlayMultiHand.classList.add('active');
          this.overlayPaused.classList.add('hidden');
        }
      }
    }

    requestAnimationFrame(() => this.loop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
