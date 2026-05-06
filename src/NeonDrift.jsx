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

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function mkStars() {
  return Array.from({ length: 120 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
     r: Math.random() * 1.4 + 0.2,
    speed: Math.random() * 0.5 + 0.05,
    opacity: Math.random() * 0.8 + 0.2,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }


function drawBg(ctx) { ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); }

function drawStars(ctx, stars, frame) {
  stars.forEach(s => {
    s.twinkle += 0.03;
    const op = s.opacity * (0.7 + 0.3 * Math.sin(s.twinkle));
     ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,220,255,${op * 0.6})`; ctx.fill();
  });
}


function drawRoad(ctx, offset, speed) {
  const sg = ctx.createLinearGradient(0, 0, ROAD_LEFT, 0);
  sg.addColorStop(0, "#02020e"); sg.addColorStop(1, "rgba(0,245,255,0.03)");
  ctx.fillStyle = sg; ctx.fillRect(0, 0, ROAD_LEFT, H);
  const sg2 = ctx.createLinearGradient(ROAD_RIGHT, 0, W, 0);
  sg2.addColorStop(0, "rgba(0,245,255,0.03)"); sg2.addColorStop(1, "#02020e");
  ctx.fillStyle = sg2; ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);

  const rg = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
  rg.addColorStop(0, "#090920"); rg.addColorStop(0.15, "#0d0d28");
  rg.addColorStop(0.5, "#0f0f2e"); rg.addColorStop(0.85, "#0d0d28");
    rg.addColorStop(1, "#090920");
  ctx.fillStyle = rg; ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);

  for (let side = 0; side < 2; side++) {
    const ex = side === 0 ? ROAD_LEFT : ROAD_RIGHT;
    const eg = ctx.createLinearGradient(ex - (side === 0 ? 20 : 0), 0, ex + (side === 0 ? 0 : 20), 0);
    if (side === 0) { eg.addColorStop(0, "transparent"); eg.addColorStop(1, "rgba(0,245,255,0.6)"); }
    else { eg.addColorStop(0, "rgba(0,245,255,0.06)"); eg.addColorStop(1, "transparent"); }
    ctx.fillStyle = eg; ctx.fillRect(ex - (side === 0 ? 20 : 0), 0, 20, H);
  }
