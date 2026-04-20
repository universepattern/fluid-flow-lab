class FlowRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.nodes = [];
    this.bounds = null;
    this.scale = 100;
    this.offsetX = 0;
    this.offsetY = 0;
    
    // Physics results to modulate rendering
    this.physicsResults = [];
    this.globalMaxV = 1; // avoid div by 0
    this.systemRegime = 'Laminar';

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  }

  updateData(nodes, bounds, physicsResults, maxV, systemRegime) {
    this.nodes = nodes;
    this.bounds = bounds;
    this.physicsResults = physicsResults;
    this.globalMaxV = maxV || 1;
    this.systemRegime = systemRegime;
    this.computeTransform();
    
    // Clear particles if path changes significantly
    this.particles = [];
  }

  computeTransform() {
    if (!this.bounds) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    const bw = this.bounds.maxX - this.bounds.minX;
    const bh = this.bounds.maxY - this.bounds.minY;
    
    // Add padded margins
    const margin = 100;
    
    const scaleX = (w - margin * 2) / (bw || 1);
    const scaleY = (h - margin * 2) / (bh || 1);
    
    this.scale = Math.min(scaleX, scaleY, 200); // cap max scale
    if(this.scale <= 0) this.scale = 100;

    this.offsetX = (w - bw * this.scale) / 2 - this.bounds.minX * this.scale;
    this.offsetY = (h - bh * this.scale) / 2 - this.bounds.minY * this.scale;
  }

  transformToScreen(x, y) {
    return {
      sx: x * this.scale + this.offsetX,
      sy: y * this.scale + this.offsetY
    };
  }

  drawPipeBoundaries() {
    const ctx = this.ctx;
    if (this.nodes.length < 2) return;

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    // Draw top boundary
    ctx.beginPath();
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const r = (node.diameter / 2) * this.scale;
      // Perpendicular vector
      const nx = -Math.sin(node.angle) * r;
      const ny = Math.cos(node.angle) * r;
      
      const { sx, sy } = this.transformToScreen(node.x, node.y);
      if (i === 0) ctx.moveTo(sx + nx, sy + ny);
      else ctx.lineTo(sx + nx, sy + ny);
    }
    ctx.stroke();

    // Draw bottom boundary
    ctx.beginPath();
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const r = (node.diameter / 2) * this.scale;
      const nx = Math.sin(node.angle) * r;
      const ny = -Math.cos(node.angle) * r;
      
      const { sx, sy } = this.transformToScreen(node.x, node.y);
      if (i === 0) ctx.moveTo(sx + nx, sy + ny);
      else ctx.lineTo(sx + nx, sy + ny);
    }
    ctx.stroke();
    
    // Draw connections / shapes for valves
    for(let i=0; i < this.nodes.length; i++) {
      let n = this.nodes[i];
      if(n.component && n.component.type === 'valve') {
         const r = (n.diameter/2) * this.scale;
         const { sx, sy } = this.transformToScreen(n.x, n.y);
         ctx.fillStyle = '#f87171';
         ctx.beginPath();
         // simple bowtie shape
         ctx.moveTo(sx - r, sy - r);
         ctx.lineTo(sx + r, sy + r);
         ctx.lineTo(sx + r, sy - r);
         ctx.lineTo(sx - r, sy + r);
         ctx.fill();
      }
    }
  }

  updateAndDrawParticles(dt) {
    if (this.nodes.length < 2) return;

    const ctx = this.ctx;
    
    // Total path duration mapping (approximate length via index)
    // To make it physically intuitive, particle speed is determined by velocity at parameter t.
    // However, nodes array has exact path lengths. We will use node indices as a proxy for progress along the path.

    // Spawn new particles
    if (Math.random() < 0.6) {
      const rOffset = (Math.random() - 0.5) * 0.9; // relative to radius
      this.particles.push({
        nodeIdx: 0,
        rOffset: rOffset, // stays parallel in laminar
        life: 0 // sub-node progress (0 to 1)
      });
    }

    // Keep particles array size manageable
    if (this.particles.length > 300) {
      this.particles.shift();
    }

    // Update and draw
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      let node1 = this.nodes[Math.floor(p.nodeIdx)];
      let nodeIdx2 = Math.floor(p.nodeIdx) + 1;
      
      if (nodeIdx2 >= this.nodes.length) {
        this.particles.splice(i, 1);
        continue;
      }
      
      let node2 = this.nodes[nodeIdx2];
      
      // Determine local velocity 
      // Approximate physical speed or make it visual. We'll make it visual proportional to v
      // Map node index back to physics component to get velocity
      let comp = node1.component;
      let localV = 1;
      let localRe = 1000;
      let phys = this.physicsResults.find(r => r.component === comp);
      if (phys) {
        localV = phys.velocity;
        localRe = phys.Re;
      }

      // Base visual speed
      let baseSpeed = (localV / this.globalMaxV) * 0.15; 
      // Clamp speed
      baseSpeed = Math.max(0.02, Math.min(baseSpeed, 0.5));
      p.life += baseSpeed * (dt / 16);

      if (p.life >= 1) {
        p.nodeIdx++;
        p.life -= 1;
      }

      // If finished path
      if (Math.floor(p.nodeIdx) + 1 >= this.nodes.length) {
        this.particles.splice(i, 1);
        continue;
      }

      node1 = this.nodes[Math.floor(p.nodeIdx)];
      node2 = this.nodes[Math.floor(p.nodeIdx) + 1];

      // Interpolate position
      const x = node1.x + (node2.x - node1.x) * p.life;
      const y = node1.y + (node2.y - node1.y) * p.life;
      const d = node1.diameter + (node2.diameter - node1.diameter) * p.life;
      
      // Angle interpolation
      const dx = node2.x - node1.x;
      const dy = node2.y - node1.y;
      const angle = Math.atan2(dy, dx);

      // Turbulence effect
      if (localRe > 2300) {
        // add jitter
        p.rOffset += (Math.random() - 0.5) * 0.05;
        // Clamp to edges
        if (p.rOffset > 0.9) p.rOffset = 0.9;
        if (p.rOffset < -0.9) p.rOffset = -0.9;
      }

      const r = (d / 2);
      const px = x + (-Math.sin(angle) * r * p.rOffset);
      const py = y + (Math.cos(angle) * r * p.rOffset);

      const { sx, sy } = this.transformToScreen(px, py);

      // Draw
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      
      // Color depends on speed
      const hue = 240 - (localV / this.globalMaxV) * 240; // 240 is blue, 0 is red
      ctx.fillStyle = `hsla(${Math.max(0, hue)}, 100%, 60%, 0.8)`;
      ctx.fill();
    }
  }

  draw(dt) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawPipeBoundaries();
    this.updateAndDrawParticles(dt);
  }
}

window.FlowRenderer = FlowRenderer;
