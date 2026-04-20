const ui = {
  sketch: null, // assigned in main
  
  init(sketchInstance) {
    this.sketch = sketchInstance;
    this.sketch.onSelectionChange = (type, id) => this.renderInspector(type, id);
    this.renderInspector(null, null);
  },

  renderInspector(type, id) {
    const container = document.getElementById('inspector');
    
    if (!type || id === null) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Select a node or edge on the canvas to view properties.</p>
          <p class="hint">Click empty space to add nodes. Drag to connect.</p>
        </div>`;
      return;
    }

    let html = '';
    const graph = this.sketch.getGraph();

    if (type === 'node') {
      const node = graph.nodes.find(n => n.id === id);
      if (!node) return;
      html += `<h3>Node ${node.id}</h3>`;
      html += `
        <div class="input-group">
          <label>X Position (px)</label>
          <input type="number" value="${Math.round(node.x)}" onchange="ui.updateElem('node', ${id}, 'x', this.value)">
        </div>
        <div class="input-group">
          <label>Y Position (px)</label>
          <input type="number" value="${Math.round(node.y)}" onchange="ui.updateElem('node', ${id}, 'y', this.value)">
        </div>
      `;
    } 
    else if (type === 'edge') {
      const edge = graph.edges.find(e => e.id === id);
      if (!edge) return;
      html += `<h3>Pipe ${edge.id}</h3>`;
      html += `
        <div class="input-group">
          <label>Diameter (m)</label>
          <input type="number" step="0.01" min="0.01" value="${edge.diameter}" onchange="ui.updateElem('edge', ${id}, 'diameter', this.value)">
        </div>
        <div class="input-group">
          <label>Roughness (m)</label>
          <input type="number" step="0.0001" min="0" value="${edge.roughness}" onchange="ui.updateElem('edge', ${id}, 'roughness', this.value)">
        </div>
        <div class="input-group">
          <label>Minor Loss K-Factor</label>
          <input type="number" step="0.1" min="0" value="${edge.kFactor || 0}" onchange="ui.updateElem('edge', ${id}, 'kFactor', this.value)">
        </div>
      `;
    }

    container.innerHTML = html;
  },

  updateElem(type, id, key, value) {
    this.sketch.updateElement(type, id, key, parseFloat(value));
  }
};

window.ui = ui;
