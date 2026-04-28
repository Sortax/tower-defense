// Progression :
// 1-2  : grunts seuls (apprentissage)
// 3    : intro fast
// 4    : intro tank
// 5    : boss (genere inline dans main.js)
// 6    : intro flier  -> oblige a acheter du missile/slow
// 7    : mix dense
// 8    : intro shielded -> oblige a acheter du physique
// 9    : rush fast
// 10   : boss
// 11-12: vagues finales tres mixtes
export const WAVES = [
  {
        id: 1,
        nextWaveDelay: 4000,
        spawns: [
          { type: "grunt", count: 8, interval: 750 }
              ]
  },
  {
        id: 2,
        nextWaveDelay: 4000,
        spawns: [
          { type: "grunt", count: 12, interval: 600 }
              ]
  },
  {
        id: 3,
        nextWaveDelay: 5000,
        spawns: [
          { type: "grunt", count: 6, interval: 600, gapAfter: 800 },
          { type: "fast", count: 6, interval: 450 }
              ]
  },
  {
        id: 4,
        nextWaveDelay: 5000,
        spawns: [
          { type: "tank", count: 3, interval: 1200, gapAfter: 600 },
          { type: "grunt", count: 8, interval: 500 }
              ]
  },
    // wave 5 = boss (genere inline dans getWaveForNumber)
  {
        id: 6,
        nextWaveDelay: 5000,
        spawns: [
          { type: "flier", count: 6, interval: 700 }
              ]
  },
  {
        id: 7,
        nextWaveDelay: 5000,
        spawns: [
          { type: "fast", count: 8, interval: 350, gapAfter: 600 },
          { type: "tank", count: 4, interval: 1100, gapAfter: 600 },
          { type: "grunt", count: 10, interval: 450 }
              ]
  },
  {
        id: 8,
        nextWaveDelay: 5000,
        spawns: [
          { type: "shielded", count: 5, interval: 900, gapAfter: 600 },
          { type: "fast", count: 8, interval: 400 }
              ]
  },
  {
        id: 9,
        nextWaveDelay: 5000,
        spawns: [
          { type: "fast", count: 25, interval: 220 }
              ]
  },
    // wave 10 = boss
  {
        id: 11,
        nextWaveDelay: 6000,
        spawns: [
          { type: "flier", count: 5, interval: 600, gapAfter: 800 },
          { type: "shielded", count: 4, interval: 800, gapAfter: 800 },
          { type: "tank", count: 3, interval: 1100 }
              ]
  },
  {
        id: 12,
        nextWaveDelay: 6000,
        spawns: [
          { type: "grunt", count: 15, interval: 350, gapAfter: 600 },
          { type: "fast", count: 10, interval: 300, gapAfter: 600 },
          { type: "shielded", count: 5, interval: 700, gapAfter: 600 },
          { type: "flier", count: 5, interval: 700 }
              ]
  }
  ]
