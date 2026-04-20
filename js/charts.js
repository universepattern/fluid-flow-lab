class LightweightChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight - 30; // minus title height
  }

  draw(data, ylabel, color) {
    // data = [{x, y}]
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    if (!data || data.length === 0) return;

    let minX = data[0].x, maxX = data[data.length - 1].x;
    let minY = data[0].y, maxY = data[0].y;
    
    data.forEach(d => {
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    // Provide some padding
    const pad = 20;
    const innerW = w - pad * 2 - 30; // leave space for y-axis labels
    const innerH = h - pad * 2;

    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;

    const getX = val => pad + 30 + ((val - minX) / rangeX) * innerW;
    const getY = val => h - pad - ((val - minY) / rangeY) * innerH;

    // Draw axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad + 30, pad);
    ctx.lineTo(pad + 30, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    for (let i = 1; i < 4; i++) {
        const yLine = h - pad - (innerH * (i / 4));
        ctx.beginPath();
        ctx.moveTo(pad + 30, yLine);
        ctx.lineTo(w - pad, yLine);
        ctx.stroke();
    }

    // Y labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.fillText((maxY).toFixed(1), pad + 25, pad + 10);
    ctx.fillText((minY).toFixed(1), pad + 25, h - pad);

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    data.forEach((d, i) => {
      if (i === 0) ctx.moveTo(getX(d.x), getY(d.y));
      else ctx.lineTo(getX(d.x), getY(d.y));
    });
    ctx.stroke();

    // Fill under line
    ctx.lineTo(getX(maxX), getY(minY));
    ctx.lineTo(getX(minX), getY(minY));
    ctx.closePath();
    
    const grad = ctx.createLinearGradient(0, pad, 0, h - pad);
    grad.addColorStop(0, color + '66'); // 40% opacity
    grad.addColorStop(1, color + '00'); // 0% opacity
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

window.LightweightChart = LightweightChart;
