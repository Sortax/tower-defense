import Phaser from "phaser"

class MainScene extends Phaser.Scene {
  constructor() {
    super("main")
  }

  create() {
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

    this.pathSet = new Set(this.path.map(p => `${p.x},${p.y}`))

    this.graphics = this.add.graphics()
    this.drawGrid()

    this.enemies = this.add.group()
    this.towers = []

    this.input.on("pointerdown", (p) => {
      const tile = this.worldToTile(p.worldX, p.worldY)
      if (!tile) return
      if (this.pathSet.has(`${tile.x},${tile.y}`)) return
      if (this.towers.find(t => t.tx === tile.x && t.ty === tile.y)) return
      this.placeTower(tile.x, tile.y)
    })

    this.time.addEvent({
      delay: 800,
      callback: () => this.spawnEnemy(),
      repeat: 20
    })
  }

  update(time, delta) {
    const dt = delta / 1000
    this.enemies.getChildren().forEach(e => this.moveEnemy(e, dt))
    this.towers.forEach(t => this.towerLogic(t, time))
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

  spawnEnemy() {
    const start = this.path[0]
    const pos = this.tileCenter(start.x, start.y)
    const enemy = this.add.circle(pos.x, pos.y, 14, 0xff5555)
    enemy.hp = 30
    enemy.speed = 70
    enemy.pathIndex = 0
    this.enemies.add(enemy)
  }

  moveEnemy(enemy, dt) {
    const next = enemy.pathIndex + 1
    if (next >= this.path.length) {
      enemy.destroy()
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

    enemy.x += (dx / dist) * enemy.speed * dt
    enemy.y += (dy / dist) * enemy.speed * dt
  }

  placeTower(tx, ty) {
    const pos = this.tileCenter(tx, ty)
    const tower = this.add.rectangle(pos.x, pos.y, 26, 26, 0x55aaff)
    tower.tx = tx
    tower.ty = ty
    tower.range = 140
    tower.cooldown = 400
    tower.lastShot = 0
    this.towers.push(tower)
  }

  towerLogic(tower, time) {
    if (time - tower.lastShot < tower.cooldown) return

    const enemies = this.enemies.getChildren()
    let target = null

    for (const e of enemies) {
      const d = Phaser.Math.Distance.Between(tower.x, tower.y, e.x, e.y)
      if (d <= tower.range) {
        target = e
        break
      }
    }

    if (!target) return

    tower.lastShot = time
    const beam = this.add.line(0, 0, tower.x, tower.y, target.x, target.y, 0xffffaa)
    beam.setOrigin(0, 0)
    this.time.delayedCall(60, () => beam.destroy())

    target.hp -= 10
    if (target.hp <= 0) target.destroy()
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  parent: "app",
  scene: [MainScene]
})
