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

  ctx.shadowColor = C.cyan; ctx.shadowBlur = 14;
  ctx.strokeStyle = "rgba(0,245,255,0.55)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ROAD_LEFT, 0); ctx.lineTo(ROAD_LEFT, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ROAD_RIGHT, 0); ctx.lineTo(ROAD_RIGHT, H); ctx.stroke();
  ctx.shadowBlur = 0;

  for (let l = 1; l < LANES; l++) {
    const x = ROAD_LEFT + l * LANE_W;
    ctx.setLineDash([28, 18]); ctx.lineDashOffset = -offset;
    ctx.strokeStyle = l === 2 ? "rgba(255,0,110,0.2)" : "rgba(0,245,255,0.12)";
    ctx.lineWidth = l === 2 ? 1.5 : 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.lineDashOffset = 0;

  if (speed > 7) {
    const alpha = Math.min((speed - 7) / 14, 0.18);
    const refGrad = ctx.createLinearGradient(ROAD_LEFT, H * 0.7, ROAD_LEFT, H);
    refGrad.addColorStop(0, `rgba(0,245,255,0)`);
    refGrad.addColorStop(1, `rgba(0,245,255,${alpha})`);
    ctx.fillStyle = refGrad; ctx.fillRect(ROAD_LEFT, H * 0.7, ROAD_W, H * 0.3);
  }
}

function drawObstacle(ctx, o, frame) {
  ctx.save(); ctx.translate(o.x, o.y);

  if (o.type === "barrier") {
    ctx.fillStyle = "#1a0800";
    rr(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 3); ctx.fill();
    const stripes = 4;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#ff6600" : "#ffbe0b";
      ctx.fillRect(-o.w / 2 + i * (o.w / stripes), -o.h / 2, o.w / stripes, o.h);
    }
     ctx.shadowColor = "#ff6600"; ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(255,100,0,0.6)"; ctx.lineWidth = 1;
    rr(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 3); ctx.stroke();
    } else {
    const cg = ctx.createLinearGradient(-o.w / 2, -o.h / 2, o.w / 2, o.h / 2);
    cg.addColorStop(0, o.color + "dd");
    cg.addColorStop(0.4, o.color + "ff");
     cg.addColorStop(1, o.color + "66");
    ctx.fillStyle = cg;
    rr(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 6); ctx.fill();

     ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(-o.w / 2 + 5, -o.h / 2 + 10, o.w - 10, o.h * 0.38);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(-o.w / 2 + 7, -o.h / 2 + 12, o.w - 14, o.h * 0.32);

     ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.ellipse(-o.w / 2 + 5, o.h / 2 - 8, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(o.w / 2 - 5, o.h / 2 - 8, 6, 4, 0, 0, Math.PI * 2); ctx.fill();