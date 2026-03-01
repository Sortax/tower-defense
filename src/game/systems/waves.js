export const WAVES = [
  {
    id: 1,
    nextWaveDelay: 2200,
    spawns: [
      { type: "grunt", count: 8, interval: 750 }
    ]
  },
  {
    id: 2,
    nextWaveDelay: 2600,
    spawns: [
      { type: "fast", count: 6, interval: 500 },
      { type: "grunt", count: 6, interval: 650, gapAfter: 500 }
    ]
  },
  {
    id: 3,
    nextWaveDelay: 0,
    spawns: [
      { type: "tank", count: 4, interval: 1000 },
      { type: "fast", count: 8, interval: 450 },
      { type: "grunt", count: 6, interval: 550 }
    ]
  }
]
