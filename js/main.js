const APP = {
  geo: new GeometryEngine(),
  physics: new PhysicsEngine(),
  renderer: null,
  pChart: null,
  vChart: null,
  
  params: {
    fluidType: 'water',
    inletVelocity: 2,
    inletPressure: 101325
  },
  
  lastPhysicsResults: null,
  
  init() {
    this.renderer = new FlowRenderer('flow-canvas');
    this.pChart = new LightweightChart('pressure-chart');
    this.vChart = new LightweightChart('velocity-chart');
    
    // Setup UI bindings
    ui.onComponentsChange = (comps) => this.recalculate(comps);
    ui.init();
    
    // Bind globals
    this.bindGlobals();
    this.bindPresets();
    this.bindExport();
    
    // Initial calc
    this.recalculate(ui.components);
    
    // Animation loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  },
  
  bindGlobals() {
    const attachRange = (id, key, unit) => {
      const el = document.getElementById(id);
      const disp = document.getElementById(`${id}-val`);
      el.addEventListener('input', (e) => {
        this.params[key] = parseFloat(e.target.value);
        disp.innerText = `${this.params[key]} ${unit}`;
        this.recalculate(ui.components);
      });
    };
    
    attachRange('inlet-velocity', 'inletVelocity', 'm/s');
    attachRange('inlet-pressure', 'inletPressure', 'Pa');
    
    document.getElementById('fluid-type').addEventListener('change', (e) => {
      this.params.fluidType = e.target.value;
      this.recalculate(ui.components);
    });
  },
  
  bindPresets() {
    document.getElementById('pres-straight').onclick = () => {
      ui.components = [ { type: 'pipe', id: 'Pipe 1', length: 20, diameter: 0.1 } ];
      ui.updateAll();
    };
    
    document.getElementById('pres-venturi').onclick = () => {
      ui.components = [ 
        { type: 'pipe', id: 'Inlet Pipe', length: 5, diameter: 0.2 },
        { type: 'contraction', id: 'Throat In', length: 1.5, d2: 0.05 },
        { type: 'pipe', id: 'Throat', length: 3, diameter: 0.05 },
        { type: 'contraction', id: 'Throat Out', length: 2, d2: 0.2 },
        { type: 'pipe', id: 'Outlet Pipe', length: 5, diameter: 0.2 }
      ];
      ui.updateAll();
    };
    
    document.getElementById('pres-bends').onclick = () => {
      ui.components = [ 
        { type: 'pipe', id: 'Pipe 1', length: 3, diameter: 0.1 },
        { type: 'bend', id: 'Bend 1', angle: 90, radius: 1, diameter: 0.1 },
        { type: 'pipe', id: 'Pipe 2', length: 3, diameter: 0.1 },
        { type: 'bend', id: 'Bend 2', angle: -90, radius: 1, diameter: 0.1 },
        { type: 'pipe', id: 'Pipe 3', length: 3, diameter: 0.1 }
      ];
      ui.updateAll();
    };
  },

  bindExport() {
    document.getElementById('export-pdf').onclick = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text("AeroFlow Intuition Tool - Report", 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Fluid: ${this.params.fluidType.toUpperCase()}`, 14, 30);
      doc.text(`Inlet Velocity: ${this.params.inletVelocity} m/s`, 14, 38);
      doc.text(`Inlet Pressure: ${this.params.inletPressure} Pa`, 14, 46);
      
      doc.text(`Total Pressure Drop: ${this.physics.totalPressureDrop.toFixed(2)} Pa`, 14, 58);
      doc.text(`Flow Regime: ${this.physics.systemRegime}`, 14, 66);
      
      // Capture canvas
      const canvas = document.getElementById('flow-canvas');
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 14, 80, 180, 80);
      
      doc.text("Configuration:", 14, 175);
      ui.components.forEach((c, i) => {
         doc.text(`${i+1}. ${c.id} (${c.type})`, 14, 185 + (i * 8));
      });
      
      doc.save("fluid-flow-report.pdf");
    };
  },
  
  recalculate(components) {
    const nodes = this.geo.generateGeometry(components);
    const bounds = this.geo.getBounds();
    
    const physicsResults = this.physics.solve(components, this.params);
    
    // Update stats
    document.getElementById('stat-regime').innerText = this.physics.systemRegime;
    document.getElementById('stat-regime').className = `badge ${this.physics.systemRegime.toLowerCase()}`;
    document.getElementById('stat-drop').innerText = `${this.physics.totalPressureDrop.toFixed(1)} Pa`;
    document.getElementById('stat-vmax').innerText = `${this.physics.globalMaxV.toFixed(2)} m/s`;
    
    // Insights
    if(this.lastPhysicsResults) {
       ui.updateInsight(this.lastPhysicsResults, physicsResults);
    }
    this.lastPhysicsResults = physicsResults.map(r => Object.assign({}, r));
    
    this.renderer.updateData(nodes, bounds, physicsResults, this.physics.globalMaxV, this.physics.systemRegime);
    
    // Update charts
    const pData = [];
    const vData = [];
    let dist = 0;
    
    physicsResults.forEach(r => {
       pData.push({ x: r.distanceStart, y: r.inletP });
       vData.push({ x: r.distanceStart, y: r.velocity });
       
       let l = Object.hasOwn(r.component, 'length') ? r.component.length : 1;
       if (r.component.type === 'bend') l = (Math.PI/180) * r.component.angle * r.component.radius;
       
       pData.push({ x: r.distanceStart + l, y: r.outletP });
       vData.push({ x: r.distanceStart + l, y: r.velocity });
    });
    
    this.pChart.draw(pData, 'Pressure (Pa)', '#f87171');
    this.vChart.draw(vData, 'Velocity (m/s)', '#38bdf8');
  },
  
  loop(time) {
    const dt = time - this.lastTime;
    this.lastTime = time;
    
    if (this.renderer) {
      this.renderer.draw(dt);
    }
    
    requestAnimationFrame(this.loop.bind(this));
  }
};

window.onload = () => APP.init();
