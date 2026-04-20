class SketchEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.nodes = [];
    this.edges = [];
    this.scale = 0.02; // 1 pixel = 0.02 meters (50px = 1m)
    
    this.nodeCounter = 1;
    this.edgeCounter = 1;

    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    
    this.hoverNodeId = null;
    this.hoverEdgeId = null;

    this.dragNodeId = null;
    this.isDragging = false;

    this.onSelectionChange = null;
    this.onGeometryChange = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    if (this.onGeometryChange) this.onGeometryChange();
  }

  clear() {
    this.nodes = [];
    this.edges = [];
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.nodeCounter = 1;
    this.edgeCounter = 1;
    if (this.onSelectionChange) this.onSelectionChange(null, null);
    if (this.onGeometryChange) this.onGeometryChange();
  }

  getGraph() {
    return { nodes: this.nodes, edges: this.edges, scale: this.scale };
  }

  loadPreset(presetType) {
    this.clear();
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cy = h / 2;
    const cx = w / 2;

    if (presetType === 'straight') {
      this.nodes.push({ id: 1, x: cx - 200, y: cy });
      this.nodes.push({ id: 2, x: cx + 200, y: cy });
      this.edges.push({ id: 1, from: 1, to: 2, diameter: 0.1, roughness: 0.001, kFactor: 0 });
      this.nodeCounter = 3;
      this.edgeCounter = 2;
    } else if (presetType === 'venturi') {
      this.nodes.push({ id: 1, x: cx - 300, y: cy });
      this.nodes.push({ id: 2, x: cx - 100, y: cy });
      this.nodes.push({ id: 3, x: cx + 100, y: cy });
      this.nodes.push({ id: 4, x: cx + 300, y: cy });
      
      this.edges.push({ id: 1, from: 1, to: 2, diameter: 0.2, roughness: 0.001, kFactor: 0 });
      this.edges.push({ id: 2, from: 2, to: 3, diameter: 0.05, roughness: 0.001, kFactor: 0.5 }); // Added some minor loss for contraction
      this.edges.push({ id: 3, from: 3, to: 4, diameter: 0.2, roughness: 0.001, kFactor: 0.5 });
      this.nodeCounter = 5;
      this.edgeCounter = 4;
    }
    this.selectedNodeId = this.nodes[this.nodes.length-1].id;
    if (this.onSelectionChange) this.onSelectionChange('node', this.selectedNodeId);
    if (this.onGeometryChange) this.onGeometryChange();
  }

  updateElement(type, id, key, value) {
    if (type === 'node') {
      const n = this.nodes.find(x => x.id === id);
      if (n) n[key] = value;
    } else if (type === 'edge') {
      const e = this.edges.find(x => x.id === id);
      if (e) e[key] = value;
    }
    if (this.onGeometryChange) this.onGeometryChange();
  }

  // --- INTERACTION LOGIC --- //

  getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2-x1)**2 + (y2-y1)**2);
  }

  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2-x1)**2 + (y2-y1)**2;
    if (l2 === 0) return this.getDistance(px, py, x1, y1);
    let t = ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return this.getDistance(px, py, x1 + t*(x2 - x1), y1 + t*(y2 - y1));
  }

  findHover(ex, ey) {
    // Check nodes first
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (this.getDistance(ex, ey, n.x, n.y) < 15) {
        return { type: 'node', id: n.id };
      }
    }
    // Check edges
    for (let i = this.edges.length - 1; i >= 0; i--) {
      const e = this.edges[i];
      const n1 = this.nodes.find(x => x.id === e.from);
      const n2 = this.nodes.find(x => x.id === e.to);
      if (n1 && n2) {
        const dist = this.distToSegment(ex, ey, n1.x, n1.y, n2.x, n2.y);
        const radiusDisplay = Math.max(5, (e.diameter / this.scale) / 2);
        if (dist <= radiusDisplay + 5) {
          return { type: 'edge', id: e.id };
        }
      }
    }
    return null;
  }

  bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      // Grid snapping (optional, 25px grid)
      if (e.shiftKey) {
        x = Math.round(x / 25) * 25;
        y = Math.round(y / 25) * 25;
      }
      return {x, y};
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const {x, y} = getPos(e);

      if (this.isDragging && this.dragNodeId) {
        const n = this.nodes.find(nd => nd.id === this.dragNodeId);
        if (n) {
          n.x = x;
          n.y = y;
          if (this.onGeometryChange) this.onGeometryChange();
        }
      } else {
        const h = this.findHover(x, y);
        let updated = false;
        if (h) {
          if (h.type === 'node' && this.hoverNodeId !== h.id) { this.hoverNodeId = h.id; this.hoverEdgeId = null; updated = true;}
          if (h.type === 'edge' && this.hoverEdgeId !== h.id) { this.hoverEdgeId = h.id; this.hoverNodeId = null; updated = true;}
        } else {
          if (this.hoverNodeId || this.hoverEdgeId) {
            this.hoverNodeId = null;
            this.hoverEdgeId = null;
            updated = true;
          }
        }
        if (updated) this.canvas.style.cursor = h ? 'pointer' : 'crosshair';
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const {x, y} = getPos(e);
      const h = this.findHover(x, y);

      if (h) {
        if (h.type === 'node') {
          this.selectedNodeId = h.id;
          this.selectedEdgeId = null;
          this.dragNodeId = h.id;
          this.isDragging = true;
          if (this.onSelectionChange) this.onSelectionChange('node', h.id);
        } else {
          this.selectedEdgeId = h.id;
          this.selectedNodeId = null;
          if (this.onSelectionChange) this.onSelectionChange('edge', h.id);
        }
      } else {
        // Create new node
        const newNodeId = this.nodeCounter++;
        this.nodes.push({ id: newNodeId, x, y });
        
        // Auto-link if a node was previously selected
        if (this.selectedNodeId !== null) {
           const prevD = this.edges.length > 0 ? this.edges[this.edges.length-1].diameter : 0.1;
           const prevRough = this.edges.length > 0 ? this.edges[this.edges.length-1].roughness : 0.001;
           const newEdgeId = this.edgeCounter++;
           this.edges.push({
             id: newEdgeId,
             from: this.selectedNodeId,
             to: newNodeId,
             diameter: prevD,
             roughness: prevRough,
             kFactor: 0
           });
        }
        
        this.selectedNodeId = newNodeId;
        this.selectedEdgeId = null;
        if (this.onSelectionChange) this.onSelectionChange('node', newNodeId);
      }
      if (this.onGeometryChange) this.onGeometryChange();
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.dragNodeId = null;
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.dragNodeId = null;
    });
  }
}

window.SketchEngine = SketchEngine;
