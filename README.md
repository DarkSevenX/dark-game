# DarkGame

Prototipo de supervivencia en el navegador, inspirado en *Vampire Survivors*: mapa amplio con obstáculos, movimiento con teclado, **aura de daño automática**, varias **armas opcionales** (rayo, proyectiles, perforación, orbitales, nova), **orbes de XP** con distinta rareza, enemigos tipados con dificultad creciente y proyecto en **TypeScript**.

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
| `npm run dev` | Servidor Vite (por defecto [http://localhost:5173](http://localhost:5173), `open: true` en `vite.config.ts`) |
| `npm run build` | Genera la build en `dist/` |
| `npm run preview` | Sirve `dist/` para probar la build de producción |
| `npm run typecheck` | Verificación estática con TypeScript (`tsc --noEmit`) |

Punto de entrada HTML: `index.html` carga `/src/main.ts`. El juego ocupa **pantalla completa** (`#game` al 100 % del viewport).

## Controles

| Acción | Entrada |
|--------|---------|
| Mover | Flechas o **W A S D** |
| Pausa | **ESC** (reanudar con ESC o clic en el panel) |
| Tras game over | **R** o botón *Volver a intentar* |

## Estructura del código

```
src/
  main.ts                    # Phaser.Game, resize / visualViewport
  vite-env.d.ts              # Tipos Vite
  scenes/
    PlayScene.ts             # Orquestación: create/update, input, cámara
  game/
    gameSceneTypes.ts        # GameScene, stats, estados de armas, ArcadeRectBody
    constants.ts             # WORLD, COLORS, ORB_TIERS, balance, zoom
    gameConfig.ts            # Config Phaser y registro de escenas
    enemySpawn.ts            # getUnlockedEnemyKeys, pickEnemyTypeForSpawn
    data/
      enemies.ts             # ENEMY_DEFS, ENEMY_UNLOCK_SEC, leyenda
      upgrades.ts            # UPGRADE_POOL, WEAPON_POOL, pickThreeUpgrades
    utils/
      format.ts              # Tiempo m:ss
      xp.ts                  # xpForLevel(level)
    play/
      camera.ts              # Zoom y límites al redimensionar
      hud.ts                 # Barras, leyenda de enemigos
      world.ts               # Fondo, cuadrícula, rocas, orbes y corazones iniciales
      spawn.ts               # Oleadas y spawnEnemy
      combat.ts              # Aura, contacto, knockback del jugador
      weapons.ts             # Rayo, proyectiles, perforación, orbitales, nova
      xp.ts                  # Orbes, recolección, loot al matar
      levelFlow.ts           # consumeLevel (subir sin abrir UI)
      modals.ts              # Menú de nivel, game over, pausa
```

## Mundo y presentación

- **Tamaño del mundo**: 6400×4800 (lógica y física Arcade).
- **Suelo**: cuadrícula gris (placeholder hasta sprites).
- **Rocas**: obstáculos azules estáticos; colisión con jugador, enemigos y proyectiles.
- **Cámara**: sigue al jugador con suavizado; zoom según referencia 960×540; `resize` correcto al cambiar el viewport (`camera.ts`).
- **Orbes iniciales**: repartidos por el mapa; cada uno tiene una **categoría** (`dim` / `normal` / `rich`) definida en `ORB_TIERS` (`constants.ts`): distinto tamaño, color y rango de XP.

## Orbes y XP

- **Mundo y bajas**: la XP del orbe depende de la categoría (poca / media / mucha) más un extra por nivel y el `xpBonus` del enemigo en drops.
- **Corazones**: curan PV (cantidad en rango configurable); unos pocos salen repartidos por el mapa y a veces **sueltan los enemigos** al morir (baja probabilidad). Se recogen con el mismo radio que los orbes; si ya estás a **PV máximos**, el corazón no se consume y sigue en el suelo.
- **Recogida**: el jugador atrae orbes y corazones dentro de un radio (`BASE_PICKUP_RADIUS` en `constants.ts`; la mejora *Imán etéreo* aumenta ese radio).
- **Multiplicador**: la mejora *Hambre de conocimiento* afecta a la XP ganada por orbe.
- **Siguiente nivel**: `xpForLevel(level)` en `src/game/utils/xp.ts`  
  `floor(32 + L×52 + L²×4.2 + 0.15×L³)` con `L = max(1, level)`.
- Puede encadenarse más de una subida si sobra XP al cerrar el menú de nivel.

## Combate y supervivencia

- **Aura**: daño automático en área; cooldown (`attackCooldownMs`).
- **PV / game over**: barra en HUD; daño por contacto (intervalos, i-frames, knockback al jugador).
- **Bajas**: contador y resumen en game over.
- **Knockback**: enemigos al recibir aura, rayo, orbitales o nova; jugador al ser golpeado.

## Armas adicionales (menú de nivel)

En cada subida aparecen **3 cartas** (stats o armas), sin repetir `id` en la misma tirada.

| ID menú | Nombre | Comportamiento |
|--------|--------|----------------|
| `weapon_lightning` | **Arco voltaico** | Rayo al enemigo vivo más cercano en rango. Mejoras: daño, cadencia, alcance. |
| `weapon_projectile` | **Dardos lúgubres** | Proyectil hacia el más cercano; choca con enemigos, rocas o distancia máxima. |
| `weapon_pierce` | **Carrete perforante** | Saeta que **atraviesa** varios enemigos (no atraviesa rocas). |
| `weapon_orbit` | **Vértigos certeros** | Hojas que orbitan al jugador y hacen daño periódico. |
| `weapon_nova` | **Pulsación abisal** | Onda de daño en área grande cada intervalo. |

En código se enlazan con `applyLightningWeaponUpgrade()`, `applyProjectileWeaponUpgrade()`, etc., en `PlayScene`.

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

## Enemigos y progresión temporal

| Tipo (nombre en HUD) | Notas breves |
|----------------------|--------------|
| Acechador | Base; equilibrado |
| Corredor | Más rápido, menos daño al contacto |
| Bruto | Más PV, más lento, más daño |
| Celador | Tanque, mucho PV, violeta |

**Desbloqueo por tiempo** (`ENEMY_UNLOCK_SEC` en `enemies.ts`):

| Tras (s) | En pool de spawns |
|----------|-------------------|
| 0 | Acechador |
| 45 | + Corredor |
| 90 | + Bruto |
| 300 | + Celador |

La leyenda del HUD atenúa tipos aún no desbloqueados.

## Dificultad en el tiempo

- Spawns más frecuentes con los minutos y **ráfagas** de enemigos.
- Multiplicador de velocidad de enemigos (con tope).
- Tope de enemigos vivos (`MAX_ENEMIES_ALIVE`).

## Interfaz

- **Cronómetro** centrado arriba (m:ss).
- **PV** y **XP** con barras y texto.
- **Nivel** y **bajas** en esquinas.
- **Pausa** (**ESC**): congela física y tiempo de Phaser.
- **Subida de nivel**: tres cartas a elegir.

## Desarrollo: probar armas al iniciar

En `src/game/constants.ts`, **`DEV_START_WEAPONS`** aplica armas al crear la escena (misma lógica que las cartas):

```typescript
export const DEV_START_WEAPONS: DevWeaponId[] = []; // partida normal
// export const DEV_START_WEAPONS = ['lightning', 'projectile', 'pierce', 'orbit', 'nova'];
```

Valores posibles: `lightning`, `projectile`, `pierce`, `orbit`, `nova`. Dejar `[]` en builds finales.

## Licencia

El proyecto se distribuye bajo **Apache License 2.0** (archivo `LICENSE` en la raíz). El campo `license` en `package.json` es `Apache-2.0`.

## Stack técnico

| Tecnología | Uso |
|------------|-----|
| [Phaser 3.80](https://phaser.io/) | Motor 2D, física Arcade, escenas, cámara |
| [Vite 5](https://vitejs.dev/) | Dev server y empaquetado ES modules |
| [TypeScript 5.7](https://www.typescriptlang.org/) | Tipado estático; `npm run typecheck` |
