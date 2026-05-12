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
    ctx.beginPath(); ctx.ellipse(-o.w / 2 + 5, -o.h / 2 + 8, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(o.w / 2 - 5, -o.h / 2 + 8, 6, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#fffde0"; ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 14;
    ctx.fillRect(-o.w / 2 + 4, o.h / 2 - 11, 8, 5);
    ctx.fillRect(o.w / 2 - 12, o.h / 2 - 11, 8, 5);

    ctx.fillStyle = "#ff2200"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 10;
    ctx.fillRect(-o.w / 2 + 4, -o.h / 2 + 3, 6, 4);
    ctx.fillRect(o.w / 2 - 10, -o.h / 2 + 3, 6, 4);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    rr(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 6); ctx.stroke();
  }
  ctx.restore();
}

function drawPowerup(ctx, p, frame) {
  ctx.save(); ctx.translate(p.x, p.y);
  const pulse = Math.sin(frame * 0.08) * 3;
  const cfg = POWERUP_TYPES[p.type];
  ctx.shadowColor = cfg.glow; ctx.shadowBlur = 16 + pulse;
  ctx.strokeStyle = cfg.color; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const r = 14 + pulse * 0.3;
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = "13px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(cfg.symbol, 0, 0);
  ctx.restore();
}

function drawCoin(ctx, c, frame) {
  ctx.save(); ctx.translate(c.x, c.y);
  const scaleX = Math.abs(Math.cos(frame * 0.07 + c.phase));
  ctx.scale(scaleX, 1);
  ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = COIN_COLORS[Math.floor(frame * 0.1 + c.phase) % COIN_COLORS.length];
  ctx.fill();
  ctx.strokeStyle = "#ffec6e"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPlayer(ctx, p, inv, shieldActive, nitroActive, frame) {
  if (inv > 0 && Math.floor(inv / 5) % 2 === 0) return;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.rotate(p.vx * 0.015);

  if (nitroActive) {
    for (let i = 0; i < 3; i++) {
      const fw = 6 + Math.random() * 4; const fh = 8 + Math.random() * 14;
      const fx = (i - 1) * 8; const fy = p.h / 2 + 2;
      const fg = ctx.createLinearGradient(fx, fy, fx, fy + fh);
      fg.addColorStop(0, "#ffffff"); fg.addColorStop(0.3, "#ff6600"); fg.addColorStop(1, "transparent");
      ctx.fillStyle = fg;
      rr(ctx, fx - fw / 2, fy, fw, fh, fw / 2); ctx.fill();
    }
  }

  if (shieldActive) {
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 20;
    ctx.strokeStyle = `rgba(0,245,255,${0.4 + 0.3 * Math.sin(frame * 0.15)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, 0, p.w / 2 + 10, p.h / 2 + 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.shadowColor = C.cyan; ctx.shadowBlur = 18;

  const bg = ctx.createLinearGradient(-p.w / 2, -p.h / 2, p.w / 2, p.h / 2);
  bg.addColorStop(0, "#00f0ff"); bg.addColorStop(0.45, "#0096b4"); bg.addColorStop(1, "#004455");
  ctx.fillStyle = bg;
  rr(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 7); ctx.fill();

  ctx.fillStyle = "rgba(255,0,110,0.85)";
  ctx.fillRect(-p.w / 2 + 6, -p.h / 2 + 14, p.w - 12, 4);
  ctx.fillRect(-p.w / 2 + 6, -p.h / 2 + 22, p.w - 12, 2);

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(-p.w / 2 + 5, -p.h / 2 + 6, p.w - 10, p.h * 0.34);
  ctx.fillStyle = "rgba(0,245,255,0.12)";
  ctx.fillRect(-p.w / 2 + 6, -p.h / 2 + 7, p.w - 12, p.h * 0.30);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath(); ctx.ellipse(-p.w / 2 + 5, p.h / 2 - 10, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(p.w / 2 - 5, p.h / 2 - 10, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-p.w / 2 + 5, -p.h / 2 + 10, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(p.w / 2 - 5, -p.h / 2 + 10, 7, 5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#fffde0"; ctx.shadowColor = "#fff"; ctx.shadowBlur = 16;
  ctx.fillRect(-p.w / 2 + 4, p.h / 2 - 11, 8, 6); ctx.fillRect(p.w / 2 - 12, p.h / 2 - 11, 8, 6);

  ctx.fillStyle = C.pink; ctx.shadowColor = C.pink; ctx.shadowBlur = 12;
  ctx.fillRect(-p.w / 2 + 4, -p.h / 2 + 3, 7, 5); ctx.fillRect(p.w / 2 - 11, -p.h / 2 + 3, 7, 5);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,245,255,0.5)"; ctx.lineWidth = 1;
  rr(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 7); ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, particles) {
  particles.forEach(p => {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.shadowColor = p.color; ctx.shadowBlur = 5 * a;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, p.r * a), 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawComboText(ctx, combos, frame) {
  combos.forEach(c => {
    const a = c.life / c.maxLife;
    ctx.globalAlpha = a;
    ctx.font = `bold ${c.size}px 'Orbitron', monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = c.color;
    ctx.shadowColor = c.color; ctx.shadowBlur = 12;
    ctx.fillText(c.text, c.x, c.y);
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function drawHUDCanvas(ctx, g, frame) {
  const cx2 = W - 30, cy2 = H - 38, r2 = 22;
  const speedRatio = Math.min(g.speed / 20, 1);
  ctx.strokeStyle = "rgba(0,245,255,0.15)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx2, cy2, r2, -Math.PI * 0.8, Math.PI * 0.8); ctx.stroke();
  const grad = ctx.createLinearGradient(cx2 - r2, cy2, cx2 + r2, cy2);
  grad.addColorStop(0, C.green); grad.addColorStop(0.5, C.yellow); grad.addColorStop(1, C.pink);
  ctx.strokeStyle = grad; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx2, cy2, r2, -Math.PI * 0.8, -Math.PI * 0.8 + speedRatio * Math.PI * 1.6); ctx.stroke();
  ctx.fillStyle = "rgba(0,245,255,0.7)"; ctx.font = "7px 'Orbitron',monospace";
  ctx.textAlign = "center"; ctx.fillText("KM/H", cx2, cy2 + 3);
  ctx.font = "bold 10px 'Orbitron',monospace"; ctx.fillStyle = C.cyan;
  ctx.fillText(Math.floor(g.speed * 22), cx2, cy2 - 6);
}

function GlowBtn({ children, onClick, color = "#00f5ff", style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "'Orbitron',monospace", fontWeight: 700, letterSpacing: "0.25em",
        border: `1.5px solid ${color}`, background: hov ? color : "transparent",
        color: hov ? "#02020e" : color, cursor: "pointer", transition: "all 0.18s",
        boxShadow: hov ? `0 0 30px ${color},0 0 60px ${color}44` : `0 0 10px ${color}33`,
        textTransform: "uppercase", ...style,
      }}>{children}</button>
  );
}

function TitleScreen({ onStart, leaderboard }) {
  const [diff, setDiff] = useState("pro");
  const [tab, setTab] = useState("play");

  return (
    <div style={{
      width: "100%", maxWidth: W, display: "flex", flexDirection: "column",
      alignItems: "center", padding: "16px 12px",
      fontFamily: "'Share Tech Mono',monospace", color: C.cyan,
    }}>
      <div style={{ position: "relative", marginBottom: 4 }}>
        <div style={{
          fontFamily: "'Orbitron',monospace", fontWeight: 900,
          fontSize: "clamp(2rem,8vw,3.6rem)", letterSpacing: "0.12em", lineHeight: 1,
          color: C.cyan, textShadow: `0 0 20px ${C.cyan},0 0 50px ${C.cyan},0 0 90px rgba(0,245,255,0.25)`,
          animation: "logoFlicker 5s infinite",
        }}>
          NEON<span style={{ color: C.pink, textShadow: `0 0 20px ${C.pink},0 0 50px ${C.pink}` }}>DRIFT</span>
          <span style={{ color: "rgba(0,245,255,0.35)", fontSize: "0.35em", letterSpacing: "0.5em", marginLeft: 6 }}>PRO</span>
        </div>
      </div>
      <div style={{ fontSize: "0.6rem", letterSpacing: "0.5em", color: "rgba(0,245,255,0.3)", marginBottom: 24 }}>
        SEASON 1 · 2026 CHAMPIONSHIP
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid rgba(0,245,255,0.2)", width: "100%" }}>
        {["play", "board"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px 0",
            fontFamily: "'Orbitron',monospace", fontSize: "0.65rem", letterSpacing: "0.2em",
            border: "none", cursor: "pointer", textTransform: "uppercase",
            background: tab === t ? "rgba(0,245,255,0.1)" : "transparent",
            color: tab === t ? C.cyan : "rgba(0,245,255,0.35)",
            borderRight: t === "play" ? "1px solid rgba(0,245,255,0.2)" : "none",
            transition: "all 0.2s",
          }}>{t === "play" ? "▶ RACE" : "🏆 LEADERBOARD"}</button>
        ))}
      </div>

      {tab === "play" && (
        <>
          <div style={{ fontSize: "0.55rem", letterSpacing: "0.35em", color: "rgba(0,245,255,0.35)", marginBottom: 10, fontFamily: "'Orbitron',monospace" }}>
            SELECT DIFFICULTY
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, width: "100%" }}>
            {Object.entries(DIFF).map(([k, v]) => (
              <button key={k} onClick={() => setDiff(k)} style={{
                flex: 1, padding: "10px 4px",
                fontFamily: "'Orbitron',monospace", fontSize: "0.6rem", letterSpacing: "0.1em",
                border: `1.5px solid ${diff === k ? v.color : "rgba(0,245,255,0.15)"}`,
                background: diff === k ? `${v.color}18` : "transparent",
                color: diff === k ? v.color : "rgba(0,245,255,0.35)",
                cursor: "pointer", transition: "all 0.2s", textTransform: "uppercase",
                boxShadow: diff === k ? `0 0 16px ${v.color}44` : "none",
              }}>
                <div>{v.label}</div>
                <div style={{ fontSize: "0.45rem", marginTop: 3, opacity: 0.7 }}>
                  {k === "rookie" ? "5 LIVES" : k === "pro" ? "3 LIVES" : "2 LIVES"}
                </div>
              </button>
            ))}
          </div>
          <GlowBtn onClick={() => onStart(diff)} color={DIFF[diff].color} style={{ fontSize: "0.85rem", padding: "14px 44px", marginBottom: 20 }}>
            START RACE
          </GlowBtn>
          <div style={{ fontSize: "0.6rem", color: "rgba(0,245,255,0.25)", letterSpacing: "0.08em", lineHeight: 2.2, textAlign: "center" }}>
            <span style={{ color: "rgba(0,245,255,0.55)" }}>← → / A D</span> steer &nbsp;·&nbsp; <span style={{ color: "rgba(0,245,255,0.55)" }}>P / SPACE</span> pause<br />
            Collect <span style={{ color: C.yellow }}>coins</span> & <span style={{ color: C.cyan }}>power-ups</span> · Build combos for multipliers
          </div>
        </>
      )}

      {tab === "board" && (
        <div style={{ width: "100%" }}>
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(0,245,255,0.3)", fontSize: "0.7rem", padding: "30px 0" }}>
              No races yet. Get on the track!
            </div>
          ) : (
            leaderboard.map((e, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", marginBottom: 4,
                background: i === 0 ? "rgba(255,190,11,0.08)" : "rgba(0,245,255,0.03)",
                border: `1px solid ${i === 0 ? "rgba(255,190,11,0.3)" : i === 1 ? "rgba(200,200,200,0.2)" : i === 2 ? "rgba(180,120,60,0.2)" : "rgba(0,245,255,0.08)"}`,
              }}>
                <span style={{
                  fontFamily: "'Orbitron',monospace", fontWeight: 700,
                  fontSize: "0.85rem", width: 24, textAlign: "center",
                  color: i === 0 ? C.yellow : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(0,245,255,0.4)",
                }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: "0.7rem", color: C.cyan }}>{e.name}</span>
                <span style={{ fontSize: "0.65rem", color: "rgba(0,245,255,0.5)" }}>{DIFF[e.diff]?.label || e.diff}</span>
                <span style={{ fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: "0.85rem", color: C.yellow }}>{e.score.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HUD({ score, speed, lives, maxLives, coins, combo, multiplier, activeShield, activeNitro, activeMagnet, activeSlow, shieldT, nitroT, magnetT, slowT, diffColor }) {
  return (
    <div style={{
      width: "100%", maxWidth: W, padding: "8px 6px 4px",
      fontFamily: "'Share Tech Mono',monospace",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: "0.48rem", letterSpacing: "0.3em", color: "rgba(0,245,255,0.35)", textTransform: "uppercase" }}>Score</div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: "1.4rem", color: C.cyan, textShadow: `0 0 12px ${C.cyan}`, lineHeight: 1 }}>
            {score.toLocaleString()}
          </div>
          {combo > 1 && <div style={{ fontSize: "0.55rem", color: C.yellow, marginTop: 1 }}>x{multiplier} MULTIPLIER</div>}
        </div>

        {combo > 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.45rem", letterSpacing: "0.2em", color: "rgba(255,190,11,0.5)", textTransform: "uppercase", marginBottom: 2 }}>Combo</div>
            <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: "1.6rem", color: C.yellow, textShadow: `0 0 15px ${C.yellow}`, lineHeight: 1 }}>
              {combo}
            </div>
          </div>
        )}

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.48rem", letterSpacing: "0.3em", color: "rgba(0,245,255,0.35)", textTransform: "uppercase", marginBottom: 2 }}>Lives</div>
          <div style={{ fontSize: "1rem", lineHeight: 1, letterSpacing: 2 }}>
            {Array.from({ length: Math.max(maxLives, 3) }, (_, i) => (
              <span key={i} style={{ color: i < lives ? C.pink : "rgba(255,0,110,0.2)", textShadow: i < lives ? `0 0 8px ${C.pink}` : "none" }}>♥</span>
            ))}
          </div>
          <div style={{ fontSize: "0.48rem", color: C.yellow, marginTop: 1 }}>
            💰 {coins}
          </div>
        </div>
      </div>

      {(activeShield || activeNitro || activeMagnet || activeSlow) && (
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          {[
            { active: activeShield, t: shieldT, type: "shield" },
            { active: activeNitro, t: nitroT, type: "nitro" },
            { active: activeMagnet, t: magnetT, type: "magnet" },
            { active: activeSlow, t: slowT, type: "slow" },
          ].filter(p => p.active).map(p => {
            const cfg = POWERUP_TYPES[p.type];
            return (
              <div key={p.type} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "2px 6px",
                border: `1px solid ${cfg.color}66`, background: `${cfg.color}11`,
                borderRadius: 2,
              }}>
                <span style={{ fontSize: "0.8rem" }}>{cfg.symbol}</span>
                <div style={{ width: 40, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: cfg.color, width: `${(p.t / POWERUP_TYPES[p.type].duration) * 100}%`, transition: "width 0.1s", boxShadow: `0 0 6px ${cfg.color}` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Overlay({ type, score, best, coins, diff, onResume, onMenu, onSubmit, playerName, setPlayerName }) {
  const isOver = type === "gameover";
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = () => { onSubmit(playerName || "PILOT"); setSubmitted(true); };

  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(2,2,14,0.92)", backdropFilter: "blur(6px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 12, zIndex: 10, fontFamily: "'Share Tech Mono',monospace",
    }}>
      <div style={{
        fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: "1.8rem", letterSpacing: "0.2em",
        color: isOver ? C.pink : C.cyan, textShadow: `0 0 20px ${isOver ? C.pink : C.cyan}`,
      }}>{isOver ? "GAME OVER" : "PAUSED"}</div>

      {isOver && (
        <>
          <div style={{ display: "flex", gap: 24, margin: "4px 0" }}>
            {[
              { label: "Score", val: score.toLocaleString(), color: C.cyan },
              { label: "Best", val: best.toLocaleString(), color: C.yellow },
              { label: "Coins", val: coins, color: C.yellow },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.5rem", letterSpacing: "0.25em", color: "rgba(0,245,255,0.35)", textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: "1rem", color, textShadow: `0 0 8px ${color}` }}>{val}</div>
              </div>
            ))}
          </div>

          {!submitted ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%", maxWidth: 220 }}>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.2em", color: "rgba(0,245,255,0.4)" }}>ENTER YOUR NAME</div>
              <input
                maxLength={12}
                value={playerName}
                onChange={e => setPlayerName(e.target.value.toUpperCase())}
                placeholder="PILOT"
                style={{
                  width: "100%", padding: "8px 12px",
                  fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: "0.9rem",
                  background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.3)",
                  color: C.cyan, textAlign: "center", letterSpacing: "0.2em", outline: "none",
                }}
              />
              <GlowBtn onClick={handleSubmit} color={C.yellow} style={{ fontSize: "0.7rem", padding: "8px 28px" }}>
                SUBMIT SCORE
              </GlowBtn>
            </div>
          ) : (
            <div style={{ fontSize: "0.65rem", color: C.green, letterSpacing: "0.15em" }}>✓ SCORE SAVED TO LEADERBOARD</div>
          )}
        </>
      )}

      {!isOver && <div style={{ fontSize: "0.65rem", color: "rgba(0,245,255,0.4)", letterSpacing: "0.12em" }}>Score {score.toLocaleString()}</div>}

      {!isOver && <GlowBtn onClick={onResume} color={C.cyan} style={{ fontSize: "0.75rem", padding: "10px 30px" }}>RESUME</GlowBtn>}
      <GlowBtn onClick={onMenu} color="rgba(0,245,255,0.4)" style={{ fontSize: "0.7rem", padding: "8px 24px" }}>MAIN MENU</GlowBtn>
    </div>
  );
}

export default function NeonDriftPro() {
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const rafRef = useRef(null);
    const mKeys = useRef({ left: false, right: false });
  const [uiState, setUiState] = useState("title");
  const [hud, setHud] = useState({ score: 0, speed: 0, lives: 3, maxLives: 3, coins: 0, combo: 0, multiplier: 1, activeShield: false, activeNitro: false, activeMagnet: false, activeSlow: false, shieldT: 0, nitroT: 0, magnetT: 0, slowT: 0 });
  const bestRef = useRef(lsGet("ndpro_best", 0));
  const leaderboardRef = useRef(lsGet("ndpro_lb", []));
  const [playerName, setPlayerName] = useState("");
  const [scale, setScale] = useState(1);
  const isTouchDev = useRef(false);

  useEffect(() => {
    isTouchDev.current = "ontouchstart" in window;
    const upd = () => setScale(Math.min(1, (window.innerWidth - 16) / W));
    upd(); window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  const startGame = useCallback((diff) => {
    const cfg = DIFF[diff];
    const g = {
      diff, cfg,
      score: 0, speed: cfg.baseSpeed, lives: cfg.lives,
      coins: 0, combo: 0, comboTimer: 0, multiplier: 1,
      frame: 0, flashTimer: 0, invincTimer: 0, roadOffset: 0,
      shieldTimer: 0, nitroTimer: 0, magnetTimer: 0, slowTimer: 0,
      player: { x: W / 2, y: H - 120, w: 30, h: 54, vx: 0 },
      obstacles: [], powerups: [], coinItems: [],
       particles: [], comboTexts: [],
      stars: mkStars(),
      running: true,
    };
     gRef.current = g;
    setPlayerName("");
    setUiState("playing");
  }, []);

  useEffect(() => {
    const dn = e => {
      const g = gRef.current; if (!g) return;
      g.keys = g.keys || {};
      g.keys[e.code] = true;
      if (g.running && (e.code === "Space" || e.code === "KeyP")) {
        g.running = false; setUiState("paused"); cancelAnimationFrame(rafRef.current);
      } else if (!g.running && uiState === "paused" && (e.code === "Space" || e.code === "KeyP")) {
        g.running = true; setUiState("playing");
         }
      if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    };
    const up = e => { if (gRef.current) { gRef.current.keys = gRef.current.keys || {}; gRef.current.keys[e.code] = false; } };
    window.addEventListener("keydown", dn);
     window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, [uiState]);