/**
 * HandDetector
 * Inicializa MediaPipe Hands, gestiona el stream de la c�mara y detecta gestos
 * seg�n el n�mero de dedos levantados.
 */
class HandDetector {
  constructor(videoElement, onGestureChange) {
    this.videoElement = videoElement;
    this.onGestureChange = onGestureChange;
    this.hands = null;
    this.camera = null;
    this.currentGesture = null; // 'jump' | 'crouch' | 'stop' | 'pause' | 'multi' | null
    this.lastGesture = null;
    this.isRunning = false;
    this.cameraError = false;
    this.cameraErrorMessage = '';
  }

  async init() {
    try {
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      this.hands.onResults((results) => this.onResults(results));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      this.videoElement.srcObject = stream;
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = resolve;
      });

      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          await this.hands.send({ image: this.videoElement });
        },
        width: 640,
        height: 480
      });

      this.camera.start();
      this.isRunning = true;
    } catch (err) {
      console.error('Camera error:', err);
      this.cameraError = true;
      this.cameraErrorMessage = err.message || 'No se pudo acceder a la c�mara.';
    }
  }

  onResults(results) {
    const { multiHandLandmarks } = results;

    // No se detecta ninguna mano -> pausa
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
      this.updateGesture('pause');
      return;
    }

    // Dos o m�s manos -> advertencia
    if (multiHandLandmarks.length >= 2) {
      this.updateGesture('multi');
      return;
    }

    // Una sola mano: contar dedos
    const landmarks = multiHandLandmarks[0];
    const handedness = results.multiHandedness ? results.multiHandedness[0] : null;
    const fingerCount = this.countFingers(landmarks, handedness);

    let gesture;
    if (fingerCount === 1) {
      gesture = 'jump';
    } else if (fingerCount === 2) {
      gesture = 'crouch';
    } else if (fingerCount >= 5) {
      gesture = 'stop';
    } else {
      // 0, 3, 4 dedos: sin acci�n espec�fica
      gesture = null;
    }

    this.updateGesture(gesture);
  }

  /**
   * Cuenta dedos levantados comparando punta (tip) con articulaci�n intermedia (PIP).
   * El pulgar se eval\u00faa por distancia desde la mu\u00f1eca.
   */
  countFingers(landmarks, handedness) {
    let count = 0;

    const wrist = landmarks[0];

    // Pulgar: punta (4) vs articulaci\u00f3n intermedia (3), distancia desde mu\u00f1eca
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const distTip = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
    const distIp = Math.hypot(thumbIp.x - wrist.x, thumbIp.y - wrist.y);
    if (distTip > distIp) {
      count++;
    }

    // Dem\u00e1s dedos: punta (y menor = m\u00e1s arriba) vs PIP
    const fingerPairs = [
      [8, 6],   // \u00edndice
      [12, 10], // medio
      [16, 14], // anular
      [20, 18]  // me\u00f1ique
    ];

    for (const [tip, pip] of fingerPairs) {
      if (landmarks[tip].y < landmarks[pip].y) {
        count++;
      }
    }

    return count;
  }

  /**
   * Umbral de estabilidad: un solo frame. El gesto est\u00e1 activo en el frame actual.
   */
  updateGesture(gesture) {
    if (this.currentGesture !== gesture) {
      this.lastGesture = this.currentGesture;
      this.currentGesture = gesture;
      if (this.onGestureChange) {
        this.onGestureChange(gesture, this.lastGesture);
      }
    }
  }

  getCurrentGesture() {
    return this.currentGesture;
  }

  isCameraError() {
    return this.cameraError;
  }

  getCameraErrorMessage() {
    return this.cameraErrorMessage;
  }

  stop() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
    }
    if (this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
  }
}
