class FlowRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.heatmapMode = 'velocity'; // 'velocity' or 'pressure'
    this.particles = [];
  }

  setHeatmapMode(mode) {
    this.heatmapMode = mode;
  }

  draw(graph, physicsResults, dt) {
    const ctx = this.ctx;
    const { nodes, edges, scale } = graph;
    
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (nodes.length === 0) return;

    // Determine max/min for heatmaps
    let maxV = 1e-6, minV = 0;
    let maxP = -Infinity, minP = Infinity;
    
    physicsResults.forEach(r => {
      if (r.velocity > maxV) maxV = r.velocity;
      if (r.inletP > maxP) maxP = r.inletP;
      if (r.outletP > maxP) maxP = r.outletP;
      if (r.inletP < minP) minP = r.inletP;
      if (r.outletP < minP) minP = r.outletP;
    });
    if (maxP === minP) maxP = minP + 1;

    const getColor = (val, min, max) => {
      const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
      // Blue (240) to Red (0)
      const hue = 240 * (1 - t);
      return `hsl(${hue}, 90%, 50%)`;
    };

    // Draw Edges (Pipes)
    for (const edge of edges) {
      const n1 = nodes.find(n => n.id === edge.from);
      const n2 = nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) continue;

      const phys = physicsResults.find(r => r.edgeId === edge.id);
      
      const pxDiameter = (edge.diameter / scale);
      
      ctx.lineWidth = Math.max(4, pxDiameter);
      ctx.lineCap = 'round';

      if (phys && this.heatmapMode === 'velocity') {
        ctx.strokeStyle = getColor(phys.velocity, minV, maxV);
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      } 
      else if (phys && this.heatmapMode === 'pressure') {
        const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
        grad.addColorStop(0, getColor(phys.inletP, minP, maxP));
        grad.addColorStop(1, getColor(phys.outletP, minP, maxP));
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      }
      else {
        ctx.strokeStyle = '#4A382F';
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      }
      
      // Draw inner hollow look if big enough
      if (pxDiameter > 8) {
         ctx.lineWidth = pxDiameter - 4;
         ctx.strokeStyle = '#271D18';
         if (phys) {
            ctx.globalAlpha = 0.5; // see through to heatmap
         }
         ctx.beginPath();
         ctx.moveTo(n1.x, n1.y);
         ctx.lineTo(n2.x, n2.y);
         ctx.stroke();
         ctx.globalAlpha = 1.0;
      }
    }

    // Draw Nodes
    for (const n of nodes) {
      ctx.fillStyle = '#FB923C';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 6, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#271D18';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw selection highlights
    // from global UI or injected. We'll just draw a highlight if graph logic says it's hovered/selected
    // Since graph has hoverNodeId, selectedNodeId, we pass graph state.
    // However, sketch engine isn't strictly passing those states in getGraph(). We should reach into sketch or pass it.
    // For now we'll do it in main loop by passing sketch directly or attaching.
  }

  drawParticles(graph, physicsResults, dt) {
    const { nodes, edges } = graph;
    if (edges.length === 0) return;
    
    const ctx = this.ctx;

    // Spawn Particles
    if (Math.random() < 0.3) {
      const firstEdge = edges[0];
      if (firstEdge) {
        this.particles.push({
          edgeIdx: 0,
          progress: 0, // 0 to 1
          rOffset: (Math.random() - 0.5) * 0.8
        });
      }
    }

    if (this.particles.length > 200) this.particles.shift();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      let edge = edges[p.edgeIdx];
      
      if (!edge) {
        this.particles.splice(i, 1);
        continue;
      }
      
      let phys = physicsResults.find(r => r.edgeId === edge.id);
      let V = phys ? phys.velocity : 1;
      let Re = phys ? phys.Re : 1000;
      
      // Speed depends on velocity
      const pixelDist = phys ? (phys.length / graph.scale) : 100;
      // pixels per second = V / scale. progress per second = (V/scale) / pixelDist
      let progressSpeed = (V / graph.scale) / pixelDist; 
      
      // scale dt (ms)
      p.progress += progressSpeed * (dt / 1000);
      
      if (p.progress >= 1) {
        p.edgeIdx++;
        p.progress -= 1;
        if (p.edgeIdx >= edges.length) {
          this.particles.splice(i, 1);
          continue;
        }
        edge = edges[p.edgeIdx];
      }
      
      let n1 = nodes.find(n => n.id === edge.from);
      let n2 = nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) continue;

      const pxX = n1.x + (n2.x - n1.x) * p.progress;
      const pxY = n1.y + (n2.y - n1.y) * p.progress;

      const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
      
      if (Re > 2300) {
        p.rOffset += (Math.random() - 0.5) * 0.1;
        p.rOffset = Math.max(-0.8, Math.min(0.8, p.rOffset));
      }

      const rPixels = (edge.diameter / graph.scale) / 2;
      const finalX = pxX - Math.sin(angle) * rPixels * p.rOffset;
      const finalY = pxY + Math.cos(angle) * rPixels * p.rOffset;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(finalX, finalY, 2, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

window.FlowRenderer = FlowRenderer;
