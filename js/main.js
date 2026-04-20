const APP = {
  sketch: null,
  physics: null,
  renderer: null,
  pChart: null,
  vChart: null,

  params: {
    fluidType: 'water',
    rho: 998,
    mu: 0.001001,
    q: 0.01,
    inletPressure: 101325
  },

  physicsResults: [],

  init() {
    this.sketch = new SketchEngine('sketch-canvas');
    this.physics = new PhysicsEngine();
    this.renderer = new FlowRenderer('sketch-canvas');
    this.pChart = new LightweightChart('pressure-chart');
    this.vChart = new LightweightChart('velocity-chart');

    ui.init(this.sketch);

    this.sketch.onGeometryChange = () => this.recalculate();

    this.bindGlobals();
    this.bindPresets();
    this.bindToolbar();
    this.bindExport();

    // Start with a basic layout
    this.sketch.loadPreset('straight');

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  },

  bindGlobals() {
    const bindInput = (id, key) => {
      document.getElementById(id).addEventListener('change', (e) => {
        this.params[key] = parseFloat(e.target.value);
        this.recalculate();
      });
    };

    bindInput('global-rho', 'rho');
    bindInput('global-mu', 'mu');
    bindInput('global-q', 'q');
    bindInput('global-p', 'inletPressure');

    document.getElementById('fluid-type').addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'water') {
        document.getElementById('global-rho').value = 998;
        document.getElementById('global-mu').value = 0.001001;
      } else if (val === 'air') {
        document.getElementById('global-rho').value = 1.225;
        document.getElementById('global-mu').value = 0.0000181;
      } else if (val === 'oil') {
        document.getElementById('global-rho').value = 850;
        document.getElementById('global-mu').value = 0.04;
      }
      this.params.fluidType = val;
      this.params.rho = parseFloat(document.getElementById('global-rho').value);
      this.params.mu = parseFloat(document.getElementById('global-mu').value);
      this.recalculate();
    });
  },

  bindPresets() {
    document.getElementById('pres-straight').onclick = () => this.sketch.loadPreset('straight');
    document.getElementById('pres-venturi').onclick = () => this.sketch.loadPreset('venturi');
    document.getElementById('btn-clear').onclick = () => this.sketch.clear();
  },

  bindToolbar() {
    const btnV = document.getElementById('btn-heatmap-v');
    const btnP = document.getElementById('btn-heatmap-p');

    btnV.onclick = () => {
      this.renderer.setHeatmapMode('velocity');
      btnV.classList.add('active');
      btnP.classList.remove('active');
    };

    btnP.onclick = () => {
      this.renderer.setHeatmapMode('pressure');
      btnP.classList.add('active');
      btnV.classList.remove('active');
    };
  },

  bindExport() {
    document.getElementById('export-pdf').onclick = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("AeroFlow Sketch Lab - Engineering Report", 14, 20);
      
      doc.setFontSize(11);
      doc.text(`Fluid Density: ${this.params.rho} kg/m3`, 14, 30);
      doc.text(`Fluid Viscosity: ${this.params.mu} Pa*s`, 14, 36);
      doc.text(`Inlet Flow Rate: ${this.params.q} m3/s`, 14, 42);
      doc.text(`Total Pressure Drop: ${this.physics.totalPressureDrop.toFixed(2)} Pa`, 14, 48);
      doc.text(`System Flow Regime: ${this.physics.systemRegime}`, 14, 54);

      // Snapshot
      const canvas = document.getElementById('sketch-canvas');
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 65, 180, 90);

      // Node and Edge output list
      doc.text("Graph Details:", 14, 165);
      const graph = this.sketch.getGraph();
      
      doc.setFontSize(9);
      let pY = 175;
      graph.edges.forEach((e) => {
        const phys = this.physicsResults.find(r => r.edgeId === e.id);
        if (phys) {
           doc.text(`Pipe ${e.id} [Node ${e.from} -> Node ${e.to}]: Dia=${e.diameter}m, L=${phys.length.toFixed(2)}m, V=${phys.velocity.toFixed(2)}m/s, dP=${phys.totalDrop.toFixed(2)}Pa, Re=${phys.Re.toFixed(0)}`, 14, pY);
           pY += 6;
        }
      });

      doc.save("AeroFlow_Report.pdf");
    };
  },

  recalculate() {
    const graph = this.sketch.getGraph();
    this.physicsResults = this.physics.solve(graph, this.params);

    // Update Stats
    document.getElementById('stat-vmax').innerText = `${this.physics.globalMaxV.toFixed(2)} m/s`;
    document.getElementById('stat-drop').innerText = `${this.physics.totalPressureDrop.toFixed(2)} Pa`;
    const regEl = document.getElementById('stat-regime');
    regEl.innerText = this.physics.systemRegime;
    regEl.className = `badge ${this.physics.systemRegime.toLowerCase()}`;

    // Update Charts
    const pData = [];
    const vData = [];
    
    this.physicsResults.forEach(r => {
      pData.push({ x: r.distanceStart, y: r.inletP });
      vData.push({ x: r.distanceStart, y: r.velocity });
      pData.push({ x: r.distanceEnd, y: r.outletP });
      vData.push({ x: r.distanceEnd, y: r.velocity });
    });

    this.pChart.draw(pData, 'Pressure (Pa)', '#EF4444');
    this.vChart.draw(vData, 'Velocity (m/s)', '#FB923C');
  },

  loop(time) {
    const dt = time - this.lastTime;
    this.lastTime = time;

    const graph = this.sketch.getGraph();
    this.renderer.draw(graph, this.physicsResults, dt);
    this.renderer.drawParticles(graph, this.physicsResults, dt);

    // Highlight hovered/selected
    const highlight = (id, type) => {
       if(!id) return;
       const ctx = this.renderer.ctx;
       ctx.strokeStyle = '#FB923C';
       ctx.lineWidth = 2;
       
       if (type === 'node') {
          const n = graph.nodes.find(x => x.id === id);
          if (n) {
             ctx.beginPath(); ctx.arc(n.x, n.y, 10, 0, Math.PI*2); ctx.stroke();
          }
       } else if (type === 'edge') {
          const e = graph.edges.find(x => x.id === id);
          if (e) {
             const n1 = graph.nodes.find(x => x.id === e.from);
             const n2 = graph.nodes.find(x => x.id === e.to);
             if (n1 && n2) {
                const rx = (e.diameter / graph.scale)/2 + 4;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                // Draw surrounding dashed box or line
                ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y);
                ctx.stroke();
                ctx.setLineDash([]);
             }
          }
       }
    };

    highlight(this.sketch.hoverNodeId, 'node');
    highlight(this.sketch.hoverEdgeId, 'edge');
    if (this.sketch.selectedNodeId) highlight(this.sketch.selectedNodeId, 'node');
    if (this.sketch.selectedEdgeId) highlight(this.sketch.selectedEdgeId, 'edge');

    requestAnimationFrame(this.loop.bind(this));
  }
};

window.onload = () => APP.init();
