// Difficulty ramped up significantly:
// - shorter intermissions
// - tighter intervals
// - more enemies per wave
// - earlier mixed compositions
// - flier intro pulled to wave 4, shielded to wave 6
// - boss waves remain at multiples of 5 (handled inline in main.js)
export const WAVES = [
  { id: 1, nextWaveDelay: 3000, spawns: [ { type: "grunt", count: 12, interval: 600 } ] },
  { id: 2, nextWaveDelay: 3000, spawns: [ { type: "grunt", count: 10, interval: 500, gapAfter: 500 }, { type: "fast", count: 6, interval: 350 } ] },
  { id: 3, nextWaveDelay: 3500, spawns: [ { type: "fast", count: 12, interval: 320, gapAfter: 600 }, { type: "tank", count: 3, interval: 1000 } ] },
  { id: 4, nextWaveDelay: 3500, spawns: [ { type: "flier", count: 8, interval: 500 } ] },
  { id: 6, nextWaveDelay: 4000, spawns: [ { type: "shielded", count: 6, interval: 700, gapAfter: 600 }, { type: "fast", count: 12, interval: 280 } ] },
  { id: 7, nextWaveDelay: 4000, spawns: [ { type: "flier", count: 6, interval: 500, gapAfter: 500 }, { type: "tank", count: 5, interval: 900, gapAfter: 500 }, { type: "grunt", count: 14, interval: 350 } ] },
  { id: 8, nextWaveDelay: 4000, spawns: [ { type: "shielded", count: 8, interval: 600, gapAfter: 500 }, { type: "fast", count: 18, interval: 220 } ] },
  { id: 9, nextWaveDelay: 4500, spawns: [ { type: "fast", count: 35, interval: 180 } ] },
  { id: 11, nextWaveDelay: 5000, spawns: [ { type: "flier", count: 8, interval: 450, gapAfter: 600 }, { type: "shielded", count: 6, interval: 700, gapAfter: 600 }, { type: "tank", count: 5, interval: 900 } ] },
  { id: 12, nextWaveDelay: 5000, spawns: [ { type: "grunt", count: 22, interval: 280, gapAfter: 500 }, { type: "fast", count: 16, interval: 220, gapAfter: 500 }, { type: "shielded", count: 8, interval: 550, gapAfter: 500 }, { type: "flier", count: 8, interval: 500 } ] }
  ]
