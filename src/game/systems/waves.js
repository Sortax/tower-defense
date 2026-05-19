export const WAVES = [
  { id: 1, spawns: [ { type: "grunt", count: 10, interval: 580 }, { type: "runner", count: 3, interval: 320 } ] },
  { id: 2, spawns: [ { type: "grunt", count: 10, interval: 500, gapAfter: 350 }, { type: "fast", count: 7, interval: 300 } ] },
  { id: 3, spawns: [ { type: "fast", count: 10, interval: 290, gapAfter: 350 }, { type: "tank", count: 3, interval: 820 }, { type: "runner", count: 5, interval: 220 } ] },
  { id: 4, spawns: [ { type: "flier", count: 7, interval: 460, gapAfter: 300 }, { type: "grunt", count: 10, interval: 330 } ] },
  { id: 5, spawns: [ { type: "shielded", count: 7, interval: 620, gapAfter: 350 }, { type: "fast", count: 12, interval: 230 }, { type: "runner", count: 6, interval: 190 } ] },
  { id: 6, spawns: [ { type: "armored", count: 6, interval: 680, gapAfter: 350 }, { type: "flier", count: 7, interval: 400 }, { type: "grunt", count: 12, interval: 280 } ] },
  { id: 7, spawns: [ { type: "regenerator", count: 8, interval: 540, gapAfter: 300 }, { type: "tank", count: 5, interval: 760 }, { type: "runner", count: 10, interval: 170 } ] },
  { id: 8, spawns: [ { type: "splitter", count: 10, interval: 410, gapAfter: 350 }, { type: "fast", count: 14, interval: 220 }, { type: "armored", count: 4, interval: 600 } ] },
  { id: 9, spawns: [ { type: "flyerTank", count: 8, interval: 430, gapAfter: 350 }, { type: "shielded", count: 8, interval: 520, gapAfter: 300 }, { type: "runner", count: 14, interval: 160 } ] },
  { id: 10, spawns: [ { type: "brute", count: 5, interval: 900, gapAfter: 300 }, { type: "armored", count: 8, interval: 550, gapAfter: 300 }, { type: "flier", count: 10, interval: 340 }, { type: "regenerator", count: 7, interval: 420 } ] }
]
