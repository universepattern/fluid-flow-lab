class PhysicsEngine {
  constructor() {
    this.results = [];
    this.totalPressureDrop = 0;
    this.globalMaxV = 0;
    this.systemRegime = 'Laminar';
  }

  solve(graph, params) {
    this.results = [];
    this.totalPressureDrop = 0;
    this.globalMaxV = 0;

    const { nodes, edges, scale } = graph;
    if (edges.length === 0) return this.results;

    const rho = params.rho || 998;
    const mu = params.mu || 0.001001;
    const Q = params.q || 0.01;
    let currentP = params.inletPressure || 101325;
    
    let currentDistance = 0;
    let maxRe = 0;

    // Follow edges in order of creation (assuming simple sequential network)
    for (const edge of edges) {
      const n1 = nodes.find(n => n.id === edge.from);
      const n2 = nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) continue;

      const pxLength = Math.sqrt((n2.x - n1.x)**2 + (n2.y - n1.y)**2);
      const L = pxLength * scale;
      const D = edge.diameter || 0.1;
      const A = Math.PI * Math.pow(D / 2, 2);
      const V = Q / A;
      
      const Re = (rho * V * D) / mu;
      
      // Calculate Friction Factor
      let f = 0;
      if (Re < 2300) {
        f = 64 / Math.max(Re, 1);
      } else {
        // Simplified Haaland/Blasius or fixed for high roughness
        // We'll use Blasius as an approximation if roughness isn't extreme
        f = 0.316 * Math.pow(Math.max(Re, 1), -0.25);
        // Include roughness effect roughly
        if (edge.roughness) {
           // simple asymptotic offset for turbulent flow
           f += edge.roughness / D;
        }
      }

      // Darcy-Weisbach head loss -> pressure drop
      // dP = f * (L/D) * (rho * V^2 / 2)
      const majorDrop = f * (L / D) * (0.5 * rho * V * V);
      
      // Minor loss
      const K = edge.kFactor || 0;
      const minorDrop = K * (0.5 * rho * V * V);

      const totalDrop = majorDrop + minorDrop;
      
      const result = {
        edgeId: edge.id,
        length: L,
        velocity: V,
        Re: Re,
        majorLossP: majorDrop,
        minorLossP: minorDrop,
        totalDrop: totalDrop,
        inletP: currentP,
        outletP: currentP - totalDrop,
        distanceStart: currentDistance,
        distanceEnd: currentDistance + L
      };

      currentP -= totalDrop;
      currentDistance += L;
      this.totalPressureDrop += totalDrop;

      if (V > this.globalMaxV) this.globalMaxV = V;
      if (Re > maxRe) maxRe = Re;
      
      this.results.push(result);
    }
    
    this.systemRegime = maxRe < 2300 ? 'Laminar' : (maxRe < 4000 ? 'Transitional' : 'Turbulent');
    return this.results;
  }
}

window.PhysicsEngine = PhysicsEngine;
