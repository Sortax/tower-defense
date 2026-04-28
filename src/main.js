import Phaser from "phaser"
import "./style.css"
import { TOWER_KEY_ORDER, TOWER_TYPES } from "./game/types/towers"
import { ENEMY_TYPES } from "./game/types/enemies"
import { WAVES } from "./game/systems/waves"

const BEST_SCORE_KEY = "tower_defense_best_scores"
const HUD_HIDDEN_DISPLAY = "none"
const HUD_VISIBLE_DISPLAY = "flex"

const GAME_MODES = {
      easy: { key: "easy", label: "Easy", maxWaves: 20 },
      normal: { key: "normal", label: "Normal", maxWaves: 30 },
      endless: { key: "endless", label: "Endless", maxWaves: null }
}

function setHudVisibility(visible) {
      const hud = document.getElementById("hud")
      if (!hud) return
      hud.style.display = visible ? HUD_VISIBLE_DISPLAY : HUD_HIDDEN_DISPLAY
}

function getBestScores() {
      try {
              const raw = localStorage.getItem(BEST_SCORE_KEY)
              const parsed = raw ? JSON.parse(raw) : {}
                      return { easy: 0, normal: 0, endless: 0, ...parsed }
      } catch {
              return { easy: 0, normal: 0, endless: 0 }
      }
}

function getBestScore(modeKey = "normal") { return getBestScores()[modeKey] ?? 0 }

function setBestScore(modeKey, score) {
      try {
              const all = getBestScores()
              all[modeKey] = Math.max(all[modeKey] ?? 0, score)
              localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(all))
      } catch { /* ignore */ }
}

class MenuScene extends Phaser.Scene {
      constructor() { super("menu") }
      create() {
              setHudVisibility(false)
              this.cameras.main.setBackgroundColor("#111")
              this.selectedModeKey = "normal"
              this.add.text(450, 90, "Tower Defense", { fontSize: "58px", color: "#ffffff" }).setOrigin(0.5)
              this.add.text(450, 190, "Instructions", { fontSize: "26px", color: "#ffee88" }).setOrigin(0.5)
              this.add.text(450, 270, "1/2/3/4: Tower  |  5: Wall\nClick empty tile: Place\nClick tower: Upgrade / Sell\nEntry: top-left  |  Exit: bottom-right\nWalls reroute enemies (BFS)", { fontSize: "18px", color: "#ffffff", align: "center", lineSpacing: 6 }).setOrigin(0.5)
              const scores = getBestScores()
              this.add.text(450, 390, `Best - Easy: ${scores.easy} | Normal: ${scores.normal} | Endless: ${scores.endless}`, { fontSize: "18px", color: "#aee3ff" }).setOrigin(0.5)
              this.add.text(450, 430, "Select Mode", { fontSize: "24px", color: "#ffee88" }).setOrigin(0.5)
              const modeButtonY = 480
              this.modeButtons = []
                      Object.values(GAME_MODES).forEach((mode, index) => {
                                const button = this.add.text(330 + index * 120, modeButtonY, mode.label, { fontSize: "24px", color: "#cfd8dc", backgroundColor: "#25333d", padding: { x: 12, y: 8 } }).setOrigin(0.5)
                                button.setInteractive({ useHandCursor: true })
                                button.on("pointerdown", () => { this.selectedModeKey = mode.key; this.updateModeButtonStyles() })
                                this.modeButtons.push({ key: mode.key, button })
                      })
              this.updateModeButtonStyles()
              const playButton = this.add.text(450, 555, "Play", { fontSize: "36px", color: "#7fffa0", backgroundColor: "#1b3d24", padding: { x: 20, y: 10 } }).setOrigin(0.5)
              playButton.setInteractive({ useHandCursor: true })
              playButton.on("pointerover", () => playButton.setStyle({ color: "#d8ffe6" }))
              playButton.on("pointerout", () => playButton.setStyle({ color: "#7fffa0" }))
              playButton.on("pointerdown", () => { this.scene.start("game", { mode: GAME_MODES[this.selectedModeKey] }) })
      }
      updateModeButtonStyles() {
              this.modeButtons.forEach(({ key, button }) => {
                        const isActive = key === this.selectedModeKey
                        button.setStyle({ color: isActive ? "#ffffff" : "#cfd8dc", backgroundColor: isActive ? "#2f7f46" : "#25333d" })
              })
      }
}

class GameOverScene extends Phaser.Scene {
      constructor() { super("gameover") }
      create(data) {
              setHudVisibility(false)
              const title = data.title ?? "Game Over"
              const titleColor = data.titleColor ?? "#ff5555"
              const mode = data.mode ?? GAME_MODES.normal
              const finalWaveReached = data.finalWaveReached ?? 1
              const score = data.score ?? 0
              const bestScore = data.bestScore ?? getBestScore(mode.key)
              this.cameras.main.setBackgroundColor("#111")
              this.add.text(450, 150, title, { fontSize: "64px", color: titleColor }).setOrigin(0.5)
              this.add.text(450, 280, `Mode: ${mode.label}\nFinal Wave: ${finalWaveReached}\nScore: ${score}\nBest (${mode.label}): ${bestScore}`, { fontSize: "26px", color: "#ffffff", align: "center", lineSpacing: 10 }).setOrigin(0.5)
              const restartButton = this.add.text(450, 470, "Restart", { fontSize: "36px", color: "#7fffa0", backgroundColor: "#1b3d24", padding: { x: 20, y: 10 } }).setOrigin(0.5)
              restartButton.setInteractive({ useHandCursor: true })
              restartButton.on("pointerover", () => restartButton.setStyle({ color: "#d8ffe6" }))
              restartButton.on("pointerout", () => restartButton.setStyle({ color: "#7fffa0" }))
              restartButton.on("pointerdown", () => { this.scene.start("game", { mode }) })
              const menuButton = this.add.text(450, 545, "Menu", { fontSize: "26px", color: "#aee3ff", backgroundColor: "#1e2a33", padding: { x: 16, y: 8 } }).setOrigin(0.5)
              menuButton.setInteractive({ useHandCursor: true })
              menuButton.on("pointerdown", () => { this.scene.start("menu") })
      }
}

class GameScene extends Phaser.Scene {
      constructor() { super("game") }
      create(data) {
              setHudVisibility(true)
              this.cameras.main.setBackgroundColor("#111")
              this.mode = data.mode ?? GAME_MODES.normal
              this.maxWaves = this.mode.maxWaves
              this.tileSize = 48
              this.gridW = 16
              this.gridH = 10
              this.originX = 40
              this.originY = 40
              this.entry = { x: 0, y: 0 }
              this.exit = { x: this.gridW - 1, y: this.gridH - 1 }
              this.walls = new Set()
              this.wallsVersion = 0
              this.initialPath = this.generateRandomPath()
              this.pathSet = new Set(this.initialPath.map(p => `${p.x},${p.y}`))
              this.graphics = this.add.graphics()
              this.drawGrid()
              this.enemies = this.add.group()
              this.projectiles = this.add.group()
              this.towers = []
                      this.money = 80
              this.lives = 10
              this.gameOver = false
              this.waveIndex = 0
              this.wavesCompleted = 0
              this.moneyEarned = 0
              this.waveState = "intermission"
              this.countdownRemaining = 0
              this.countdownTimer = null
              this.pendingSpawns = 0
              this.waveSpawnRemaining = 0
              this.selectedTowerKey = TOWER_KEY_ORDER[0]
              this.selectedPlacedTower = null
              this.uiPadding = 16
              this.hudLeftEl = document.getElementById("hud-left")
              this.hudRightEl = document.getElementById("hud-right")
              this.hudRightLabelEl = document.getElementById("hud-right-label")
              this.hudMenuBtnEl = document.getElementById("hud-menu-btn")
              this.towerPanelEl = document.getElementById("tower-panel")
              this.towerPanelInfoEl = document.getElementById("tower-panel-info")
              this.towerUpgradeBtnEl = document.getElementById("tower-upgrade-btn")
              this.towerSellBtnEl = document.getElementById("tower-sell-btn")
              this.createWaveControls()
              this.bindTowerPanelControls()
              this.bindHudMenuButton()
              this.createRangeOverlay()
              this.createGhostOverlay()
              this.createCountdownOverlay()
              this.scale.on("resize", () => this.layoutGameUi())
              this.layoutGameUi()
              this.bindInput()
              this.updateUI()
              this.setStartButtonState(true, "Start Wave 1")
      }

  generateRandomPath() {
          // Randomized walk biased toward exit (bottom-right). Always succeeds.
        const path = [{ x: this.entry.x, y: this.entry.y }]
          let cur = { x: this.entry.x, y: this.entry.y }
          const visited = new Set([`${cur.x},${cur.y}`])
          let safety = 500
          while ((cur.x !== this.exit.x || cur.y !== this.exit.y) && safety-- > 0) {
                    const dx = this.exit.x - cur.x
                    const dy = this.exit.y - cur.y
                    const candidates = []
                              // Bias: tend toward exit
                              if (dx > 0) candidates.push({ x: cur.x + 1, y: cur.y }, { x: cur.x + 1, y: cur.y })
                    if (dy > 0) candidates.push({ x: cur.x, y: cur.y + 1 }, { x: cur.x, y: cur.y + 1 })
                    // Some randomness on perpendicular axes
            if (cur.x > 0 && Math.random() < 0.15) candidates.push({ x: cur.x - 1, y: cur.y })
                    if (cur.y > 0 && Math.random() < 0.15) candidates.push({ x: cur.x, y: cur.y - 1 })
                    if (candidates.length === 0) candidates.push({ x: cur.x + 1, y: cur.y })
                    // Filter unvisited and in-bounds
            const valid = candidates.filter(c => c.x >= 0 && c.y >= 0 && c.x < this.gridW && c.y < this.gridH && !visited.has(`${c.x},${c.y}`))
                    const next = valid.length ? valid[Math.floor(Math.random() * valid.length)] : { x: cur.x + (dx > 0 ? 1 : 0), y: cur.y + (dy > 0 ? 1 : 0) }
                    cur = { x: next.x, y: next.y }
                    visited.add(`${cur.x},${cur.y}`)
                    path.push(cur)
          }
          if (path[path.length - 1].x !== this.exit.x || path[path.length - 1].y !== this.exit.y) {
                    // Fallback: append straight line to exit
            let { x, y } = path[path.length - 1]
                    while (x < this.exit.x) { x++; path.push({ x, y }) }
                    while (y < this.exit.y) { y++; path.push({ x, y }) }
          }
          return path
  }

  computePathFrom(startX, startY) {
          // BFS from (startX,startY) to this.exit, blocked by walls and towers
        const blocked = new Set()
          this.walls.forEach(k => blocked.add(k))
          this.towers.forEach(t => { if (t.mode !== "wall") blocked.add(`${t.tx},${t.ty}`); else blocked.add(`${t.tx},${t.ty}`) })
          const startKey = `${startX},${startY}`
          const exitKey = `${this.exit.x},${this.exit.y}`
          if (blocked.has(exitKey)) return null
          const queue = [{ x: startX, y: startY }]
          const cameFrom = new Map()
          cameFrom.set(startKey, null)
          while (queue.length) {
                    const cur = queue.shift()
                    const ck = `${cur.x},${cur.y}`
                    if (ck === exitKey) {
                                const out = []
                                            let k = ck
                                while (k) { const [px, py] = k.split(",").map(Number); out.unshift({ x: px, y: py }); k = cameFrom.get(k) }
                                return out
                    }
                    const neighbors = [ { x: cur.x + 1, y: cur.y }, { x: cur.x - 1, y: cur.y }, { x: cur.x, y: cur.y + 1 }, { x: cur.x, y: cur.y - 1 } ]
                    for (const n of neighbors) {
                                if (n.x < 0 || n.y < 0 || n.x >= this.gridW || n.y >= this.gridH) continue
                                const nk = `${n.x},${n.y}`
                                if (cameFrom.has(nk)) continue
                                if (blocked.has(nk) && nk !== exitKey) continue
                                cameFrom.set(nk, ck)
                                queue.push(n)
                    }
          }
          return null
  }

  bindInput() {
          this.input.keyboard.on("keydown-ONE", () => this.selectTowerBySlot(0))
          this.input.keyboard.on("keydown-TWO", () => this.selectTowerBySlot(1))
          this.input.keyboard.on("keydown-THREE", () => this.selectTowerBySlot(2))
          this.input.keyboard.on("keydown-FOUR", () => this.selectTowerBySlot(3))
          this.input.keyboard.on("keydown-FIVE", () => this.selectTowerBySlot(4))
          this.input.on("pointermove", (p) => this.updateGhost(p))
          this.input.on("pointerdown", (p, currentlyOver) => {
                    if (this.gameOver) return
                    if (currentlyOver && currentlyOver.length) return
                    const tile = this.worldToTile(p.worldX, p.worldY)
                    if (!tile) { this.clearSelectedTower(); return }
                    // Cannot build on entry/exit
                              if ((tile.x === this.entry.x && tile.y === this.entry.y) || (tile.x === this.exit.x && tile.y === this.exit.y)) {
                                          this.showTransientMessage("Reserved tile", tile); this.clearSelectedTower(); return
                              }
                    const existingTower = this.towers.find((t) => t.tx === tile.x && t.ty === tile.y)
                    if (existingTower) { this.selectPlacedTower(existingTower); return }
                    const towerType = TOWER_TYPES[this.selectedTowerKey]
                    if (this.money < towerType.cost) { this.showTransientMessage(`Need $${towerType.cost}`, tile); this.clearSelectedTower(); return }
                    // Tentative placement: ensure path still exists from entry to exit and from each enemy to exit
                              const tileKey = `${tile.x},${tile.y}`
                    const isWall = towerType.mode === "wall"
                    if (isWall) this.walls.add(tileKey)
                    const placeholder = { tx: tile.x, ty: tile.y, mode: towerType.mode }
                    this.towers.push(placeholder)
                    const entryPath = this.computePathFrom(this.entry.x, this.entry.y)
                    let allEnemiesOk = entryPath !== null
                    if (allEnemiesOk) {
                                for (const e of this.enemies.getChildren()) {
                                              if (!e.active || e.isDying) continue
                                              if (e.flying) continue
                                              const t = this.worldToTile(e.x, e.y) || this.entry
                                              if (!this.computePathFrom(t.x, t.y)) { allEnemiesOk = false; break }
                                }
                    }
                    // Roll back placeholder
                              this.towers = this.towers.filter(t => t !== placeholder)
                    if (isWall && !allEnemiesOk) this.walls.delete(tileKey)
                    if (!allEnemiesOk) {
                                if (isWall) this.walls.delete(tileKey)
                                this.showTransientMessage("Would block path", tile); this.clearSelectedTower(); return
                    }
                    this.money -= towerType.cost
                    this.placeTower(tile.x, tile.y, towerType)
                    if (isWall) {
                                this.wallsVersion += 1
                                this.recomputeAllEnemyPaths()
                                this.drawGrid()
                    }
                    this.clearSelectedTower()
                    this.updateUI()
          })
  }

  recomputeAllEnemyPaths() {
          this.enemies.getChildren().forEach(e => {
                    if (!e.active || e.isDying) return
                    if (e.flying) return
                    const t = this.worldToTile(e.x, e.y) || this.entry
                    const newPath = this.computePathFrom(t.x, t.y)
                    if (newPath) { e.path = newPath; e.pathIndex = 0; e.wallsVersion = this.wallsVersion }
          })
  }

  selectTowerBySlot(slot) {
          const towerKey = TOWER_KEY_ORDER[slot]
          if (!towerKey) return
          this.selectedTowerKey = towerKey
          this.updateUI()
  }

  createWaveControls() {
          this.startWaveButtonText = this.add.text(0, 0, "Start Wave", { fontSize: "28px", color: "#7fffa0", backgroundColor: "#1b3d24", padding: { x: 12, y: 8 } })
          this.startWaveButtonText.setDepth(13)
          this.startWaveButtonText.setInteractive({ useHandCursor: true })
          this.startWaveButtonText.on("pointerdown", () => this.startNextWave())
          this.startWaveButtonText.on("pointerover", () => { if (this.startWaveButtonText.input.enabled) this.startWaveButtonText.setStyle({ color: "#d8ffe6" }) })
          this.startWaveButtonText.on("pointerout", () => { if (this.startWaveButtonText.input.enabled) this.startWaveButtonText.setStyle({ color: "#7fffa0" }) })
          this.layoutWaveButton()
  }
      layoutHud() { /* HUD is HTML */ }
      layoutWaveButton() {
              const padding = this.uiPadding
              this.startWaveButtonText.setOrigin(1, 1)
              this.startWaveButtonText.setPosition(this.scale.width - padding, this.scale.height - padding)
      }
      layoutGameUi() {
              this.layoutHud()
              this.layoutWaveButton()
              this.layoutCountdownOverlay()
      }
      createCountdownOverlay() {
              this.countdownOverlayText = this.add.text(0, 0, "", { fontSize: "54px", color: "#ffffff", stroke: "#000000", strokeThickness: 8, align: "center" })
              this.countdownOverlayText.setOrigin(0.5)
              this.countdownOverlayText.setDepth(25)
              this.countdownOverlayText.setVisible(false)
              this.layoutCountdownOverlay()
      }
      layoutCountdownOverlay() {
              if (!this.countdownOverlayText) return
              this.countdownOverlayText.setPosition(this.scale.width / 2, this.scale.height / 2)
      }
      showTransientMessage(text, tile) {
              let x = this.scale.width / 2, y = this.scale.height / 2
              if (tile) { const c = this.tileCenter(tile.x, tile.y); x = c.x; y = c.y - 18 }
              const t = this.add.text(x, y, text, { fontSize: "16px", color: "#ff8888", stroke: "#000000", strokeThickness: 3 })
              t.setOrigin(0.5).setDepth(28)
              this.tweens.add({ targets: t, y: y - 25, alpha: 0, duration: 700, ease: "Quad.easeOut", onComplete: () => t.destroy() })
      }
      bindHudMenuButton() {
              if (!this.hudMenuBtnEl) return
              this.onHudMenuButtonClick = (event) => { event.stopPropagation(); event.preventDefault(); this.abandonGameToMenu() }
              this.hudMenuBtnEl.addEventListener("click", this.onHudMenuButtonClick)
              this.events.once("shutdown", () => { this.hudMenuBtnEl?.removeEventListener("click", this.onHudMenuButtonClick) })
      }
      abandonGameToMenu() {
              if (this.gameOver) return
              if (!window.confirm("Abandonner la partie et revenir au menu ?")) return
              if (this.countdownTimer) { this.countdownTimer.remove(false); this.countdownTimer = null }
              this.time.removeAllEvents(); this.gameOver = true; this.scene.start("menu")
      }
      bindTowerPanelControls() {
              if (this.towerUpgradeBtnEl) this.towerUpgradeBtnEl.addEventListener("click", (e) => { e.stopPropagation(); this.tryUpgradeSelectedTower() })
              if (this.towerSellBtnEl) this.towerSellBtnEl.addEventListener("click", (e) => { e.stopPropagation(); this.trySellSelectedTower() })
      }
      createRangeOverlay() { this.rangeGraphics = this.add.graphics(); this.rangeGraphics.setDepth(11) }
      createGhostOverlay() {
              this.ghost = this.add.rectangle(0, 0, 26, 26, 0xffffff, 0.35)
              this.ghost.setDepth(9).setVisible(false)
              this.ghostRange = this.add.graphics().setDepth(8)
      }
      hideGhost() { this.ghost?.setVisible(false); this.ghostRange?.clear() }
      updateGhost(pointer) {
              if (this.gameOver) return this.hideGhost()
              const tile = this.worldToTile(pointer.worldX, pointer.worldY)
              if (!tile) return this.hideGhost()
              if ((tile.x === this.entry.x && tile.y === this.entry.y) || (tile.x === this.exit.x && tile.y === this.exit.y)) return this.hideGhost()
              if (this.towers.find((t) => t.tx === tile.x && t.ty === tile.y)) return this.hideGhost()
              const towerType = TOWER_TYPES[this.selectedTowerKey]
              const canAfford = this.money >= towerType.cost
              const pos = this.tileCenter(tile.x, tile.y)
              this.ghost.setPosition(pos.x, pos.y)
              this.ghost.setFillStyle(towerType.color, canAfford ? 0.45 : 0.2)
              this.ghost.setVisible(true)
              this.ghostRange.clear()
              if (towerType.range > 0) {
                        this.ghostRange.lineStyle(2, canAfford ? 0x79c8ff : 0xff5555, 0.7)
                        this.ghostRange.strokeCircle(pos.x, pos.y, towerType.range)
              }
      }

  selectPlacedTower(tower) { this.selectedPlacedTower = tower; this.showTowerInfoPanel(tower) }
      clearSelectedTower() { this.selectedPlacedTower = null; this.hideTowerInfoPanel() }
      showTowerInfoPanel(tower) { if (!this.towerPanelEl) return; this.towerPanelEl.classList.remove("tower-panel--hidden"); this.updateTowerInfoPanel(tower); this.drawSelectedTowerRange(tower) }
      hideTowerInfoPanel() { if (this.towerPanelEl) this.towerPanelEl.classList.add("tower-panel--hidden"); this.drawSelectedTowerRange(null) }
      drawSelectedTowerRange(tower) {
              if (!this.rangeGraphics) return
              this.rangeGraphics.clear()
              if (!tower || !tower.range) return
              this.rangeGraphics.lineStyle(2, 0x79c8ff, 0.9)
              this.rangeGraphics.fillStyle(0x79c8ff, 0.12)
              this.rangeGraphics.strokeCircle(tower.x, tower.y, tower.range)
              this.rangeGraphics.fillCircle(tower.x, tower.y, tower.range)
      }
      setUpgradeButtonEnabled(enabled, label = "Upgrade") {
              if (!this.towerUpgradeBtnEl) return
              this.towerUpgradeBtnEl.textContent = label
              this.towerUpgradeBtnEl.disabled = !enabled
              this.towerUpgradeBtnEl.style.background = enabled ? "#2e7d32" : "#555555"
              this.towerUpgradeBtnEl.style.color = enabled ? "#ffffff" : "#cccccc"
              this.towerUpgradeBtnEl.style.cursor = enabled ? "pointer" : "not-allowed"
              this.towerUpgradeBtnEl.style.opacity = enabled ? "1" : "0.75"
      }
      setSellButtonEnabled(enabled, label = "Sell") {
              if (!this.towerSellBtnEl) return
              this.towerSellBtnEl.textContent = label
              this.towerSellBtnEl.disabled = !enabled
              this.towerSellBtnEl.style.background = enabled ? "#8a2f2f" : "#555555"
              this.towerSellBtnEl.style.color = enabled ? "#ffffff" : "#cccccc"
              this.towerSellBtnEl.style.cursor = enabled ? "pointer" : "not-allowed"
              this.towerSellBtnEl.style.opacity = enabled ? "1" : "0.75"
      }
      updateTowerInfoPanel(tower) {
              if (!tower || !this.towerPanelInfoEl) return
              const towerType = TOWER_TYPES[tower.typeKey]
              const refundValue = Math.floor(tower.totalInvested * 0.7)
              if (tower.mode === "wall") {
                        this.towerPanelInfoEl.textContent = `Type: ${towerType.name}\nBlocks ground enemies\nSell: ${refundValue}`
                        this.setSellButtonEnabled(true, `Sell $${refundValue}`)
                        this.setUpgradeButtonEnabled(false, "-")
                        return
              }
              const upgradeCost = tower.level < tower.maxLevel ? this.getTowerUpgradeCost(tower) : null
              const damageLabel = tower.damage.toFixed(1).replace(".0", "")
              const rangeTiles = Math.round((tower.range / this.tileSize) * 10) / 10
              const nextCostLabel = upgradeCost ? `${upgradeCost}` : "MAX"
              this.towerPanelInfoEl.textContent = `Type: ${towerType.name}\nLevel: ${tower.level}/${tower.maxLevel}\nDamage: ${damageLabel} (${tower.damageType})\nRange: ${rangeTiles.toFixed(1)} tiles\nTargets flying: ${tower.targetsFlying ? "yes" : "no"}\nUpgrade: ${nextCostLabel}\nSell: ${refundValue}`
              this.setSellButtonEnabled(true, `Sell $${refundValue}`)
              if (tower.level >= tower.maxLevel) { this.setUpgradeButtonEnabled(false, "MAX"); return }
              if (this.money >= upgradeCost) { this.setUpgradeButtonEnabled(true, `Upgrade $${upgradeCost}`); return }
              this.setUpgradeButtonEnabled(false, `Need $${upgradeCost}`)
      }
      applyTowerLevelVisual(tower) {
              if (tower.mode === "wall") { tower.setSize(40, 40); tower.setDisplaySize(40, 40); tower.setFillStyle(tower.baseColor, 1); return }
              const scale = 1 + (tower.level - 1) * 0.1
              tower.setSize(26 * scale, 26 * scale)
              tower.setDisplaySize(26 * scale, 26 * scale)
              const baseColor = Phaser.Display.Color.IntegerToColor(tower.baseColor)
              const brighten = (tower.level - 1) * 20
              const tint = Phaser.Display.Color.GetColor(
                        Phaser.Math.Clamp(baseColor.red + brighten, 0, 255),
                        Phaser.Math.Clamp(baseColor.green + brighten, 0, 255),
                        Phaser.Math.Clamp(baseColor.blue + brighten, 0, 255)
                      )
              tower.setFillStyle(tint, 1)
      }
      getTowerUpgradeCost(tower) {
              const baseCost = tower.baseCost * tower.level
              if (tower.level <= 3) return baseCost
              return Math.round(baseCost * (1 + (tower.level - 3) * 0.75))
      }
      tryUpgradeSelectedTower() {
              if (this.gameOver || !this.selectedPlacedTower) return
              const tower = this.selectedPlacedTower
              if (tower.mode === "wall") return
              if (tower.level >= tower.maxLevel) return
              const upgradeCost = this.getTowerUpgradeCost(tower)
              if (this.money < upgradeCost) return
              this.money -= upgradeCost
              tower.totalInvested += upgradeCost
              tower.level += 1
              const m = tower.level - 1
              tower.damage = tower.baseDamage * (1 + 0.2 * m)
              tower.range = tower.baseRange + m * 1.25 * this.tileSize
              tower.cooldown = tower.baseCooldown * (1 - 0.1 * m)
              this.applyTowerLevelVisual(tower)
              this.updateTowerInfoPanel(tower)
              this.drawSelectedTowerRange(tower)
              this.updateUI()
      }
      trySellSelectedTower() {
              if (this.gameOver || !this.selectedPlacedTower) return
              const tower = this.selectedPlacedTower
              const refund = Math.floor(tower.totalInvested * 0.7)
              const wasWall = tower.mode === "wall"
              const tileKey = `${tower.tx},${tower.ty}`
              this.towers = this.towers.filter((t) => t !== tower)
              if (wasWall) { this.walls.delete(tileKey); this.wallsVersion += 1; this.recomputeAllEnemyPaths(); this.drawGrid() }
              tower.destroy()
              this.money += refund
              this.clearSelectedTower()
              this.updateUI()
      }

  setStartButtonState(enabled, label = "Start Wave") {
          this.startWaveButtonText.setText(label)
          this.startWaveButtonText.input.enabled = enabled
          this.startWaveButtonText.setAlpha(enabled ? 1 : 0.45)
          this.startWaveButtonText.setStyle({ color: enabled ? "#7fffa0" : "#9aa09c" })
  }
      startNextWave() {
              if (this.gameOver || this.waveState !== "intermission") return
              const waveNumber = this.waveIndex + 1
              const wave = this.getWaveForNumber(waveNumber)
              this.waveState = "wave"
              this.pendingSpawns = 0
              this.waveSpawnRemaining = 0
              this.setStartButtonState(false, "Wave In Progress")
              this.updateUI()
              let scheduleOffset = 0
              for (const spawnBatch of wave.spawns) {
                        for (let i = 0; i < spawnBatch.count; i++) {
                                    this.pendingSpawns += 1
                                    this.waveSpawnRemaining += 1
                                    this.time.delayedCall(scheduleOffset, () => {
                                                  if (this.gameOver || this.waveState !== "wave") { this.pendingSpawns -= 1; this.waveSpawnRemaining -= 1; return }
                                                  this.spawnEnemy(spawnBatch.type, waveNumber)
                                                  this.pendingSpawns -= 1
                                                  this.waveSpawnRemaining -= 1
                                                  this.updateUI()
                                    })
                                    scheduleOffset += spawnBatch.interval
                        }
                        if (spawnBatch.gapAfter) scheduleOffset += spawnBatch.gapAfter
              }
      }
      update(time, delta) {
              const dt = delta / 1000
              this.enemies.getChildren().forEach((enemy) => { if (enemy.active) this.moveEnemy(enemy, dt, time) })
              this.towers.forEach((tower) => { if (tower.active && tower.mode !== "wall") this.towerLogic(tower, time) })
              this.projectiles.getChildren().forEach((projectile) => { if (projectile.active) this.updateProjectile(projectile, dt) })
              const projectilesActive = this.projectiles.getChildren().some((p) => p.active)
              if (!this.gameOver && this.waveState === "wave" && this.pendingSpawns === 0 && this.activeEnemyCount() === 0 && !projectilesActive) {
                        this.finishCurrentWave()
              }
      }
      finishCurrentWave() {
              this.waveIndex += 1
              this.wavesCompleted += 1
              if (this.maxWaves && this.waveIndex >= this.maxWaves) { this.endGame(true); return }
              this.startWaveCountdown()
      }
      startWaveCountdown() {
              this.waveState = "countdown"
              const justFinished = this.getWaveForNumber(this.waveIndex)
              const delayMs = justFinished?.nextWaveDelay ?? 4000
              this.countdownRemaining = Math.max(1, Math.round(delayMs / 1000))
              if (this.countdownTimer) this.countdownTimer.remove(false)
              this.setStartButtonState(false, "Wave Starting Soon")
              this.updateUI()
              this.countdownTimer = this.time.addEvent({
                        delay: 1000, loop: true, callback: () => {
                                    if (this.gameOver || this.waveState !== "countdown") return
                                    this.countdownRemaining -= 1
                                    this.updateUI()
                                    if (this.countdownRemaining > 0) return
                                    this.countdownTimer?.remove(false); this.countdownTimer = null; this.countdownRemaining = 0
                                    this.waveState = "intermission"
                                    this.startNextWave()
                        }
              })
      }
      getWaveForNumber(waveNumber) {
              if (waveNumber % 5 === 0) {
                        return { id: waveNumber, bossWave: true, nextWaveDelay: 5000, spawns: [ { type: "boss", count: 1, interval: 0 }, { type: "grunt", count: 4, interval: 700, gapAfter: 400 }, { type: "fast", count: 6, interval: 250 } ] }
              }
              const baseWave = WAVES[(waveNumber - 1) % WAVES.length]
              return { id: waveNumber, bossWave: false, nextWaveDelay: baseWave.nextWaveDelay, spawns: baseWave.spawns }
      }
      drawGrid() {
              const g = this.graphics
              g.clear()
              for (let y = 0; y < this.gridH; y++) {
                        for (let x = 0; x < this.gridW; x++) {
                                    const wx = this.originX + x * this.tileSize
                                    const wy = this.originY + y * this.tileSize
                                    const key = `${x},${y}`
                                    const isEntry = x === this.entry.x && y === this.entry.y
                                    const isExit = x === this.exit.x && y === this.exit.y
                                    const isInitialPath = this.pathSet.has(key)
                                    let color = 0x171717
                                    if (isInitialPath) color = 0x222222
                                    if (isEntry) color = 0x1f5f3a
                                    if (isExit) color = 0x5f2a2a
                                    g.lineStyle(1, 0x333333)
                                    g.fillStyle(color)
                                    g.fillRect(wx, wy, this.tileSize, this.tileSize)
                                    g.strokeRect(wx, wy, this.tileSize, this.tileSize)
                        }
              }
      }
      worldToTile(wx, wy) {
              const x = Math.floor((wx - this.originX) / this.tileSize)
              const y = Math.floor((wy - this.originY) / this.tileSize)
              if (x < 0 || y < 0 || x >= this.gridW || y >= this.gridH) return null
              return { x, y }
      }
      tileCenter(tx, ty) { return { x: this.originX + tx * this.tileSize + this.tileSize / 2, y: this.originY + ty * this.tileSize + this.tileSize / 2 } }

  spawnEnemy(enemyTypeKey, waveNumber = this.waveIndex + 1) {
          if (this.gameOver) return
          const enemyType = ENEMY_TYPES[enemyTypeKey]
          if (!enemyType) return
          const waveOffset = waveNumber - 1
          const hpScale = 1 + 0.18 * waveOffset
          const speedScale = 1 + 0.04 * waveOffset
          const rewardScale = 1 + 0.05 * waveOffset
          const pos = this.tileCenter(this.entry.x, this.entry.y)
          const enemy = this.add.circle(pos.x, pos.y, enemyType.radius, enemyType.color)
          enemy.enemyType = enemyType.key
          enemy.baseColor = enemyType.color
          enemy.hp = enemyType.hp * hpScale
          enemy.baseSpeed = enemyType.speed * speedScale
          enemy.reward = Math.max(1, Math.floor(enemyType.reward * rewardScale))
          enemy.slowUntil = 0
          enemy.slowFactor = 1
          enemy.isSlowed = false
          enemy.isFlashing = false
          enemy.flashVersion = 0
          enemy.isDying = false
          enemy.flying = !!enemyType.flying
          enemy.armor = enemyType.armor ?? 0
          enemy.magicResist = enemyType.magicResist ?? 0
          enemy.immuneToSlow = !!enemyType.immuneToSlow
          enemy.radius = enemyType.radius
          if (enemy.flying) {
                    // Flying enemies use straight line from entry to exit
            enemy.path = [ { x: this.entry.x, y: this.entry.y }, { x: this.exit.x, y: this.exit.y } ]
          } else {
                    enemy.path = this.computePathFrom(this.entry.x, this.entry.y) || this.initialPath
          }
          enemy.pathIndex = 0
          enemy.wallsVersion = this.wallsVersion
          this.enemies.add(enemy)
  }
      updateEnemyColor(enemy) {
              if (!enemy.active || enemy.isDying) return
              if (enemy.isFlashing) { enemy.setFillStyle(0xffffff, 1); return }
              if (enemy.isSlowed) { enemy.setFillStyle(0x66aaff, 1); return }
              enemy.setFillStyle(enemy.baseColor, 1)
      }
      showHitFeedback(enemy, damage) {
              if (!enemy.active || enemy.isDying) return
              enemy.isFlashing = true
              enemy.flashVersion += 1
              const v = enemy.flashVersion
              enemy.setFillStyle(0xffffff, 1)
              const t = this.add.text(enemy.x, enemy.y - 16, `-${Math.round(damage)}`, { fontSize: "14px", color: "#ffd7d7" })
              t.setOrigin(0.5).setDepth(18)
              this.tweens.add({ targets: t, y: enemy.y - 34, alpha: 0, duration: 320, ease: "Quad.easeOut", onComplete: () => t.destroy() })
              this.time.delayedCall(50, () => {
                        if (!enemy.active || enemy.isDying) return
                        if (enemy.flashVersion !== v) return
                        enemy.isFlashing = false
                        this.updateEnemyColor(enemy)
              })
      }
      playEnemyDeathEffect(enemy) {
              if (!enemy.active || enemy.isDying) return
              enemy.isDying = true
              this.tweens.add({ targets: enemy, alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 140, ease: "Quad.easeIn", onComplete: () => { if (enemy.active) enemy.destroy() } })
      }
      playGunMuzzleFlash(tower) {
              const flash = this.add.circle(tower.x, tower.y, 6, 0xfff2a8, 0.9)
              flash.setDepth(12)
              this.tweens.add({ targets: flash, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: 90, ease: "Quad.easeOut", onComplete: () => flash.destroy() })
      }
      playExplosionEffect(x, y, color = 0xffb366) {
              const explosion = this.add.circle(x, y, 8, color, 0.7)
              explosion.setDepth(12)
              this.tweens.add({ targets: explosion, radius: 36, alpha: 0, duration: 220, ease: "Quad.easeOut", onComplete: () => explosion.destroy() })
      }
      moveEnemy(enemy, dt, time) {
              if (this.gameOver || enemy.isDying) return
              if (!enemy.flying && enemy.wallsVersion !== this.wallsVersion) {
                        const cur = this.worldToTile(enemy.x, enemy.y) || this.entry
                        const newPath = this.computePathFrom(cur.x, cur.y)
                        if (newPath) { enemy.path = newPath; enemy.pathIndex = 0 }
                        enemy.wallsVersion = this.wallsVersion
              }
              const next = enemy.pathIndex + 1
              if (next >= enemy.path.length) {
                        enemy.destroy()
                        this.lives -= 1
                        this.updateUI()
                        if (this.lives <= 0) this.endGame()
                        return
              }
              const targetTile = enemy.path[next]
              const target = this.tileCenter(targetTile.x, targetTile.y)
              const dx = target.x - enemy.x
              const dy = target.y - enemy.y
              const dist = Math.hypot(dx, dy)
              if (dist < 2) { enemy.pathIndex = next; return }
              const isSlowed = time < enemy.slowUntil
              if (enemy.isSlowed !== isSlowed) { enemy.isSlowed = isSlowed; this.updateEnemyColor(enemy) }
              const f = isSlowed ? enemy.slowFactor : 1
              enemy.x += (dx / dist) * enemy.baseSpeed * f * dt
              enemy.y += (dy / dist) * enemy.baseSpeed * f * dt
      }

  placeTower(tx, ty, towerType) {
          const pos = this.tileCenter(tx, ty)
          const isWall = towerType.mode === "wall"
          const size = isWall ? 40 : 26
          const tower = this.add.rectangle(pos.x, pos.y, size, size, towerType.color)
          tower.tx = tx
          tower.ty = ty
          tower.typeKey = towerType.key
          tower.baseColor = towerType.color
          tower.range = towerType.range
          tower.baseRange = towerType.range
          tower.cooldown = towerType.cooldown
          tower.baseCooldown = towerType.cooldown
          tower.damage = towerType.damage
          tower.baseDamage = towerType.damage
          tower.cost = towerType.cost
          tower.baseCost = towerType.cost
          tower.totalInvested = towerType.cost
          tower.level = 1
          tower.maxLevel = isWall ? 1 : 5
          tower.mode = towerType.mode
          tower.damageType = towerType.damageType ?? "physical"
          tower.targetsFlying = !!towerType.targetsFlying
          tower.targeting = towerType.targeting ?? "first"
          tower.slowFactor = towerType.slowFactor ?? 1
          tower.slowDuration = towerType.slowDuration ?? 0
          tower.projectileSpeed = towerType.projectileSpeed ?? 0
          tower.splashRadius = towerType.splashRadius ?? 0
          tower.lastShot = 0
          this.applyTowerLevelVisual(tower)
          this.towers.push(tower)
  }
      pickTarget(tower, enemies) {
              const candidates = []
                      for (const enemy of enemies) {
                                if (!enemy.active || enemy.isDying) continue
                                if (enemy.flying && !tower.targetsFlying) continue
                                const d = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y)
                                if (d <= tower.range + (enemy.radius ?? 0)) candidates.push({ enemy, d })
                      }
              if (candidates.length === 0) return null
              switch (tower.targeting) {
                  case "last": return candidates.reduce((a, b) => a.enemy.pathIndex < b.enemy.pathIndex ? a : b).enemy
                  case "strong": return candidates.reduce((a, b) => a.enemy.hp > b.enemy.hp ? a : b).enemy
                  case "close": return candidates.reduce((a, b) => a.d < b.d ? a : b).enemy
                  case "first":
                  default: return candidates.reduce((a, b) => a.enemy.pathIndex > b.enemy.pathIndex ? a : b).enemy
              }
      }
      towerLogic(tower, time) {
              if (tower.mode === "wall") return
              if (time - tower.lastShot < tower.cooldown) return
              const enemies = this.enemies.getChildren()
              const target = this.pickTarget(tower, enemies)
              if (!target) return
              tower.lastShot = time
              if (tower.mode === "projectile_aoe") { this.spawnMissileProjectile(tower, target); return }
              const beam = this.add.line(0, 0, tower.x, tower.y, target.x, target.y, 0xffffaa)
              beam.setOrigin(0, 0)
              this.time.delayedCall(60, () => beam.destroy())
              if (tower.mode === "single") this.playGunMuzzleFlash(tower)
              if (tower.mode === "aoe") {
                        const enemiesInSplash = enemies.filter((enemy) => {
                                    if (!enemy.active || enemy.isDying) return false
                                    if (enemy.flying && !tower.targetsFlying) return false
                                    const d = Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y)
                                    return d <= tower.splashRadius
                        })
                        enemiesInSplash.forEach((enemy) => this.applyDamage(enemy, tower.damage, tower.damageType))
                        return
              }
              this.applyDamage(target, tower.damage, tower.damageType)
              if (tower.mode === "slow" && target.active && !target.immuneToSlow) {
                        target.slowFactor = Math.min(target.slowFactor || 1, tower.slowFactor)
                        target.slowUntil = Math.max(target.slowUntil || 0, time + tower.slowDuration)
                        target.isSlowed = true
                        this.updateEnemyColor(target)
              }
      }
      spawnMissileProjectile(tower, target) {
              let projectile = this.projectiles.getChildren().find((p) => !p.active)
              if (!projectile) {
                        projectile = this.add.circle(tower.x, tower.y, 4, 0xffc266)
                        projectile.setDepth(12)
                        this.projectiles.add(projectile)
              } else {
                        projectile.setActive(true).setVisible(true)
                        projectile.setPosition(tower.x, tower.y)
              }
              projectile.target = target
              projectile.targetX = target.x
              projectile.targetY = target.y
              projectile.speed = tower.projectileSpeed
              projectile.damage = tower.damage
              projectile.splashRadius = tower.splashRadius
              projectile.damageType = tower.damageType
              projectile.targetsFlying = tower.targetsFlying
      }
      updateProjectile(projectile, dt) {
              if (projectile.target?.active && !projectile.target.isDying) {
                        projectile.targetX = projectile.target.x
                        projectile.targetY = projectile.target.y
              }
              const dx = projectile.targetX - projectile.x
              const dy = projectile.targetY - projectile.y
              const dist = Math.hypot(dx, dy)
              if (dist < 8) {
                        const enemiesInSplash = this.enemies.getChildren().filter((enemy) => {
                                    if (!enemy.active || enemy.isDying) return false
                                    if (enemy.flying && !projectile.targetsFlying) return false
                                    const splashDistance = Phaser.Math.Distance.Between(projectile.x, projectile.y, enemy.x, enemy.y)
                                    return splashDistance <= projectile.splashRadius
                        })
                        enemiesInSplash.forEach((enemy) => this.applyDamage(enemy, projectile.damage, projectile.damageType))
                        this.playExplosionEffect(projectile.x, projectile.y)
                        projectile.setActive(false).setVisible(false)
                        return
              }
              const step = projectile.speed * dt
              const ratio = Math.min(1, step / dist)
              projectile.x += dx * ratio
              projectile.y += dy * ratio
      }
      applyDamage(enemy, damage, damageType = "physical") {
              if (!enemy.active || enemy.isDying) return
              let final = damage
              if (damageType === "magic" && enemy.magicResist) final = final * (1 - enemy.magicResist)
              if (damageType === "physical" && enemy.armor) final = Math.max(1, final - enemy.armor)
              this.showHitFeedback(enemy, final)
              enemy.hp -= final
              if (enemy.hp > 0) return
              this.playEnemyDeathEffect(enemy)
              this.money += enemy.reward
              this.moneyEarned += enemy.reward
              this.updateUI()
      }
      activeEnemyCount() {
              let n = 0
              this.enemies.getChildren().forEach((e) => { if (e.active && !e.isDying) n += 1 })
              return n
      }
      updateUI() {
              const selectedTower = TOWER_TYPES[this.selectedTowerKey]
              const waveLabel = this.waveIndex + 1
              const waveStateLabel = this.waveState === "wave" ? "In Progress" : this.waveState === "countdown" ? `Next wave in: ${this.countdownRemaining}s` : "Intermission"
              const bossLabel = waveLabel % 5 === 0 ? " BOSS WAVE" : ""
              const enemiesRemaining = this.waveState === "wave" ? this.waveSpawnRemaining + this.activeEnemyCount() : 0
              if (this.hudLeftEl) this.hudLeftEl.textContent = `Mode: ${this.mode.label} | Money: ${this.money} | Lives: ${this.lives} | Wave: ${waveLabel}${bossLabel} (${waveStateLabel}) | Enemies: ${enemiesRemaining}`
              const selectedTowerLabel = `Tower: ${selectedTower.name} ($${selectedTower.cost}) [1/2/3/4/5]`
              if (this.hudRightLabelEl) this.hudRightLabelEl.textContent = selectedTowerLabel
              else if (this.hudRightEl) this.hudRightEl.textContent = selectedTowerLabel
              if (this.selectedPlacedTower) this.updateTowerInfoPanel(this.selectedPlacedTower)
              if (this.countdownOverlayText) {
                        const show = this.waveState === "countdown"
                        this.countdownOverlayText.setVisible(show)
                        if (show) this.countdownOverlayText.setText(`Next wave in: ${this.countdownRemaining}`)
              }
      }
      endGame(victory = false) {
              if (this.gameOver) return
              this.gameOver = true
              if (this.countdownTimer) { this.countdownTimer.remove(false); this.countdownTimer = null }
              this.setStartButtonState(false, "Start Wave")
              this.setUpgradeButtonEnabled(false, "Upgrade")
              this.setSellButtonEnabled(false, "Sell")
              const finalWaveReached = this.waveState === "wave" ? this.waveIndex + 1 : Math.max(1, this.waveIndex)
              const score = this.wavesCompleted * 100 + this.moneyEarned
              setBestScore(this.mode.key, score)
              const bestScore = getBestScore(this.mode.key)
              this.scene.start("gameover", { title: victory ? "You Win" : "Game Over", titleColor: victory ? "#7fffa0" : "#ff5555", mode: this.mode, finalWaveReached, score, bestScore, wavesCompleted: this.wavesCompleted })
      }
}

new Phaser.Game({
      type: Phaser.AUTO,
      parent: "app",
      scene: [MenuScene, GameScene, GameOverScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 900, height: 600 }
})
