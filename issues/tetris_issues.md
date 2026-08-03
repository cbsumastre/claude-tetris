# Issues para mejorar el juego de Tetris

Lista de mejoras organizadas por categoría, lista para copiar como Issues en GitHub (una por una o agrupadas por milestone).

---

## 1. Mecánicas core del juego

- [ ] **Wall kicks (SRS)**: implementar el Super Rotation System para permitir rotaciones cerca de paredes y otras piezas.
- [ ] **Hold piece**: permitir guardar una pieza para usarla más tarde.
- [x] **Next queue**: mostrar las 3-5 piezas siguientes, no solo la próxima.
- [ ] **Ghost piece**: mostrar una sombra que indique dónde caerá la pieza actual.
- [ ] **7-bag randomizer**: usar el sistema de bolsa de 7 piezas en vez de aleatorio puro.
- [ ] **Soft drop / Hard drop**: diferenciar ambos tipos de caída con su puntuación correspondiente.

---

## 2. Puntuación y progresión

- [ ] **Sistema de puntuación oficial**: Single, Double, Triple, Tetris con sus multiplicadores.
- [ ] **T-Spin detection**: detectar y puntuar T-Spins normales y mini.
- [ ] **Sistema de combos**: bonificar líneas consecutivas sin piezas "muertas" en medio.
- [ ] **Velocidad progresiva**: aumentar la velocidad de caída según nivel/líneas eliminadas.
- [ ] **High scores**: guardar y mostrar puntuaciones máximas (localStorage o backend).
- [ ] **Back-to-Back bonus**: bonificar Tetris/T-Spins consecutivos.

---

## 3. Interfaz y experiencia de usuario

- [ ] **Pantalla de pausa**: con opciones de reanudar y reiniciar.
- [ ] **Menú principal**: selección de modos (Maratón, Sprint, Ultra, Zen).
- [ ] **HUD mejorado**: indicadores más claros/animados de nivel, líneas y puntuación.
- [ ] **Animaciones al limpiar líneas**: flash, shake u otros efectos visuales.
- [ ] **Diseño responsive**: que se vea bien en móvil y escritorio.
- [x] **Pantalla de Game Over**: resumen de estadísticas (piezas usadas, tiempo, PPS).

---

## 4. Audio y feedback

- [ ] **Efectos de sonido**: rotar, mover, colocar pieza, limpiar línea, game over.
- [ ] **Música de fondo**: con opción de mute/control de volumen.
- [ ] **Feedback háptico**: vibración en versión móvil al limpiar líneas.
- [ ] **Sonidos especiales**: distintos para Tetris, T-Spin y combos.
- [ ] **Indicador de subida de nivel**: feedback visual y/o sonoro.

---

## 5. Accesibilidad y configuración

- [ ] **Remapeo de teclas**: permitir controles personalizados.
- [ ] **Soporte de gamepad**: jugar con mando.
- [ ] **Paleta daltónica**: colores alternativos para las piezas.
- [ ] **DAS/ARR configurables**: Delayed Auto Shift y Auto Repeat Rate ajustables.
- [ ] **Modo alto contraste**: y/o tamaño de bloque ajustable.
- [ ] **Soporte multi-idioma (i18n)**: si se va a compartir más ampliamente.

---

## 6. Rendimiento, arquitectura y calidad de código

- [ ] **Separar lógica y renderizado**: desacoplar grid/colisiones/piezas de la capa visual.
- [ ] **Tests unitarios**: para colisiones, rotación (SRS) y limpieza de líneas.
- [ ] **Optimizar game loop**: uso correcto de `requestAnimationFrame`, evitar renders innecesarios.
- [ ] **Máquina de estados**: estados claros (menu, playing, paused, gameover).
- [ ] **Documentación**: README con controles e instrucciones para correr el proyecto.
- [ ] **CI básico**: lint + tests automatizados en cada push/PR.
