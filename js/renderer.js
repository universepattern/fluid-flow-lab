class FlowRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.heatmapMode = 'velocity'; // 'velocity' or 'pressure'
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight - 60; // leave room for toolbar
  }

  setMode(mode) {
    this.heatmapMode = mode;
  }

  getColor(val, min, max) {
    if (max === min) return `hsl(45, 90%, 50%)`;
    const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
    const hue = 45 * (1 - t);
    return `hsl(${hue}, 90%, 50%)`;
  }

  draw(params, physicsData) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.clearRect(0, 0, w, h);

    if (!physicsData || !physicsData.segments || physicsData.segments.length === 0) {
      return; 
    }

    const segments = physicsData.segments;
    const dStart = params.dStart;
    const dEnd = params.dEnd;
    const maxDiameter = Math.max(dStart, dEnd);
    
    // Layout constraints
    const padX = 50;
    const padY = 50;
    const availableW = w - (padX * 2);
    const availableH = h - (padY * 2);
    
    // Scale: map maxDiameter to availableH
    const scale = availableH / maxDiameter;
    const CenterY = h / 2;

    // Determine min/max for color scaling
    let minColorVal = Infinity;
    let maxColorVal = -Infinity;

    for (let s of segments) {
      let val = this.heatmapMode === 'velocity' ? s.velocity : s.cumulativeDrop;
      if (val < minColorVal) minColorVal = val;
      if (val > maxColorVal) maxColorVal = val;
    }

    // Force 0 min for pressure drop to show accumulation from inlet
    if (this.heatmapMode === 'pressure') {
      minColorVal = 0;
    }

    const segW = availableW / segments.length;

    // Draw segment by segment
    for (let i = 0; i < segments.length; i++) {
       const s = segments[i];
       
       // Calculate explicit trapezoid coordinates for this segment to perfectly tile
       const fraction1 = i / segments.length;
       const fraction2 = (i + 1) / segments.length;
       
       const d1 = dStart + (dEnd - dStart) * fraction1;
       const d2 = dStart + (dEnd - dStart) * fraction2;

       const r1 = (d1 * scale) / 2;
       const r2 = (d2 * scale) / 2;

       const x1 = padX + i * segW;
       const x2 = padX + (i + 1) * segW;

       const val = this.heatmapMode === 'velocity' ? s.velocity : s.cumulativeDrop;
       const color = this.getColor(val, minColorVal, maxColorVal);

       ctx.fillStyle = color;
       ctx.beginPath();
       ctx.moveTo(x1, CenterY - r1);
       ctx.lineTo(x2, CenterY - r2);
       ctx.lineTo(x2, CenterY + r2);
       ctx.lineTo(x1, CenterY + r1);
       ctx.closePath();
       ctx.fill();
       
       // Add subtle segment divider lines
       ctx.strokeStyle = 'rgba(0,0,0,0.2)';
       ctx.lineWidth = 1;
       ctx.stroke();
    }
    
    // Draw thick border around the entire pipe
    ctx.strokeStyle = '#FDBA74'; // warm accent
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Top border
    ctx.moveTo(padX, CenterY - (dStart * scale / 2));
    ctx.lineTo(padX + availableW, CenterY - (dEnd * scale / 2));
    ctx.stroke();
    
    ctx.beginPath();
    // Bottom border
    ctx.moveTo(padX, CenterY + (dStart * scale / 2));
    ctx.lineTo(padX + availableW, CenterY + (dEnd * scale / 2));
    ctx.stroke();

    // Draw inlet / outlet caps
    ctx.beginPath();
    ctx.moveTo(padX, CenterY - (dStart * scale / 2));
    ctx.lineTo(padX, CenterY + (dStart * scale / 2));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padX + availableW, CenterY - (dEnd * scale / 2));
    ctx.lineTo(padX + availableW, CenterY + (dEnd * scale / 2));
    ctx.stroke();
  }
}

window.FlowRenderer = FlowRenderer;
