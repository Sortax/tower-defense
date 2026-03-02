import Phaser from "phaser"
import "./style.css"
import { TOWER_KEY_ORDER, TOWER_TYPES } from "./game/types/towers"
import { ENEMY_TYPES } from "./game/types/enemies"
import { WAVES } from "./game/systems/waves"

const BEST_SCORE_KEY = "tower_defense_best_score"
const LEADERBOARD_KEY = "tower_defense_leaderboard_top10"
const GAME_MODE_CLASSIC = "classic"
const MAX_LEADERBOARD_ENTRIES = 10
const HUD_HIDDEN_DISPLAY = "none"
const HUD_VISIBLE_DISPLAY = "flex"

function setHudVisibility(visible) {
  const hud = document.getElementById("hud")
  if (!hud) return
  hud.style.display = visible ? HUD_VISIBLE_DISPLAY : HUD_HIDDEN_DISPLAY
}

function getBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY)
    const parsed = Number.parseInt(raw ?? "0", 10)
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

function setBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score))
  } catch {
    // Ignore storage failures; gameplay still works.
  }
}

function normalizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") return null

  const score = Number.parseInt(entry.score, 10)
  const wavesReached = Number.parseInt(entry.wavesReached, 10)
  const mode = typeof entry.mode === "string" && entry.mode.trim() ? entry.mode : GAME_MODE_CLASSIC
  const dateISO = typeof entry.dateISO === "string" && entry.dateISO.trim()
    ? entry.dateISO
    : new Date().toISOString()

  if (!Number.isFinite(score)) return null
  if (!Number.isFinite(wavesReached)) return null

  return {
    score,
    mode,
    wavesReached,
    dateISO
  }
}

function saveLeaderboard(leaderboard) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard))
  } catch {
    // Ignore storage failures; gameplay still works.
  }
}

function getLeaderboard() {
  let leaderboard = []

  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        leaderboard = parsed
          .map((entry) => normalizeLeaderboardEntry(entry))
          .filter((entry) => entry !== null)
      }
    }
  } catch {
    leaderboard = []
  }

  const legacyBestScore = getBestScore()
  if (!leaderboard.length && legacyBestScore > 0) {
    leaderboard.push({
      score: legacyBestScore,
      mode: "legacy",
      wavesReached: 0,
      dateISO: new Date().toISOString()
    })
  }

  leaderboard.sort((a, b) => b.score - a.score)
  const trimmed = leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES)

  if (trimmed.length !== leaderboard.length || !leaderboard.length && legacyBestScore > 0) {
    saveLeaderboard(trimmed)
  }

  return trimmed
}

function addLeaderboardEntry(entry) {
  const normalizedEntry = normalizeLeaderboardEntry(entry)
  if (!normalizedEntry) {
    return getLeaderboard()
  }

  const leaderboard = [...getLeaderboard(), normalizedEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LEADERBOARD_ENTRIES)

  saveLeaderboard(leaderboard)
  setBestScore(leaderboard[0]?.score ?? 0)

  return leaderboard
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu")
  }

  create() {
    setHudVisibility(false)
    this.cameras.main.setBackgroundColor("#111")

    this.add.text(450, 120, "Tower Defense", {
      fontSize: "58px",
      color: "#ffffff"
    }).setOrigin(0.5)

    this.add.text(450, 250, "Instructions", {
      fontSize: "34px",
      color: "#ffee88"
    }).setOrigin(0.5)

    this.add.text(450, 320, "1 / 2 / 3: Select Tower\nClick empty tile: Place Tower\nClick tower: Upgrade", {
      fontSize: "24px",
      color: "#ffffff",
      align: "center",
      lineSpacing: 10
    }).setOrigin(0.5)

    const bestScore = getBestScore()
    this.add.text(450, 430, `Best Score: ${bestScore}`, {
      fontSize: "28px",
      color: "#aee3ff"
    }).setOrigin(0.5)

    const leaderboard = getLeaderboard()
    const leaderboardLines = leaderboard.length
      ? leaderboard
        .map((entry, index) => `${index + 1}. ${entry.score} | ${entry.mode} | Wave ${entry.wavesReached}`)
        .join("\n")
      : "No runs yet"

    this.add.text(450, 500, `Top 10 Leaderboard\n${leaderboardLines}`, {
      fontSize: "18px",
      color: "#ffffff",
      align: "center",
      lineSpacing: 6
    }).setOrigin(0.5)

    const playButton = this.add.text(450, 570, "Play", {
      fontSize: "38px",
      color: "#7fffa0",
      backgroundColor: "#1b3d24",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5)

    playButton.setInteractive({ useHandCursor: true })
    playButton.on("pointerover", () => playButton.setStyle({ color: "#d8ffe6" }))
    playButton.on("pointerout", () => playButton.setStyle({ color: "#7fffa0" }))
    playButton.on("pointerdown", () => {
      this.scene.start("game")
    })
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() {
    super("gameover")
  }

  create(data) {
    setHudVisibility(false)
    const finalWaveReached = data.finalWaveReached ?? 1
    const score = data.score ?? 0
    const bestScore = data.bestScore ?? getBestScore()

    this.cameras.main.setBackgroundColor("#111")

    this.add.text(450, 150, "Game Over", {
      fontSize: "64px",
      color: "#ff5555"
    }).setOrigin(0.5)

    this.add.text(450, 280, `Final Wave: ${finalWaveReached}\nScore: ${score}\nBest: ${bestScore}`, {
      fontSize: "30px",
      color: "#ffffff",
      align: "center",
      lineSpacing: 12
    }).setOrigin(0.5)

    const restartButton = this.add.text(450, 470, "Restart", {
      fontSize: "36px",
      color: "#7fffa0",
      backgroundColor: "#1b3d24",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5)

    restartButton.setInteractive({ useHandCursor: true })
    restartButton.on("pointerover", () => restartButton.setStyle({ color: "#d8ffe6" }))
    restartButton.on("pointerout", () => restartButton.setStyle({ color: "#7fffa0" }))
    restartButton.on("pointerdown", () => {
      this.scene.start("game")
    })

    const menuButton = this.add.text(450, 545, "Menu", {
      fontSize: "26px",
      color: "#aee3ff",
      backgroundColor: "#1e2a33",
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5)

    menuButton.setInteractive({ useHandCursor: true })
    menuButton.on("pointerdown", () => {
      this.scene.start("menu")
    })
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super("game")
  }

  create() {
    setHudVisibility(true)
    this.cameras.main.setBackgroundColor("#111")

    this.tileSize = 48
    this.gridW = 16
    this.gridH = 10
    this.originX = 40
    this.originY = 40

    this.path = [
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 },
      { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 8, y: 4 },
      { x: 9, y: 4 }, { x: 10, y: 4 }, { x: 11, y: 4 },
      { x: 12, y: 4 }, { x: 13, y: 4 }, { x: 14, y: 4 },
      { x: 15, y: 4 }
    ]

    this.pathSet = new Set(this.path.map((p) => `${p.x},${p.y}`))

    this.graphics = this.add.graphics()
    this.drawGrid()

    this.enemies = this.add.group()
    this.towers = []

    this.money = 100
    this.lives = 10
    this.gameOver = false
    this.waveIndex = 0
    this.wavesCompleted = 0
    this.moneyEarned = 0
    this.waveState = "intermission"
    this.pendingSpawns = 0
    this.waveSpawnRemaining = 0
    this.selectedTowerKey = TOWER_KEY_ORDER[0]
    this.selectedPlacedTower = null
    this.uiPadding = 16
    this.hudLeftEl = document.getElementById("hud-left")
    this.hudRightEl = document.getElementById("hud-right")
    this.towerPanelEl = document.getElementById("tower-panel")
    this.towerPanelInfoEl = document.getElementById("tower-panel-info")
    this.towerUpgradeBtnEl = document.getElementById("tower-upgrade-btn")
    this.towerSellBtnEl = document.getElementById("tower-sell-btn")

    this.createWaveControls()
    // Tower controls now live in HTML HUD so they stay outside the grid/canvas.
    this.bindTowerPanelControls()
    this.createRangeOverlay()
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

    this.input.on("pointerdown", (p, currentlyOver) => {
      if (this.gameOver) return
      if (currentlyOver && currentlyOver.length) return

      const tile = this.worldToTile(p.worldX, p.worldY)
      if (!tile) {
        this.clearSelectedTower()
        return
      }
      if (this.pathSet.has(`${tile.x},${tile.y}`)) {
        this.clearSelectedTower()
        return
      }

      const existingTower = this.towers.find((t) => t.tx === tile.x && t.ty === tile.y)
      if (existingTower) {
        this.selectPlacedTower(existingTower)
        return
      }

      const towerType = TOWER_TYPES[this.selectedTowerKey]
      if (this.money < towerType.cost) {
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
      fontSize: "28px",
      color: "#7fffa0",
      backgroundColor: "#1b3d24",
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

  layoutHud() {
    // HUD is rendered in HTML, not inside Phaser.
  }

  layoutWaveButton() {
    const padding = this.uiPadding
    this.startWaveButtonText.setOrigin(1, 1)
    this.startWaveButtonText.setPosition(this.scale.width - padding, this.scale.height - padding)
  }

  layoutGameUi() {
    this.layoutHud()
    this.layoutWaveButton()
  }

  // Phaser in-grid tower panel was removed; the HUD sidebar provides these controls.
  bindTowerPanelControls() {
    if (this.towerUpgradeBtnEl) {
      this.towerUpgradeBtnEl.addEventListener("click", (event) => {
        // Stop this click from reaching Phaser/world placement handlers.
        event.stopPropagation()
        this.tryUpgradeSelectedTower()
      })
    }

    if (this.towerSellBtnEl) {
      this.towerSellBtnEl.addEventListener("click", (event) => {
        // Stop this click from reaching Phaser/world placement handlers.
        event.stopPropagation()
        this.trySellSelectedTower()
      })
    }
  }

  createRangeOverlay() {
    // Dedicated Graphics object for selected-tower range so it can be redrawn independently.
    this.rangeGraphics = this.add.graphics()
    this.rangeGraphics.setDepth(11)
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
    const upgradeCost = tower.level < tower.maxLevel ? tower.baseCost * tower.level : null
    const refundValue = Math.floor(tower.totalInvested * 0.7)
    const damageLabel = tower.damage.toFixed(1).replace(".0", "")
    const nextCostLabel = upgradeCost ? `${upgradeCost}` : "MAX"

    this.towerPanelInfoEl.textContent = `Type: ${towerType.name}
Level: ${tower.level}/${tower.maxLevel}
Damage: ${damageLabel}
Range: ${Math.round(tower.range)}
Upgrade: ${nextCostLabel}
Sell: ${refundValue}`
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

  tryUpgradeSelectedTower() {
    if (this.gameOver || !this.selectedPlacedTower) return

    const tower = this.selectedPlacedTower
    if (tower.level >= tower.maxLevel) return

    const upgradeCost = tower.baseCost * tower.level
    if (this.money < upgradeCost) return

    this.money -= upgradeCost
    tower.totalInvested += upgradeCost
    tower.level += 1

    const levelMultiplier = tower.level - 1
    tower.damage = tower.baseDamage * (1 + 0.2 * levelMultiplier)
    tower.range = tower.baseRange * (1 + 0.1 * levelMultiplier)
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
      if (enemy.active) {
        this.moveEnemy(enemy, dt, time)
      }
    })

    this.towers.forEach((tower) => {
      if (tower.active) {
        this.towerLogic(tower, time)
      }
    })

    if (!this.gameOver && this.waveState === "wave" && this.pendingSpawns === 0 && this.activeEnemyCount() === 0) {
      this.finishCurrentWave()
    }
  }

  finishCurrentWave() {
    this.waveState = "intermission"
    this.waveIndex += 1
    this.wavesCompleted += 1
    this.setStartButtonState(true, `Start Wave ${this.waveIndex + 1}`)
    this.updateUI()
  }

  getWaveForNumber(waveNumber) {
    if (waveNumber % 5 === 0) {
      return {
        id: waveNumber,
        bossWave: true,
        spawns: [
          { type: "boss", count: 1, interval: 0 },
          { type: "grunt", count: 3, interval: 900, gapAfter: 500 }
        ]
      }
    }

    const baseWave = WAVES[(waveNumber - 1) % WAVES.length]
    return {
      id: waveNumber,
      bossWave: false,
      spawns: baseWave.spawns
    }
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

    this.enemies.add(enemy)
  }

  updateEnemyColor(enemy) {
    if (!enemy.active || enemy.isDying) return
    if (enemy.isFlashing) {
      enemy.setFillStyle(0xffffff, 1)
      return
    }
    if (enemy.isSlowed) {
      enemy.setFillStyle(0x66aaff, 1)
      return
    }
    enemy.setFillStyle(enemy.baseColor, 1)
  }

  showHitFeedback(enemy, damage) {
    if (!enemy.active || enemy.isDying) return

    enemy.isFlashing = true
    enemy.flashVersion += 1
    const currentFlashVersion = enemy.flashVersion
    enemy.setFillStyle(0xffffff, 1)

    const damageText = this.add.text(enemy.x, enemy.y - 16, `-${Math.round(damage)}`, {
      fontSize: "14px",
      color: "#ffd7d7"
    })
    damageText.setOrigin(0.5)
    damageText.setDepth(18)

    this.tweens.add({
      targets: damageText,
      y: enemy.y - 34,
      alpha: 0,
      duration: 320,
      ease: "Quad.easeOut",
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
      targets: enemy,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 140,
      ease: "Quad.easeIn",
      onComplete: () => {
        if (enemy.active) {
          enemy.destroy()
        }
      }
    })
  }

  playGunMuzzleFlash(tower) {
    const flash = this.add.circle(tower.x, tower.y, 6, 0xfff2a8, 0.9)
    flash.setDepth(12)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 90,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy()
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

    if (dist < 2) {
      enemy.pathIndex = next
      return
    }

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
    tower.maxLevel = 3
    tower.mode = towerType.mode
    tower.slowFactor = towerType.slowFactor ?? 1
    tower.slowDuration = towerType.slowDuration ?? 0
    tower.splashRadius = towerType.splashRadius ?? 0
    tower.lastShot = 0

    this.applyTowerLevelVisual(tower)
    this.towers.push(tower)
  }

  towerLogic(tower, time) {
    if (time - tower.lastShot < tower.cooldown) return

    const enemies = this.enemies.getChildren()
    let target = null

    for (const enemy of enemies) {
      if (!enemy.active || enemy.isDying) continue
      const d = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y)
      if (d <= tower.range) {
        target = enemy
        break
      }
    }

    if (!target) return

    tower.lastShot = time

    const beam = this.add.line(0, 0, tower.x, tower.y, target.x, target.y, 0xffffaa)
    beam.setOrigin(0, 0)
    this.time.delayedCall(60, () => beam.destroy())
    if (tower.mode === "single") {
      this.playGunMuzzleFlash(tower)
    }

    if (tower.mode === "aoe") {
      const enemiesInSplash = enemies.filter((enemy) => {
        if (!enemy.active || enemy.isDying) return false
        const d = Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y)
        return d <= tower.splashRadius
      })

      enemiesInSplash.forEach((enemy) => {
        this.applyDamage(enemy, tower.damage)
      })
      return
    }

    this.applyDamage(target, tower.damage)

    if (tower.mode === "slow" && target.active) {
      target.slowFactor = tower.slowFactor
      target.slowUntil = time + tower.slowDuration
      target.isSlowed = true
      this.updateEnemyColor(target)
    }
  }

  applyDamage(enemy, damage) {
    if (!enemy.active || enemy.isDying) return

    this.showHitFeedback(enemy, damage)
    enemy.hp -= damage
    if (enemy.hp > 0) return

    this.playEnemyDeathEffect(enemy)
    this.money += enemy.reward
    this.moneyEarned += enemy.reward
    this.updateUI()
  }

  activeEnemyCount() {
    let activeCount = 0
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.active && !enemy.isDying) {
        activeCount += 1
      }
    })
    return activeCount
  }

  updateUI() {
    const selectedTower = TOWER_TYPES[this.selectedTowerKey]
    const waveLabel = this.waveIndex + 1
    const waveStateLabel = this.waveState === "wave" ? "In Progress" : "Intermission"
    const bossLabel = waveLabel % 5 === 0 ? " BOSS WAVE" : ""
    const enemiesRemaining = this.waveState === "wave"
      ? this.waveSpawnRemaining + this.activeEnemyCount()
      : 0

    if (this.hudLeftEl) {
      this.hudLeftEl.textContent = `Money: ${this.money} | Lives: ${this.lives} | Wave: ${waveLabel}${bossLabel} (${waveStateLabel}) | Enemies: ${enemiesRemaining}`
    }
    if (this.hudRightEl) {
      this.hudRightEl.textContent = `Tower: ${selectedTower.name} [1/2/3]`
    }

    if (this.selectedPlacedTower) {
      this.updateTowerInfoPanel(this.selectedPlacedTower)
    }
  }

  endGame() {
    if (this.gameOver) return
    this.gameOver = true
    this.setStartButtonState(false, "Start Wave")
    this.setUpgradeButtonEnabled(false, "Upgrade")
    this.setSellButtonEnabled(false, "Sell")

    const finalWaveReached = this.waveState === "wave" ? this.waveIndex + 1 : Math.max(1, this.waveIndex)
    const score = this.wavesCompleted * 100 + this.moneyEarned
    const leaderboard = addLeaderboardEntry({
      score,
      mode: GAME_MODE_CLASSIC,
      wavesReached: finalWaveReached,
      dateISO: new Date().toISOString()
    })
    const bestScore = leaderboard[0]?.score ?? getBestScore()

    this.scene.start("gameover", {
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
