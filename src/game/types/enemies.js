export const ENEMY_TYPES = {
    grunt: {
          key: "grunt",
          name: "Grunt",
          color: 0xff6d6d,
          radius: 14,
          hp: 32,
          speed: 74,
          reward: 9
    },
    fast: {
          key: "fast",
          name: "Fast",
          color: 0xffb3b3,
          radius: 11,
          hp: 20,
          speed: 120,
          reward: 11
    },
    tank: {
          key: "tank",
          name: "Tank",
          color: 0xc93c3c,
          radius: 16,
          hp: 90,
          speed: 48,
          reward: 20,
          armor: 3
    },
    flier: {
          key: "flier",
          name: "Flier",
          color: 0x8fd8ff,
          radius: 12,
          hp: 42,
          speed: 94,
          reward: 15,
          flying: true
    },
    shielded: {
          key: "shielded",
          name: "Shielded",
          color: 0xdcdcff,
          radius: 14,
          hp: 60,
          speed: 62,
          reward: 18,
          magicResist: 0.6
    },
    armored: {
          key: "armored",
          name: "Armored",
          color: 0x7e8796,
          radius: 15,
          hp: 80,
          speed: 58,
          reward: 20,
          armor: 7
    },
    runner: {
          key: "runner",
          name: "Runner",
          color: 0xffec8f,
          radius: 9,
          hp: 16,
          speed: 162,
          reward: 9
    },
    brute: {
          key: "brute",
          name: "Brute",
          color: 0x7a2b2b,
          radius: 18,
          hp: 170,
          speed: 36,
          reward: 34,
          armor: 2
    },
    flyerTank: {
          key: "flyerTank",
          name: "Flyer Tank",
          color: 0x67a5ff,
          radius: 14,
          hp: 84,
          speed: 82,
          reward: 24,
          flying: true
    },
    regenerator: {
          key: "regenerator",
          name: "Regenerator",
          color: 0x75ff9a,
          radius: 13,
          hp: 64,
          speed: 68,
          reward: 20,
          regenPerSecond: 4
    },
    splitter: {
          key: "splitter",
          name: "Splitter",
          color: 0xcf93ff,
          radius: 13,
          hp: 58,
          speed: 86,
          reward: 18
    },
    boss: {
          key: "boss",
          name: "Boss",
          color: 0xb32cff,
          radius: 21,
          hp: 320,
          speed: 36,
          reward: 95,
          armor: 6,
          immuneToSlow: true,
          magicResist: 0.2
    }
}
