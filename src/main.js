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

function getBestScore(modeKey = "normal") {
    return getBestScores()[modeKey] ?? 0
}

function setBestScore(modeKey, score) {
    try {
          const all = getBestScores()
          all[modeKey] = Math.max(all[modeKey] ?? 0, score)
          localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(all))
    } catch {
          // ignore storage failures
    }
}

class MenuScene extends Phaser.Scene {
    constructor() {
          super("menu")
    }

  create() {
        setHudVisibility(false)
        this.cameras.main.setBackgroundColor("#111")

      this.selectedModeKey = "normal"

      this.add.text(450, 110, "Tower Defense", { fontSize: "58px", color: "#ffffff" }).setOrigin(0.5)
        this.add.text(450, 220, "Instructions", { fontSize: "28px", color: "#ffee88" }).setOrigin(0.5)
        this.add.text(450, 290,
                            "1 / 2 / 3 / 4: Select Tower\nClick empty tile: Place Tower\nClick tower: Upgrade / Sell",
                      { fontSize: "20px", color: "#ffffff", align: "center", lineSpacing: 8 }
                          ).setOrigin(0.5)

      const scores = getBestScores()
        this.add.text(450, 380,
                            `Best - Easy: ${scores.easy} | Normal: ${scores.normal} | Endless: ${scores.endless}`,
                      { fontSize: "18px", color: "#aee3ff" }
                          ).setOrigin(0.5)

      this.add.text(450, 430, "Select Mode", { fontSize: "26px", color: "#ffee88" }).setOrigin(0.5)

      const modeButtonY = 480
        this.modeButtons = []
              Object.values(GAME_MODES).forEach((mode, index) => {
                      const button = this.add.text(330 + index * 120, modeButtonY, mode.label, {
                                fontSize: "26px", color: "#cfd8dc", backgroundColor: "#25333d",
                                padding: { x: 12, y: 8 }
                      }).setOrigin(0.5)
                      button.setInteractive({ useHandCursor: true })
                      button.on("pointerdown", () => {
                                this.selectedModeKey = mode.key
                                this.updateModeButtonStyles()
                      })
                      this.modeButtons.push({ key: mode.key, button })
              })
        this.updateModeButtonStyles()

      const playButton = this.add.text(450, 555, "Play", {
              fontSize: "38px", color: "#7fffa0", backgroundColor: "#1b3d24",
              padding: { x: 20, y: 10 }
      }).setOrigin(0.5)
        playButton.setInteractive({ useHandCursor: true })
        playButton.on("pointerover", () => playButton.setStyle({ color: "#d8ffe6" }))
        playButton.on("pointerout", () => playButton.setStyle({ color: "#7fffa0" }))
        playButton.on("pointerdown", () => {
                this.scene.start("game", { mode: GAME_MODES[this.selectedModeKey] })
        })
  }

  updateModeButtonStyles() {
        this.modeButtons.forEach(({ key, button }) => {
                const isActive = key === this.selectedModeKey
                button.setStyle({
                          color: isActive ? "#ffffff" : "#cfd8dc",
                          backgroundColor: isActive ? "#2f7f46" : "#25333d"
                })
        })
  }
}

class GameOverScene extends Phaser.Scene {
    constructor() {
          super("gameover")
    }

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
        this.add.text(450, 280,
                            `Mode: ${mode.label}\nFinal Wave: ${finalWaveReached}\nScore: ${score}\nBest (${mode.label}): ${bestScore}`,
                      { fontSize: "26px", color: "#ffffff", align: "center", lineSpacing: 10 }
                          ).setOrigin(0.5)

      const restartButton = this.add.text(450, 470, "Restart", {
              fontSize: "36px", color: "#7fffa0", backgroundColor: "#1b3d24",
              padding: { x: 20, y: 10 }
      }).setOrigin(0.5)
        restartButton.setInteractive({ useHandCursor: true })
        restartButton.on("pointerover", () => restartButton.setStyle({ color: "#d8ffe6" }))
        restartButton.on("pointerout", () => restartButton.setStyle({ color: "#7fffa0" }))
        restartButton.on("pointerdown", () => { this.scene.start("game", { mode }) })

      const menuButton = this.add.text(450, 545, "Menu", {
              fontSize: "26px", color: "#aee3ff", backgroundColor: "#1e2a33",
              padding: { x: 16, y: 8 }
      }).setOrigin(0.5)
        menuButton.setInteractive({ useHandCursor: true })
        menuButton.on("pointerdown", () => { this.scene.start("menu") })
  }
}

class GameScene extends Phaser.Scene {
    constructor() {
          super("game")
    }

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

      this.path = [
        { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
        { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
        { x: 8, y: 4 }, { x: 9, y: 4 }, { x: 10, y: 4 }, { x: 11, y: 4 },
        { x: 12, y: 4 }, { x: 13, y: 4 }, { x: 14, y: 4 }, { x: 15, y: 4 }
            ]
        this.pathSet = new Set(this.path.map((p) => `${p.x},${p.y}`))

      this.graphics = this.add.graphics()
        this.drawGrid()

      this.enemies = this.add.group()
        this.projectiles = this.add.group()
        this.towers = []

              this.money = 100
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
        this.createFeedbackOverlay()

      this.scale.on("resize", () => this.layoutGameUi())
        this.layoutGameUi()

      this.bindInput()
        this.updateUI()
        this.setStartButtonState(true, "Start Wave 1")
  }

  bindInput() {
        this.input.keyboard.on("keydown-ONE", () => this.selectTowerBySlot(0))
        this.input.keyboard.on("keydown-TWO", () => this.selectTowerBySlot(1))
        this.input.keyboard.on("keydown-THREE", () => this.selectTowerBySlot(2))
        this.input.keyboard.on("keydown-FOUR", () => this.selectTowerBySlot(3))

      this.input.on("pointermove", (p) => this.updateGhost(p))

      this.input.on("pointerdown", (p, currentlyOver) => {
              if (this.gameOver) return
              if (currentlyOver && currentlyOver.length) return

                          const tile = this.worldToTile(p.worldX, p.worldY)
              if (!tile) { this.clearSelectedTower(); return }
              if (this.pathSet.has(`${tile.x},${tile.y}`)) {
                        this.showTransientMessage("Cannot build on path", tile)
                        this.clearSelectedTower()
                        return
              }

                          const existingTower = this.towers.find((t) => t.tx === tile.x && t.ty === tile.y)
              if (existingTower) { this.selectPlacedTower(existingTower); return }

                          const towerType = TOWER_TYPES[this.selectedTowerKey]
              if (this.money < towerType.cost) {
                        this.showTransientMessage(`Need $${towerType.cost}`, tile)
                        this.clearSelectedTower()
                        return
              }

                          this.money -= towerType.cost
              this.placeTower(tile.x, tile.y, towerType)
              this.clearSelectedTower()
              this.updateUI()
      })
  }

  selectTowerBySlot(slot) {
        const towerKey = TOWER_KEY_ORDER[slot]
        if (!towerKey) return
        this.selectedTowerKey = towerKey
        this.updateUI()
  }

  createWaveControls() {
        this.startWaveButtonText = this.add.text(0, 0, "Start Wave", {
                fontSize: "28px", color: "#7fffa0", backgroundColor: "#1b3d24",
                padding: { x: 12, y: 8 }
        })
        this.startWaveButtonText.setDepth(13)
        this.startWaveButtonText.setInteractive({ useHandCursor: true })
        this.startWaveButtonText.on("pointerdown", () => this.startNextWave())
        this.startWaveButtonText.on("pointerover", () => {
                if (this.startWaveButtonText.input.enabled) {
                          this.startWaveButtonText.setStyle({ color: "#d8ffe6" })
                }
        })
        this.startWaveButtonText.on("pointerout", () => {
                if (this.startWaveButtonText.input.enabled) {
                          this.startWaveButtonText.setStyle({ color: "#7fffa0" })
                }
        })
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
        this.countdownOverlayText = this.add.text(0, 0, "", {
                fontSize: "54px", color: "#ffffff",
                stroke: "#000000", strokeThickness: 8, align: "center"
        })
        this.countdownOverlayText.setOrigin(0.5)
        this.countdownOverlayText.setDepth(25)
        this.countdownOverlayText.setVisible(false)
        this.layoutCountdownOverlay()
  }

  layoutCountdownOverlay() {
        if (!this.countdownOverlayText) return
        const pathCenterY = this.originY + 4 * this.tileSize + this.tileSize / 2
        this.countdownOverlayText.setPosition(this.scale.width / 2, pathCenterY - 40)
  }

  createFeedbackOverlay() {
        // Pool is created lazily in showTransientMessage
  }

  showTransientMessage(text, tile) {
        let x = this.scale.width / 2
        let y = this.scale.height / 2
        if (tile) {
                const center = this.tileCenter(tile.x, tile.y)
                x = center.x
                y = center.y - 18
        }
        const t = this.add.text(x, y, text, {
                fontSize: "16px", color: "#ff8888",
                stroke: "#000000", strokeThickness: 3
        })
        t.setOrigin(0.5).setDepth(28)
        this.tweens.add({
                targets: t,
                y: y - 25,
                alpha: 0,
                duration: 700,
                ease: "Quad.easeOut",
                onComplete: () => t.destroy()
        })
  }

  bindHudMenuButton() {
        if (!this.hudMenuBtnEl) return
        this.onHudMenuButtonClick = (event) => {
                event.stopPropagation()
                event.preventDefault()
                this.abandonGameToMenu()
        }
        this.hudMenuBtnEl.addEventListener("click", this.onHudMenuButtonClick)
        this.events.once("shutdown", () => {
                this.hudMenuBtnEl?.removeEventListener("click", this.onHudMenuButtonClick)
        })
  }

  abandonGameToMenu() {
        if (this.gameOver) return
        const confirmed = window.confirm("Abandonner la partie et revenir au menu ?")
        if (!confirmed) return
        if (this.countdownTimer) {
                this.countdownTimer.remove(false)
                this.countdownTimer = null
        }
        this.time.removeAllEvents()
        this.gameOver = true
        this.scene.start("menu")
  }

  bindTowerPanelControls() {
        if (this.towerUpgradeBtnEl) {
                this.towerUpgradeBtnEl.addEventListener("click", (event) => {
                          event.stopPropagation()
                          this.tryUpgradeSelectedTower()
                })
        }
        if (this.towerSellBtnEl) {
                this.towerSellBtnEl.addEventListener("click", (event) => {
                          event.stopPropagation()
                          this.trySellSelectedTower()
                })
        }
  }

  createRangeOverlay() {
        this.rangeGraphics = this.add.graphics()
        this.rangeGraphics.setDepth(11)
  }

  createGhostOverlay() {
        this.ghost = this.add.rectangle(0, 0, 26, 26, 0xffffff, 0.35)
        this.ghost.setDepth(9).setVisible(false)
        this.ghostRange = this.add.graphics().setDepth(8)
  }

  hideGhost() {
        this.ghost?.setVisible(false)
        this.ghostRange?.clear()
  }

  updateGhost(pointer) {
        if (this.gameOver) return this.hideGhost()
        const tile = this.worldToTile(pointer.worldX, pointer.worldY)
        if (!tile) return this.hideGhost()
        if (this.pathSet.has(`${tile.x},${tile.y}`)) return this.hideGhost()
        if (this.towers.find((t) => t.tx === tile.x && t.ty === tile.y)) return this.hideGhost()

      const towerType = TOWER_TYPES[this.selectedTowerKey]
        const canAfford = this.money >= towerType.cost
        const pos = this.tileCenter(tile.x, tile.y)

      this.ghost.setPosition(pos.x, pos.y)
        this.ghost.setFillStyle(towerType.color, canAfford ? 0.45 : 0.2)
        this.ghost.setVisible(true)

      this.ghostRange.clear()
        this.ghostRange.lineStyle(2, canAfford ? 0x79c8ff : 0xff5555, 0.7)
        this.ghostRange.strokeCircle(pos.x, pos.y, towerType.range)
  }

  selectPlacedTower(tower) {
        this.selectedPlacedTower = tower
        this.showTowerInfoPanel(tower)
  }

  clearSelectedTower() {
        this.selectedPlacedTower = null
        this.hideTowerInfoPanel()
  }

  showTowerInfoPanel(tower) {
        if (!this.towerPanelEl) return
        this.towerPanelEl.classList.remove("tower-panel--hidden")
        this.updateTowerInfoPanel(tower)
        this.drawSelectedTowerRange(tower)
  }

  hideTowerInfoPanel() {
        if (this.towerPanelEl) {
                this.towerPanelEl.classList.add("tower-panel--hidden")
        }
        this.drawSelectedTowerRange(null)
  }

  drawSelectedTowerRange(tower) {
        if (!this.rangeGraphics) return
        this.rangeGraphics.clear()
        if (!tower) return
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
        const upgradeCost = tower.level < tower.maxLevel ? this.getTowerUpgradeCost(tower) : null
        const refundValue = Math.floor(tower.totalInvested * 0.7)
        const damageLabel = tower.damage.toFixed(1).replace(".0", "")
        const rangeTiles = Math.round((tower.range / this.tileSize) * 10) / 10
        const nextCostLabel = upgradeCost ? `${upgradeCost}` : "MAX"

      this.towerPanelInfoEl.textContent =
              `Type: ${towerType.name}\nLevel: ${tower.level}/${tower.maxLevel}\nDamage: ${damageLabel} (${tower.damageType})\nRange: ${rangeTiles.toFixed(1)} tiles\nTargets flying: ${tower.targetsFlying ? "yes" : "no"}\nUpgrade: ${nextCostLabel}\nSell: ${refundValue}`

      this.setSellButtonEnabled(true, `Sell $${refundValue}`)
        if (tower.level >= tower.maxLevel) {
                this.setUpgradeButtonEnabled(false, "MAX")
                return
        }
        if (this.money >= upgradeCost) {
                this.setUpgradeButtonEnabled(true, `Upgrade $${upgradeCost}`)
                return
        }
        this.setUpgradeButtonEnabled(false, `Need $${upgradeCost}`)
  }

  applyTowerLevelVisual(tower) {
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
        const lateGameMultiplier = 1 + (tower.level - 3) * 0.75
        return Math.round(baseCost * lateGameMultiplier)
  }

  tryUpgradeSelectedTower() {
        if (this.gameOver || !this.selectedPlacedTower) return
        const tower = this.selectedPlacedTower
        if (tower.level >= tower.maxLevel) return
        const upgradeCost = this.getTowerUpgradeCost(tower)
        if (this.money < upgradeCost) return

      this.money -= upgradeCost
        tower.totalInvested += upgradeCost
        tower.level += 1
        const levelMultiplier = tower.level - 1
        tower.damage = tower.baseDamage * (1 + 0.2 * levelMultiplier)
        tower.range = tower.baseRange + levelMultiplier * 1.25 * this.tileSize
        tower.cooldown = tower.baseCooldown * (1 - 0.1 * levelMultiplier)

      this.applyTowerLevelVisual(tower)
        this.updateTowerInfoPanel(tower)
        this.drawSelectedTowerRange(tower)
        this.updateUI()
  }

  trySellSelectedTower() {
        if (this.gameOver || !this.selectedPlacedTower) return
        const tower = this.selectedPlacedTower
        const refund = Math.floor(tower.totalInvested * 0.7)
        this.towers = this.towers.filter((t) => t !== tower)
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
                                      if (this.gameOver || this.waveState !== "wave") {
                                                    this.pendingSpawns -= 1
                                                    this.waveSpawnRemaining -= 1
                                                    return
                                      }
                                      this.spawnEnemy(spawnBatch.type, waveNumber)
                                      this.pendingSpawns -= 1
                                      this.waveSpawnRemaining -= 1
                                      this.updateUI()
                          })
                          scheduleOffset += spawnBatch.interval
                }
                if (spawnBatch.gapAfter) {
                          scheduleOffset += spawnBatch.gapAfter
                }
        }
  }

  update(time, delta) {
        const dt = delta / 1000
        this.enemies.getChildren().forEach((enemy) => {
                if (enemy.active) this.moveEnemy(enemy, dt, time)
        })
        this.towers.forEach((tower) => {
                if (tower.active) this.towerLogic(tower, time)
        })
        this.projectiles.getChildren().forEach((projectile) => {
                if (projectile.active) this.updateProjectile(projectile, dt)
        })

      const projectilesActive = this.projectiles.getChildren().some((p) => p.active)
        if (!this.gameOver && this.waveState === "wave"
                    && this.pendingSpawns === 0
                    && this.activeEnemyCount() === 0
                    && !projectilesActive) {
                this.finishCurrentWave()
        }
  }

  finishCurrentWave() {
        this.waveIndex += 1
        this.wavesCompleted += 1
        if (this.maxWaves && this.waveIndex >= this.maxWaves) {
                this.endGame(true)
                return
        }
        this.startWaveCountdown()
  }

  startWaveCountdown() {
        this.waveState = "countdown"
        const justFinished = this.getWaveForNumber(this.waveIndex)
        const delayMs = justFinished?.nextWaveDelay ?? 5000
        this.countdownRemaining = Math.max(1, Math.round(delayMs / 1000))

      if (this.countdownTimer) this.countdownTimer.remove(false)

      this.setStartButtonState(false, "Wave Starting Soon")
        this.updateUI()

      this.countdownTimer = this.time.addEvent({
              delay: 1000,
              loop: true,
              callback: () => {
                        if (this.gameOver || this.waveState !== "countdown") return
                        this.countdownRemaining -= 1
                        this.updateUI()
                        if (this.countdownRemaining > 0) return
                        this.countdownTimer?.remove(false)
                        this.countdownTimer = null
                        this.countdownRemaining = 0
                        this.waveState = "intermission"
                        this.startNextWave()
              }
      })
  }

  getWaveForNumber(waveNumber) {
        if (waveNumber % 5 === 0) {
                return {
                          id: waveNumber,
                          bossWave: true,
                          nextWaveDelay: 6000,
                          spawns: [
                            { type: "boss", count: 1, interval: 0 },
                            { type: "grunt", count: 3, interval: 900, gapAfter: 500 }
                                    ]
                }
        }
        const baseWave = WAVES[(waveNumber - 1) % WAVES.length]
        return { id: waveNumber, bossWave: false, nextWaveDelay: baseWave.nextWaveDelay, spawns: baseWave.spawns }
  }

  drawGrid() {
        const g = this.graphics
        for (let y = 0; y < this.gridH; y++) {
                for (let x = 0; x < this.gridW; x++) {
                          const wx = this.originX + x * this.tileSize
                          const wy = this.originY + y * this.tileSize
                          const isPath = this.pathSet.has(`${x},${y}`)
                          g.lineStyle(1, 0x333333)
                          g.fillStyle(isPath ? 0x2a2a2a : 0x171717)
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

  tileCenter(tx, ty) {
        return {
                x: this.originX + tx * this.tileSize + this.tileSize / 2,
                y: this.originY + ty * this.tileSize + this.tileSize / 2
        }
  }

  spawnEnemy(enemyTypeKey, waveNumber = this.waveIndex + 1) {
        if (this.gameOver) return
        const enemyType = ENEMY_TYPES[enemyTypeKey]
        if (!enemyType) return

      const waveOffset = waveNumber - 1
        const hpScale = 1 + 0.12 * waveOffset
        const speedScale = 1 + 0.03 * waveOffset
        const rewardScale = 1 + 0.05 * waveOffset

      const start = this.path[0]
        const pos = this.tileCenter(start.x, start.y)
        const enemy = this.add.circle(pos.x, pos.y, enemyType.radius, enemyType.color)
        enemy.enemyType = enemyType.key
        enemy.baseColor = enemyType.color
        enemy.hp = enemyType.hp * hpScale
        enemy.baseSpeed = enemyType.speed * speedScale
        enemy.reward = Math.max(1, Math.floor(enemyType.reward * rewardScale))
        enemy.pathIndex = 0
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
        const currentFlashVersion = enemy.flashVersion
        enemy.setFillStyle(0xffffff, 1)

      const damageText = this.add.text(enemy.x, enemy.y - 16, `-${Math.round(damage)}`, {
              fontSize: "14px", color: "#ffd7d7"
      })
        damageText.setOrigin(0.5).setDepth(18)
        this.tweens.add({
                targets: damageText, y: enemy.y - 34, alpha: 0,
                duration: 320, ease: "Quad.easeOut",
                onComplete: () => damageText.destroy()
        })
        this.time.delayedCall(50, () => {
                if (!enemy.active || enemy.isDying) return
                if (enemy.flashVersion !== currentFlashVersion) return
                enemy.isFlashing = false
                this.updateEnemyColor(enemy)
        })
  }

  playEnemyDeathEffect(enemy) {
        if (!enemy.active || enemy.isDying) return
        enemy.isDying = true
        this.tweens.add({
                targets: enemy, alpha: 0, scaleX: 0.2, scaleY: 0.2,
                duration: 140, ease: "Quad.easeIn",
                onComplete: () => { if (enemy.active) enemy.destroy() }
        })
  }

  playGunMuzzleFlash(tower) {
        const flash = this.add.circle(tower.x, tower.y, 6, 0xfff2a8, 0.9)
        flash.setDepth(12)
        this.tweens.add({
                targets: flash, alpha: 0, scaleX: 1.8, scaleY: 1.8,
                duration: 90, ease: "Quad.easeOut",
                onComplete: () => flash.destroy()
        })
  }

  playExplosionEffect(x, y, color = 0xffb366) {
        const explosion = this.add.circle(x, y, 8, color, 0.7)
        explosion.setDepth(12)
        this.tweens.add({
                targets: explosion, radius: 36, alpha: 0,
                duration: 220, ease: "Quad.easeOut",
                onComplete: () => explosion.destroy()
        })
  }

  moveEnemy(enemy, dt, time) {
        if (this.gameOver || enemy.isDying) return
        const next = enemy.pathIndex + 1
        if (next >= this.path.length) {
                enemy.destroy()
                this.lives -= 1
                this.updateUI()
                if (this.lives <= 0) this.endGame()
                return
        }
        const targetTile = this.path[next]
        const target = this.tileCenter(targetTile.x, targetTile.y)
        const dx = target.x - enemy.x
        const dy = target.y - enemy.y
        const dist = Math.hypot(dx, dy)
        if (dist < 2) { enemy.pathIndex = next; return }

      const isSlowed = time < enemy.slowUntil
        if (enemy.isSlowed !== isSlowed) {
                enemy.isSlowed = isSlowed
                this.updateEnemyColor(enemy)
        }
        const activeSlowFactor = isSlowed ? enemy.slowFactor : 1
        enemy.x += (dx / dist) * enemy.baseSpeed * activeSlowFactor * dt
        enemy.y += (dy / dist) * enemy.baseSpeed * activeSlowFactor * dt
  }

  placeTower(tx, ty, towerType) {
        const pos = this.tileCenter(tx, ty)
        const tower = this.add.rectangle(pos.x, pos.y, 26, 26, towerType.color)
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
        tower.maxLevel = 5
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
        case "last":
                  return candidates.reduce((a, b) => a.enemy.pathIndex < b.enemy.pathIndex ? a : b).enemy
        case "strong":
                  return candidates.reduce((a, b) => a.enemy.hp > b.enemy.hp ? a : b).enemy
        case "close":
                  return candidates.reduce((a, b) => a.d < b.d ? a : b).enemy
        case "first":
        default:
                  return candidates.reduce((a, b) => a.enemy.pathIndex > b.enemy.pathIndex ? a : b).enemy
      }
  }

  towerLogic(tower, time) {
        if (time - tower.lastShot < tower.cooldown) return
        const enemies = this.enemies.getChildren()
        const target = this.pickTarget(tower, enemies)
        if (!target) return
        tower.lastShot = time

      if (tower.mode === "projectile_aoe") {
              this.spawnMissileProjectile(tower, target)
              return
      }

      const beam = this.add.line(0, 0, tower.x, tower.y, target.x, target.y, 0xffffaa)
        beam.setOrigin(0, 0)
        this.time.delayedCall(60, () => beam.destroy())

      if (tower.mode === "single") {
              this.playGunMuzzleFlash(tower)
      }

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
        if (damageType === "magic" && enemy.magicResist) {
                final = final * (1 - enemy.magicResist)
        }
        if (damageType === "physical" && enemy.armor) {
                final = Math.max(1, final - enemy.armor)
        }
        this.showHitFeedback(enemy, final)
        enemy.hp -= final
        if (enemy.hp > 0) return
        this.playEnemyDeathEffect(enemy)
        this.money += enemy.reward
        this.moneyEarned += enemy.reward
        this.updateUI()
  }

  activeEnemyCount() {
        let activeCount = 0
        this.enemies.getChildren().forEach((enemy) => {
                if (enemy.active && !enemy.isDying) activeCount += 1
        })
        return activeCount
  }

  updateUI() {
        const selectedTower = TOWER_TYPES[this.selectedTowerKey]
        const waveLabel = this.waveIndex + 1
        const waveStateLabel =
                this.waveState === "wave" ? "In Progress"
                : this.waveState === "countdown" ? `Next wave in: ${this.countdownRemaining}s`
                : "Intermission"
        const bossLabel = waveLabel % 5 === 0 ? " BOSS WAVE" : ""
        const enemiesRemaining = this.waveState === "wave"
          ? this.waveSpawnRemaining + this.activeEnemyCount() : 0

      if (this.hudLeftEl) {
              this.hudLeftEl.textContent =
                        `Mode: ${this.mode.label} | Money: ${this.money} | Lives: ${this.lives} | Wave: ${waveLabel}${bossLabel} (${waveStateLabel}) | Enemies: ${enemiesRemaining}`
      }

      const selectedTowerLabel = `Tower: ${selectedTower.name} [1/2/3/4]`
        if (this.hudRightLabelEl) this.hudRightLabelEl.textContent = selectedTowerLabel
        else if (this.hudRightEl) this.hudRightEl.textContent = selectedTowerLabel

      if (this.selectedPlacedTower) this.updateTowerInfoPanel(this.selectedPlacedTower)

      if (this.countdownOverlayText) {
              const showCountdownOverlay = this.waveState === "countdown"
              this.countdownOverlayText.setVisible(showCountdownOverlay)
              if (showCountdownOverlay) {
                        this.countdownOverlayText.setText(`Next wave in: ${this.countdownRemaining}`)
              }
      }
  }

  endGame(victory = false) {
        if (this.gameOver) return
        this.gameOver = true
        if (this.countdownTimer) {
                this.countdownTimer.remove(false)
                this.countdownTimer = null
        }
        this.setStartButtonState(false, "Start Wave")
        this.setUpgradeButtonEnabled(false, "Upgrade")
        this.setSellButtonEnabled(false, "Sell")
        const finalWaveReached = this.waveState === "wave"
          ? this.waveIndex + 1 : Math.max(1, this.waveIndex)
        const score = this.wavesCompleted * 100 + this.moneyEarned
        setBestScore(this.mode.key, score)
        const bestScore = getBestScore(this.mode.key)
        this.scene.start("gameover", {
                title: victory ? "You Win" : "Game Over",
                titleColor: victory ? "#7fffa0" : "#ff5555",
                mode: this.mode,
                finalWaveReached,
                score,
                bestScore,
                wavesCompleted: this.wavesCompleted
        })
  }
}

new Phaser.Game({
    type: Phaser.AUTO,
    parent: "app",
    scene: [MenuScene, GameScene, GameOverScene],
    scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 900,
          height: 600
    }
})
