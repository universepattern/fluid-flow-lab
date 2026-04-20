const APP = {
  physics: null,
  renderer: null,

  params: {
    L: 10,
    dStart: 0.1,
    dEnd: 0.05,
    Q: 0.01,
    rho: 998,
    mu: 0.001001
  },

  init() {
    this.physics = new PhysicsEngine();
    this.renderer = new FlowRenderer('flow-canvas');
    
    this.bindInputs();
    this.bindToolbar();
    
    // Initial evaluation
    this.recalculate();
    
    // Ensure redrawing on window resize
    window.addEventListener('resize', () => {
      this.renderer.draw(this.params, this.lastPhysicsResult);
    });
  },

  bindInputs() {
    const bind = (id, key) => {
      document.getElementById(id).addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          this.params[key] = val;
          this.recalculate();
        }
      });
    };

    bind('inp-length', 'L');
    bind('inp-dstart', 'dStart');
    bind('inp-dend', 'dEnd');
    bind('inp-flowrate', 'Q');
    bind('inp-rho', 'rho');
    bind('inp-mu', 'mu');
  },

  bindToolbar() {
    const btnV = document.getElementById('btn-heatmap-v');
    const btnP = document.getElementById('btn-heatmap-p');

    btnV.onclick = () => {
      this.renderer.setMode('velocity');
      btnV.classList.add('active');
      btnP.classList.remove('active');
      this.renderer.draw(this.params, this.lastPhysicsResult);
    };

    btnP.onclick = () => {
      this.renderer.setMode('pressure');
      btnP.classList.add('active');
      btnV.classList.remove('active');
      this.renderer.draw(this.params, this.lastPhysicsResult);
    };
  },

  recalculate() {
    const res = this.physics.solve(this.params);
    this.lastPhysicsResult = res;

    // Update DOM DOM
    if (res.stats) {
      document.getElementById('res-vin').innerText = `${res.stats.vin.toFixed(3)} m/s`;
      document.getElementById('res-vout').innerText = `${res.stats.vout.toFixed(3)} m/s`;
      document.getElementById('res-re').innerText = `${res.stats.maxRe.toFixed(0)}`;
      document.getElementById('res-drop').innerText = `${res.stats.totalDrop.toFixed(2)} Pa`;
    }

    this.renderer.draw(this.params, res);
  }
};

window.onload = () => APP.init();
