class GeometryEngine {
  constructor() {
    this.scale = 100; // pixels per fluid meter initially
    this.pathNodes = [];
    this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  generateGeometry(components) {
    this.pathNodes = [];
    let currentX = 0;
    let currentY = 0;
    let currentAngle = 0; // Radians, 0 is pointing right

    let maxX = 0, minX = 0, maxY = 0, minY = 0;

    const addNode = (cx, cy, ang, d, comp) => {
      this.pathNodes.push({ x: cx, y: cy, angle: ang, diameter: d, component: comp });
      if (cx > maxX) maxX = cx;
      if (cx < minX) minX = cx;
      if (cy > maxY) maxY = cy;
      if (cy < minY) minY = cy;
    };

    // Keep track of current diameter for continuity
    let currentD = components.length > 0 ? components[0].diameter : 0.1;

    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      
      if (comp.type === 'pipe') {
        currentD = comp.diameter || currentD;
        // Start node
        addNode(currentX, currentY, currentAngle, currentD, comp);
        // End node
        currentX += comp.length * Math.cos(currentAngle);
        currentY += comp.length * Math.sin(currentAngle);
        addNode(currentX, currentY, currentAngle, currentD, comp);
      } 
      else if (comp.type === 'bend') {
        const radAngle = comp.angle * (Math.PI / 180);
        // We will approximate the bend with multiple line segments for the flow path
        const segments = 10;
        const dAngle = radAngle / segments;
        
        // Arc center calculation (simplified for inline path generation)
        // Assume radius R. Distance traveled is R * angle
        const R = comp.radius;
        currentD = comp.diameter || currentD;

        addNode(currentX, currentY, currentAngle, currentD, comp);

        for (let s = 1; s <= segments; s++) {
          const stepAngle = currentAngle + dAngle * s;
          // chord length for small angle approximation
          const stepLen = R * Math.abs(dAngle); 
          currentX += stepLen * Math.cos(stepAngle - dAngle/2);
          currentY += stepLen * Math.sin(stepAngle - dAngle/2);
          addNode(currentX, currentY, stepAngle, currentD, comp);
        }
        currentAngle += radAngle;
      }
      else if (comp.type === 'contraction') {
        // Transition from currentD to comp.d2
        const d1 = currentD;
        const d2 = comp.d2;
        const len = comp.length;
        
        addNode(currentX, currentY, currentAngle, d1, comp);
        currentX += len * Math.cos(currentAngle);
        currentY += len * Math.sin(currentAngle);
        addNode(currentX, currentY, currentAngle, d2, comp);
        currentD = d2;
      }
      else if (comp.type === 'valve') {
        // Valve acts as a pipe of short length
        const vLen = currentD * 1.5; // Visual length of valve
        addNode(currentX, currentY, currentAngle, currentD, comp);
        currentX += vLen * Math.cos(currentAngle);
        currentY += vLen * Math.sin(currentAngle);
        addNode(currentX, currentY, currentAngle, currentD, comp);
      }
    }

    this.bounds = { minX, maxX, minY, maxY };
    return this.pathNodes;
  }

  getNodes() {
    return this.pathNodes;
  }

  getBounds() {
    return this.bounds;
  }
}

window.GeometryEngine = GeometryEngine;
