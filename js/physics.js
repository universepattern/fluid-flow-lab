class PhysicsEngine {
  constructor() {
    this.segmentsCount = 20;
  }

  solve(params) {
    const { L, dStart, dEnd, Q, rho, mu } = params;
    
    const results = [];
    let cumulativeDrop = 0;
    
    // Safety check
    if (L <= 0 || dStart <= 0 || dEnd <= 0 || Q <= 0) return { segments: [], stats: {} };

    const dL = L / this.segmentsCount;
    let maxV = 0;
    let maxRe = 0;

    for (let i = 0; i < this.segmentsCount; i++) {
      // Find diameter at the middle of this segment
      const fraction = (i + 0.5) / this.segmentsCount;
      const D = dStart + (dEnd - dStart) * fraction;
      
      const A = Math.PI * Math.pow(D / 2, 2);
      const V = Q / A;
      const Re = (rho * V * D) / mu;

      let f = 0;
      if (Re < 2300) {
        f = 64 / Math.max(Re, 1);
      } else {
        f = 0.316 * Math.pow(Math.max(Re, 1), -0.25);
      }

      // Darcy Weisbach
      const dP = f * (dL / D) * (0.5 * rho * V * V);
      
      cumulativeDrop += dP;
      if (V > maxV) maxV = V;
      if (Re > maxRe) maxRe = Re;

      results.push({
        segmentIndex: i,
        diameter: D,
        velocity: V,
        Re: Re,
        pressureDrop: dP,
        cumulativeDrop: cumulativeDrop
      });
    }

    // Inlet / Outlet precise stats
    const Ain = Math.PI * Math.pow(dStart / 2, 2);
    const Aout = Math.PI * Math.pow(dEnd / 2, 2);
    const Vin = Q / Ain;
    const Vout = Q / Aout;

    return {
      segments: results,
      stats: {
        vin: Vin,
        vout: Vout,
        maxV: maxV,
        maxRe: maxRe,
        totalDrop: cumulativeDrop
      }
    };
  }
}

window.PhysicsEngine = PhysicsEngine;
