# DarkGame

Prototipo de supervivencia en el navegador, inspirado en *Vampire Survivors*: mapa amplio con obstáculos, movimiento con teclado, **aura de daño automática**, armas adicionales opcionales (rayos y proyectiles), XP, subidas de nivel con cartas de mejora **y** armas, enemigos con varios tipos y dificultad creciente.

## Requisitos

- **Node.js** 18 o superior (recomendado)
- Navegador moderno (ES modules)

## Instalación y scripts

```bash
npm install
npm run dev
```

| Comando | Descripción |
|--------|-------------|
| `npm run dev` | Servidor Vite (por defecto [http://localhost:5173](http://localhost:5173), `open: true` en `vite.config.js`) |
| `npm run build` | Genera la build en `dist/` |
| `npm run preview` | Sirve `dist/` para probar la build de producción |

Punto de entrada HTML: `index.html` carga `/src/main.js`. El juego ocupa **pantalla completa** (`#game` al 100 % del viewport).

## Controles

| Acción | Entrada |
|--------|---------|
| Mover | Flechas o **W A S D** |
| Pausa | **ESC** (reanudar con ESC o clic en el panel) |
| Tras game over | **R** o botón *Volver a intentar* |

## Estructura del código

```
src/
  main.js                    # Crea Phaser.Game, listeners de resize / visualViewport
  scenes/
    PlayScene.js             # Escena principal: mundo, física, HUD, combate, menús
  game/
    constants.js             # WORLD, COLORS, balance, zoom, DEV_START_WEAPONS
    gameConfig.js            # Configuración del juego y registro de escenas
    enemySpawn.js           # getUnlockedEnemyKeys, pickEnemyTypeForSpawn
    data/
      enemies.js             # ENEMY_DEFS, tiempos de desbloqueo, orden de leyenda
      upgrades.js            # UPGRADE_POOL, WEAPON_POOL, pickThreeUpgrades
    utils/
      format.js              # Tiempo m:ss
      xp.js                  # xpForLevel(level)
```

## Mundo y presentación

- **Tamaño del mundo**: 4200×3200 (lógica y física Arcade).
- **Suelo**: cuadrícula gris (placeholder hasta sprites).
- **Rocas**: obstáculos azules estáticos; colisión con jugador y enemigos.
- **Cámara**: sigue al jugador con suavizado; zoom derivado de una referencia 960×540 para mantener encuadre al redimensionar.
- **Orbes iniciales**: muchos XP repartidos al empezar (sin solaparse con el spawn ni con rocas).

## Combate y supervivencia

- **Aura**: daño automático en área alrededor del jugador; cooldown configurable (`attackCooldownMs`).
- **PV / game over**: barra en HUD; daño por contacto con enemigos (intervalos + i-frames + knockback hacia atrás).
- **Bajas**: contador en HUD y resumen en game over.
- **Knockback**: enemigos al recibir aura (y al recibir rayo); jugador al ser golpeado.

## Armas adicionales (menú de nivel)

En cada subida de nivel aparecen **3 cartas** elegidas entre **mejoras de estadísticas** y **armas**. No pueden repetirse **dos cartas con el mismo `id` en la misma tirada**.

| ID menú | Nombre | Comportamiento |
|--------|--------|----------------|
| `weapon_lightning` | **Arco voltaico** | Rayo instantáneo al enemigo **vivo más cercano** en rango, de uno en uno. Cadencia propia. Repetir la carta mejora daño, cadencia y alcance. |
| `weapon_projectile` | **Dardos lúgubres** | Proyectil **dinámico** (rectángulo orientado) hacia el enemigo más cercano en rango; vuela en línea recta hasta impactar enemigo, **roca** o distancia máxima / salida del mapa. Cadencia independiente del rayo y del aura. Repetir mejora daño, velocidad, cadencia y alcances. |

Las armas se aplican con los mismos métodos que al elegir la carta: `applyLightningWeaponUpgrade()` y `applyProjectileWeaponUpgrade()` en `PlayScene`.

## Mejoras de estadísticas (pool)

| Mejora | Efecto (resumen) |
|--------|-------------------|
| Vitalidad | +28 PV máx.; cura 14 PV |
| Botas ligeras | +11 % velocidad |
| Alcance del vacío | +32 px radio del aura |
| Metrónomo cruel | −14 % cooldown del aura (mín. 200 ms) |
| Imán etéreo | +62 px radio de recogida de orbes |
| Piel de piedra | −14 % daño recibido (acumulable) |
| Hambre de conocimiento | +40 % XP por orbe |
| Segundo aire | +22 PV máx.; +7 % vel.; cura 8 PV |

## XP y nivel

- Orbes al matar enemigos (y orbes del mapa); aplica multiplicador por mejora.
- XP para el siguiente nivel: `xpForLevel(level)` en `src/game/utils/xp.js`  
  `floor(32 + L×52 + L²×4.2 + 0.15×L³)` con `L = max(1, level)`.
- Puede encadenarse más de una subida si sobra XP al cerrar el menú.

## Enemigos y progresión temporal

| Tipo (nombre en HUD) | Notas breves |
|----------------------|--------------|
| Acechador | Base; equilibrado |
| Corredor | Más rápido, menos daño al contacto |
| Bruto | Más PV, más lento, más daño |
| Turba | Muy rápido, pequeño |
| Celador | Tanque, mucho PV, violeta |

**Desbloqueo por tiempo de partida** (segundos, ver `ENEMY_UNLOCK_SEC` en `enemies.js`):

| Tras (s) | Aparece en el pool de spawns |
|----------|------------------------------|
| 0 | Acechador |
| 45 | + Corredor |
| 90 | + Bruto |
| 180 | + Turba |
| 300 | + Celador |

La leyenda del HUD atenúa los tipos aún no desbloqueados.

## Dificultad en el tiempo

- Intervalo de spawns que se acorta con los minutos y **ráfagas** de varios enemigos.
- Velocidad global de enemigos con multiplicador creciente (con tope).
- Tope de enemigos vivos (`MAX_ENEMIES_ALIVE`) para rendimiento.

## Interfaz

- **Cronómetro** grande centrado arriba (m:ss).
- Barras de **PV** y **XP** con valores numéricos.
- **Nivel** y **bajas** (esquinas).
- Menú de **pausa**: congela física y tiempo de Phaser (el cronómetro no avanza).
- Menú de **nivel**: pausa física y spawns hasta elegir carta.

## Desarrollo: probar armas al iniciar

En `src/game/constants.js`, **`DEV_START_WEAPONS`** desbloquea armas al crear la escena (misma lógica que las cartas), sin pasar por el menú:

```javascript
export const DEV_START_WEAPONS = [];                    // partida normal
export const DEV_START_WEAPONS = ['lightning'];       // solo Arco voltaico
export const DEV_START_WEAPONS = ['projectile'];      // solo Dardos
export const DEV_START_WEAPONS = ['lightning', 'projectile']; // ambas
```

Valores permitidos: `'lightning'` y `'projectile'`.  
**Recomendación:** dejar `[]` en commits y builds finales; usar el array solo en local para tests.

## Stack técnico

| Tecnología | Uso |
|------------|-----|
| [Phaser 3.80](https://phaser.io/) | Motor 2D, física Arcade, escenas, cámara |
| [Vite 5](https://vitejs.dev/) | Dev server y empaquetado ES modules |

