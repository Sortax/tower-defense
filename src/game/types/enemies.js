export const ENEMY_TYPES = {
    grunt: {
          key: "grunt",
          name: "Grunt",
          color: 0xff5555,
          radius: 14,
          hp: 30,
          speed: 70,
          reward: 10
    },
    fast: {
          key: "fast",
          name: "Fast",
          color: 0xff9999,
          radius: 11,
          hp: 18,
          speed: 110,
          reward: 12
    },
    tank: {
          key: "tank",
          name: "Tank",
          color: 0xcc3333,
          radius: 16,
          hp: 80,
          speed: 45,
          reward: 20,
          armor: 3
    },
    flier: {
          key: "flier",
          name: "Flier",
          color: 0x99ddff,
          radius: 12,
          hp: 40,
          speed: 90,
          reward: 16,
          flying: true
    },
    shielded: {
          key: "shielded",
          name: "Shielded",
          color: 0xddddff,
          radius: 14,
          hp: 55,
          speed: 60,
          reward: 18,
          magicResist: 0.6
    },
    boss: {
          key: "boss",
          name: "Boss",
          color: 0xaa22ff,
          radius: 20,
          hp: 260,
          speed: 34,
          reward: 80,
          armor: 5,
          immuneToSlow: true
    }
}
