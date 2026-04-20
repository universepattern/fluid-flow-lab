const FLUIDS = {
  water: { rho: 998, mu: 0.001001, name: 'Water' },
  air:   { rho: 1.225, mu: 0.0000181, name: 'Air' },
  oil:   { rho: 850, mu: 0.04, name: 'Oil' }
};

class PhysicsEngine {
  constructor() {
    this.results = [];
    this.totalPressureDrop = 0;
    this.globalMaxV = 0;
    this.systemRegime = 'Laminar';
  }

  solve(components, parameters) {
    this.results = [];
    this.totalPressureDrop = 0;
    this.globalMaxV = 0;

    if (components.length === 0) return;

    const fluid = FLUIDS[parameters.fluidType];
    const inletV = parameters.inletVelocity;
    const inletP = parameters.inletPressure;

    // Determine Volumetric Flow Rate (Q) from the first component
    const firstD = components[0].type === 'contraction' ? components[0].d1 || 0.1 : (components[0].diameter || 0.1);
    const A1 = Math.PI * Math.pow(firstD / 2, 2);
    const Q = inletV * A1;

    let currentP = inletP;
    let currentDistance = 0;
    let maxRe = 0;

    for (let comp of components) {
      let result = {
        component: comp,
        inletP: currentP,
        distanceStart: currentDistance,
        velocity: 0,
        Re: 0,
        loss: 0,
        regime: 'Laminar'
      };

      let d = comp.diameter || firstD;
      
      if (comp.type === 'pipe') {
        const A = Math.PI * Math.pow(d / 2, 2);
        const V = Q / A;
        result.velocity = V;
        
        const Re = (fluid.rho * V * d) / fluid.mu;
        result.Re = Re;
        result.regime = Re > 2300 ? 'Turbulent' : 'Laminar';
        
        let f = 0;
        if (Re < 2300) {
          f = 64 / Math.max(Re, 1);
        } else {
          // Blasius correlation
          f = 0.316 * Math.pow(Re, -0.25);
        }

        // Darcy-Weisbach: dP = f * (L/D) * (rho * V^2 / 2)
        const dP = f * (comp.length / d) * (0.5 * fluid.rho * Math.pow(V, 2));
        result.loss = dP;
        currentDistance += comp.length;
      } 
      else if (comp.type === 'bend') {
        const A = Math.PI * Math.pow(d / 2, 2);
        const V = Q / A;
        result.velocity = V;
        result.Re = (fluid.rho * V * d) / fluid.mu;
        
        // Minor loss: K * (rho * V^2 / 2). K depends on angle and radius.
        // Approx: 90 deg = 0.3 to 0.9.
        const K = (comp.angle / 90) * 0.5; // Simplified
        const dP = K * (0.5 * fluid.rho * Math.pow(V, 2));
        result.loss = dP;
        
        // Estimate arc length
        currentDistance += (comp.angle * (Math.PI/180)) * comp.radius;
      }
      else if (comp.type === 'contraction') {
        // d1 to d2
        const d1 = currentD_from_prev(this.results) || d;
        const d2 = comp.d2;
        const A2 = Math.PI * Math.pow(d2 / 2, 2);
        const V2 = Q / A2;
        result.velocity = V2; // representative v
        result.Re = (fluid.rho * V2 * d2) / fluid.mu;

        // Minor loss for contraction (sudden or gradual approx)
        let K = 0;
        if (d1 > d2) {
           K = 0.5 * (1 - Math.pow(d2/d1, 2)); // Contraction
        } else {
           K = Math.pow(1 - Math.pow(d1/d2, 2), 2); // Expansion
        }
        
        // Ideal Bernoulli pressure change: P1 + 0.5*rho*v1^2 = P2 + 0.5*rho*v2^2 + loss
        const A1_local = Math.PI * Math.pow(d1 / 2, 2);
        const V1_local = Q / A1_local;
        const bernoulliDiff = 0.5 * fluid.rho * (Math.pow(V1_local, 2) - Math.pow(V2, 2)); 

        const lossdP = K * (0.5 * fluid.rho * Math.pow(V1_local > V2 ? V1_local : V2, 2));
        
        // currentP changes by Bernoulli conversion minus frictional loss
        currentP = currentP + bernoulliDiff - lossdP; 
        result.loss = lossdP; // just the frictional part
        
        currentDistance += comp.length;
        
        result.outletP = currentP;
        this.results.push(result);
        if (result.velocity > this.globalMaxV) this.globalMaxV = result.velocity;
        if (result.Re > maxRe) maxRe = result.Re;
        continue; // skip the standard subtraction below because we did Bernoulli
      }
      else if (comp.type === 'valve') {
        const A = Math.PI * Math.pow(d / 2, 2);
        const V = Q / A;
        result.velocity = V;
        result.Re = (fluid.rho * V * d) / fluid.mu;
        
        // Typical valve K factor ranges from 0.2 (open) to infinity (closed)
        // K = base / (openness^2)
        const open = Math.max(0.01, comp.openness);
        const K = 0.5 / Math.pow(open, 2);
        const dP = K * (0.5 * fluid.rho * Math.pow(V, 2));
        
        result.loss = dP;
        currentDistance += d * 1.5; // effective length visual
      }

      currentP -= result.loss;
      result.outletP = currentP;
      this.totalPressureDrop += result.loss;
      this.results.push(result);

      if (result.velocity > this.globalMaxV) this.globalMaxV = result.velocity;
      if (result.Re > maxRe) maxRe = result.Re;
    }

    this.systemRegime = maxRe < 2300 ? 'Laminar' : (maxRe < 4000 ? 'Transitional' : 'Turbulent');
    return this.results;
  }
}

function currentD_from_prev(results) {
  if (results.length === 0) return null;
  const lastComp = results[results.length-1].component;
  if (lastComp.type === 'contraction') return lastComp.d2;
  return lastComp.diameter || 0.1;
}

window.PhysicsEngine = PhysicsEngine;
