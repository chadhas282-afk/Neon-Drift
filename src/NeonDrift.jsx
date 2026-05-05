import { useState, useEffect, useRef, useCallback } from "react";

const W = 400, H = 560;
const ROAD_LEFT = 55, ROAD_RIGHT = W - 55;
const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
const LANES = 4;
const LANE_W = ROAD_W / LANES;

const DIFF = {
  rookie: { baseSpeed: 3.5, speedInc: 0.0005, obsRate: 0.016, lives: 5, label: "ROOKIE", color: "#06d6a0" },
  pro: { baseSpeed: 5.5, speedInc: 0.0011, obsRate: 0.030, lives: 3, label: "PRO", color: "#ffbe0b" },
  legend: { baseSpeed: 8, speedInc: 0.0018, obsRate: 0.046, lives: 2, label: "LEGEND", color: "#ff006e" },
};

const POWERUP_TYPES = {
  shield: { color: "#00f5ff", glow: "#00f5ff", symbol: "🛡", label: "SHIELD", duration: 300 },
  nitro: { color: "#ff6600", glow: "#ff4400", symbol: "⚡", label: "NITRO", duration: 180 },
    magnet: { color: "#cc00ff", glow: "#aa00ee", symbol: "◈", label: "COIN MAGNET", duration: 400 },
  slow: { color: "#ffff00", glow: "#cccc00", symbol: "⏱", label: "SLOW TIME", duration: 250 },
};

const COIN_COLORS = ["#ffd700", "#ffec6e", "#ffe135"];

const C = {
  bg: "#02020e", road: "#08081a", cyan: "#00f5ff", pink: "#ff006e",
  yellow: "#ffbe0b", green: "#06d6a0", orange: "#ff6600", purple: "#cc00ff",
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
