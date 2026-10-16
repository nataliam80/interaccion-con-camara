# Especificaciones del proyecto de interacción

## 1. Funcionamiento general de la aplicación

La aplicación será un juego tipo runner de plataformas en el que el personaje avanza automáticamente por un escenario con obstáculos. El jugador no usa teclado ni mouse: controla todo con la mano frente a la cámara web. Al abrir la aplicación se solicita acceso a la cámara, que detecta la mano en tiempo real y cuenta cuántos dedos están levantados. Cada gesto se traduce en una acción del personaje, que reacciona a los obstáculos del escenario.

El fondo debe moverse cuando el personaje realice alguna acción; el personaje en sí no se desplaza horizontalmente, solo realiza los movimientos (salto, agachado, detenido).

## 2. Requisitos técnicos y stack

- Lenguajes: HTML, CSS y JavaScript vanilla.
- Renderizado: elemento `<canvas>` para dibujar el juego.
- Detección de manos: MediaPipe Hands desde la cámara web.
- Entorno de desarrollo: Visual Studio Code con la extensión Live Server.
- Requisitos de cámara: acceso obligatorio a la cámara web. Si el usuario deniega el permiso o no hay cámara disponible, se muestra un mensaje de error y no se puede jugar. No hay controles alternativos de teclado ni mouse.

## 3. Detección de entrada y cámara

- La aplicación solicita acceso a la cámara al abrirse.
- MediaPipe Hands detecta la(s) mano(s) en tiempo real y cuenta los dedos levantados.
- **Una sola mano:** el juego corre normalmente con una mano detectada.
- **Dos o más manos:** se muestra una advertencia centrada en pantalla que diga que solo se debe jugar con una mano; el juego no avanza mientras persista la detección de múltiples manos.
- **Sin mano detectada:** el juego se pausa.
- **Umbral de estabilidad:** un gesto se activa tras mantenerse durante al menos un frame consecutivo (detección mínima de un frame).

## 4. Gestos y acciones del personaje

| Dedos levantados | Acción del personaje |
|------------------|----------------------|
| Mano abierta (5 dedos) | Salta para esquivar obstáculos |
| Mano cerrada / puño (0 dedos) | Se agacha para pasar por debajo de obstáculos altos |
| 1, 2, 3 o 4 dedos | Sin acción definida |
| Sin mano / cámara sin detección | El juego se pausa |

Cuando la mano deja de detectarse en cualquier momento, el juego entra en pausa hasta que vuelva a detectarse una mano válida.

### Reinicio de partida

Cuando termina la partida y el jugador presiona **Reiniciar**, la aplicación vuelve a la pantalla de inicio (no reinicia la partida automáticamente). Desde allí debe presionar **Comenzar partida** para jugar de nuevo.

## 5. Mecánicas del juego

- **Personaje:** no se desplaza horizontalmente por el escenario; solo ejecuta las animaciones de salto, agachado y detenido.
- **Escenario/fondo:** se desplaza cuando el personaje realiza una acción.
- **Velocidad:** constante, no aumenta con el tiempo.
- **Puntuación:** cuenta únicamente el tiempo transcurrido desde que empieza la partida.
- **Dificultad:** constante, no progresiva.
- **Obstáculos:** cuadrados, todos del mismo tamaño, de dos tipos:
  - **En el piso:** se esquivan saltando (1 dedo).
  - **En el aire (a la altura del personaje):** se esquivan agachándose (2 dedos).
- **Colisión:** si el personaje golpea un obstáculo, la partida termina.
- **Fin de partida:** se muestra el puntaje final con un botón para reiniciar.

## 6. Interfaz de usuario

- Escenario con el personaje y el puntaje dibujados en el canvas.
- Vista pequeña de la cámara en una esquina, para que el jugador compruebe que su mano se detecta bien.
- Guía visual de los gestos en la pantalla de inicio.
- Advertencia central cuando se detectan dos o más manos.
- Pantalla de fin de partida con puntaje y botón de reinicio.

## 7. Estados de la aplicación

1. **Pantalla de inicio:** guía visual de gestos y botón para comenzar.
2. **Jugando:** partida activa con detección de mano y puntuación por tiempo.
3. **Pausado:** cuando no se detecta ninguna mano.
4. **Game over:** pantalla final con puntaje y botón de reiniciar.

## 8. Recomendaciones de uso

- Buena iluminación.
- Fondo simple y despejado detrás del jugador.
- Mantener la mano dentro del encuadre de la cámara.
