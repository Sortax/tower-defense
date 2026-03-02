export const TOWER_TYPES = {
  gun: {
    key: "gun",
    name: "Gun",
    color: 0x55aaff,
    range: 140,
    cooldown: 400,
    damage: 10,
    cost: 25,
    mode: "single"
  },
  slow: {
    key: "slow",
    name: "Slow",
    color: 0x66ddaa,
    range: 130,
    cooldown: 550,
    damage: 4,
    cost: 35,
    mode: "slow",
    slowFactor: 0.45,
    slowDuration: 1200
  },
  aoe: {
    key: "aoe",
    name: "AOE",
    color: 0xffaa44,
    range: 150,
    cooldown: 900,
    damage: 14,
    cost: 45,
    mode: "aoe",
    splashRadius: 60
  },
  missile: {
    key: "missile",
    name: "Missile",
    color: 0xff8800,
    range: 180,
    cooldown: 1100,
    damage: 22,
    cost: 55,
    mode: "projectile_aoe",
    projectileSpeed: 280,
    splashRadius: 90
  }
}

export const TOWER_KEY_ORDER = ["gun", "slow", "aoe", "missile"]
