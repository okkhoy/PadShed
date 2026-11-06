const HAND_COLORS = {
  R: { solid: "#fb7185", rgb: "251, 113, 133" },
  L: { solid: "#38bdf8", rgb: "56, 189, 248" },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class StrokeVisualizer {
  constructor(canvas, { getTime, getBpm } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.getTime = getTime ?? (() => performance.now() / 1000);
    this.getBpm = getBpm ?? (() => 80);
    this.events = [];
    this.ripples = [];
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.running = false;
    this.frameId = null;
    this.resizeObserver = null;
    this._loop = this._loop.bind(this);

    this._observeResize();
    this._resizeCanvas();
    this._draw();
  }

  addEvent(event) {
    this.events.push(event);
    if (this.events.length > 512) {
      const now = this.getTime();
      this.events = this.events.filter((item) => item.time > now - 1);
    }
  }

  hit(event) {
    const now = this.getTime();
    this.ripples.push({
      hand: event.hand,
      accent: event.accent,
      isDownbeat: event.isDownbeat,
      time: now,
    });
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.frameId = window.requestAnimationFrame(this._loop);
  }

  reset() {
    this.running = false;
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.events = [];
    this.ripples = [];
    this._drawIdle();
  }

  _loop() {
    if (!this.running) {
      return;
    }
    this._resizeCanvas();
    this._draw();
    this.frameId = window.requestAnimationFrame(this._loop);
  }

  _observeResize() {
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", () => {
        this._resizeCanvas();
        if (!this.running) {
          this._drawIdle();
        }
      });
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this._resizeCanvas();
      if (!this.running) {
        this._drawIdle();
      }
    });
    this.resizeObserver.observe(this.canvas);
  }

  _resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(rect.width * dpr);
    const pixelHeight = Math.round(rect.height * dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = dpr;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _geometry() {
    return {
      hitX: clamp(this.width * 0.17, 66, 118),
      laneR: this.height * 0.36,
      laneL: this.height * 0.69,
      top: 24,
      bottom: this.height - 24,
    };
  }

  _travelTime(bpm) {
    return clamp(3.32 - (bpm - 40) * 0.0105, 1.2, 3.32);
  }

  _drawIdle() {
    this._draw(true);
  }

  _draw(idle = false) {
    const ctx = this.context;
    if (!this.width || !this.height) {
      return;
    }

    const { hitX, laneR, laneL, top, bottom } = this._geometry();
    const now = idle ? 0 : this.getTime();
    const bpm = this.getBpm() || 80;
    const travel = this._travelTime(bpm);

    ctx.clearRect(0, 0, this.width, this.height);
    this._drawAtmosphere(ctx, laneR, laneL);

    if (!idle) {
      this._drawBeatLines(ctx, now, travel, hitX, top, bottom);
      this._drawEvents(ctx, now, travel, hitX, laneR, laneL);
    } else {
      this._drawIdleGrid(ctx, hitX, top, bottom, laneR, laneL);
    }

    this._drawHitLine(ctx, hitX, top, bottom);
    this._drawLaneLabels(ctx, laneR, laneL);

    if (!idle) {
      this._drawRipples(ctx, now, hitX, laneR, laneL);
      this.events = this.events.filter((event) => event.time > now - 0.75);
    }
  }

  _drawAtmosphere(ctx, laneR, laneL) {
    const width = this.width;
    const height = this.height;
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "rgba(13, 18, 27, 0.96)");
    background.addColorStop(0.5, "rgba(8, 12, 18, 0.98)");
    background.addColorStop(1, "rgba(11, 16, 24, 0.98)");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const rightGlow = ctx.createRadialGradient(width * 0.72, laneR, 0, width * 0.72, laneR, width * 0.36);
    rightGlow.addColorStop(0, "rgba(251, 113, 133, 0.075)");
    rightGlow.addColorStop(1, "rgba(251, 113, 133, 0)");
    ctx.fillStyle = rightGlow;
    ctx.fillRect(0, 0, width, height);

    const leftGlow = ctx.createRadialGradient(width * 0.78, laneL, 0, width * 0.78, laneL, width * 0.34);
    leftGlow.addColorStop(0, "rgba(56, 189, 248, 0.07)");
    leftGlow.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.065)";
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 7]);
    ctx.beginPath();
    ctx.moveTo(0, laneR);
    ctx.lineTo(width, laneR);
    ctx.moveTo(0, laneL);
    ctx.lineTo(width, laneL);
    ctx.stroke();
    ctx.restore();

    const divider = ctx.createLinearGradient(0, 0, width, 0);
    divider.addColorStop(0, "rgba(255,255,255,0)");
    divider.addColorStop(0.5, "rgba(255,255,255,0.075)");
    divider.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = divider;
    ctx.beginPath();
    ctx.moveTo(0, this.height / 2);
    ctx.lineTo(width, this.height / 2);
    ctx.stroke();
  }

  _drawBeatLines(ctx, now, travel, hitX, top, bottom) {
    const width = this.width;
    for (const event of this.events) {
      if (!event.isBeat) {
        continue;
      }
      const remaining = event.time - now;
      if (remaining < -0.08 || remaining > travel) {
        continue;
      }
      const progress = 1 - remaining / travel;
      const x = hitX + (remaining / travel) * (width - hitX - 34);
      const alpha = clamp(0.08 + progress * 0.28, 0.08, 0.36);
      ctx.save();
      ctx.strokeStyle = event.isDownbeat
        ? `rgba(245, 165, 36, ${alpha + 0.14})`
        : `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = event.isDownbeat ? 1.5 : 1;
      ctx.setLineDash(event.isDownbeat ? [3, 5] : [1, 7]);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawEvents(ctx, now, travel, hitX, laneR, laneL) {
    const width = this.width;
    for (const event of this.events) {
      const remaining = event.time - now;
      if (remaining > travel || remaining < -0.55) {
        continue;
      }

      const laneY = event.hand === "L" ? laneL : laneR;
      const color = HAND_COLORS[event.hand] ?? HAND_COLORS.R;
      const x = hitX + (remaining / travel) * (width - hitX - 34);
      const near = clamp(1 - remaining / travel, 0, 1);
      const afterHit = remaining < 0 ? clamp(1 + remaining / 0.55, 0, 1) : 1;
      const alpha = (0.22 + near * 0.78) * afterHit;
      const radius = event.accent ? 10.5 : 7.5;

      ctx.save();
      ctx.globalAlpha = alpha;

      for (let index = 0; index < (event.graces?.length ?? 0); index += 1) {
        const graceX = x - 8 - index * 6;
        const graceY = laneY - 12 - index * 2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color.rgb}, 0.7)`;
        ctx.arc(graceX, graceY, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowColor = color.solid;
      ctx.shadowBlur = event.accent ? 20 : 10;
      const gradient = ctx.createRadialGradient(
        x - radius * 0.35,
        laneY - radius * 0.4,
        1,
        x,
        laneY,
        radius,
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.85)");
      gradient.addColorStop(0.32, color.solid);
      gradient.addColorStop(1, `rgba(${color.rgb}, 0.25)`);
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, laneY, radius, 0, Math.PI * 2);
      ctx.fill();

      if (event.accent) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color.rgb}, 0.65)`;
        ctx.lineWidth = 1.3;
        ctx.arc(x, laneY, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (event.buzz) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.arc(x, laneY, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(10, 14, 20, 0.85)";
      ctx.font = `${event.accent ? "700 10px" : "700 9px"} "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(event.hand, x, laneY + 0.5);
      ctx.restore();
    }
  }

  _drawIdleGrid(ctx, hitX, top, bottom, laneR, laneL) {
    ctx.save();
    const spacing = 58;
    const offset = (this.width - hitX) % spacing;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 1;
    for (let x = hitX + offset; x < this.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    [laneR, laneL].forEach((y, index) => {
      const color = index === 0 ? HAND_COLORS.R : HAND_COLORS.L;
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color.solid;
      ctx.beginPath();
      ctx.arc(hitX + 46 + index * 22, y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  _drawHitLine(ctx, hitX, top, bottom) {
    const width = this.width;
    ctx.save();
    const glow = ctx.createLinearGradient(hitX - 16, 0, hitX + 16, 0);
    glow.addColorStop(0, "rgba(245, 165, 36, 0)");
    glow.addColorStop(0.5, "rgba(245, 165, 36, 0.16)");
    glow.addColorStop(1, "rgba(245, 165, 36, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(hitX - 16, top, 32, bottom - top);

    ctx.strokeStyle = "rgba(246, 183, 60, 0.82)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hitX, top);
    ctx.lineTo(hitX, bottom);
    ctx.stroke();

    ctx.fillStyle = "rgba(246, 183, 60, 0.9)";
    ctx.beginPath();
    ctx.moveTo(hitX, top - 2);
    ctx.lineTo(hitX - 4, top - 9);
    ctx.lineTo(hitX + 4, top - 9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hitX, bottom + 2);
    ctx.lineTo(hitX - 4, bottom + 9);
    ctx.lineTo(hitX + 4, bottom + 9);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 1;
    for (let x = 24; x < width; x += 58) {
      ctx.moveTo(x, this.height - 13);
      ctx.lineTo(x + 22, this.height - 13);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawLaneLabels(ctx, laneR, laneL) {
    const labels = [
      { hand: "R", y: laneR, color: HAND_COLORS.R },
      { hand: "L", y: laneL, color: HAND_COLORS.L },
    ];

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const label of labels) {
      ctx.font = '700 26px "Barlow Condensed", sans-serif';
      ctx.fillStyle = `rgba(${label.color.rgb}, 0.22)`;
      ctx.fillText(label.hand, 20, label.y + 1);
    }
    ctx.font = '600 8px "DM Sans", sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.letterSpacing = "0.16em";
    ctx.fillText("RIGHT", 44, laneR + 1);
    ctx.fillText("LEFT", 44, laneL + 1);
    ctx.restore();
  }

  _drawRipples(ctx, now, hitX, laneR, laneL) {
    this.ripples = this.ripples.filter((ripple) => now - ripple.time < 0.5);

    ctx.save();
    for (const ripple of this.ripples) {
      const progress = clamp((now - ripple.time) / 0.5, 0, 1);
      const laneY = ripple.hand === "L" ? laneL : laneR;
      const color = HAND_COLORS[ripple.hand] ?? HAND_COLORS.R;
      const alpha = (1 - progress) * (ripple.accent ? 0.82 : 0.5);

      const glow = ctx.createLinearGradient(hitX - 34, 0, hitX + 46, 0);
      glow.addColorStop(0, `rgba(${color.rgb}, 0)`);
      glow.addColorStop(0.45, `rgba(${color.rgb}, ${alpha * 0.32})`);
      glow.addColorStop(1, `rgba(${color.rgb}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(hitX - 34, laneY - 19, 80, 38);

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${color.rgb}, ${alpha})`;
      ctx.lineWidth = ripple.accent ? 2.2 : 1.5;
      ctx.arc(hitX, laneY, 7 + progress * (ripple.accent ? 36 : 27), 0, Math.PI * 2);
      ctx.stroke();

      if (ripple.isDownbeat) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(246, 183, 60, 0.5)";
        ctx.lineWidth = 1;
        ctx.moveTo(hitX, laneY - 23);
        ctx.lineTo(hitX, laneY + 23);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
