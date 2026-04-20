const ui = {
  components: [
    { type: 'pipe', id: 'Initial Pipe', length: 10, diameter: 0.1 }
  ],
  selectedIdx: 0,
  
  onComponentsChange: null, // Callback for main.js

  init() {
    this.renderList();
    this.renderInspector();
  },

  addComponent(type) {
    let comp = {};
    const count = this.components.filter(c => c.type === type).length + 1;
    
    // Default values
    switch(type) {
      case 'pipe':
        comp = { type: 'pipe', id: `Pipe ${count}`, length: 5, diameter: 0.1 };
        break;
      case 'bend':
        comp = { type: 'bend', id: `Bend ${count}`, angle: 90, radius: 2, diameter: 0.1 };
        break;
      case 'contraction':
        comp = { type: 'contraction', id: `Transition ${count}`, length: 2, d2: 0.05 };
        break;
      case 'valve':
        comp = { type: 'valve', id: `Valve ${count}`, openness: 0.5, diameter: 0.1 };
        break;
    }
    
    this.components.push(comp);
    this.selectedIdx = this.components.length - 1;
    this.updateAll();
  },

  removeComponent(idx, event) {
    event.stopPropagation();
    if(this.components.length <= 1) return; // Prevent deleting last component
    this.components.splice(idx, 1);
    if(this.selectedIdx >= this.components.length) {
      this.selectedIdx = this.components.length - 1;
    }
    this.updateAll();
  },

  selectComponent(idx) {
    this.selectedIdx = idx;
    this.renderList();
    this.renderInspector();
  },

  updateComponent(key, val) {
    if(this.selectedIdx < 0 || this.selectedIdx >= this.components.length) return;
    this.components[this.selectedIdx][key] = parseFloat(val);
    this.updateAll();
  },

  updateAll() {
    this.renderList();
    this.renderInspector();
    if(this.onComponentsChange) this.onComponentsChange(this.components);
  },

  renderList() {
    const list = document.getElementById('components-list');
    list.innerHTML = '';
    
    this.components.forEach((comp, i) => {
      const div = document.createElement('div');
      div.className = `component-item ${i === this.selectedIdx ? 'active' : ''}`;
      div.onclick = () => this.selectComponent(i);
      
      div.innerHTML = `
        <div class="comp-info">
          <strong>${comp.id}</strong>
          <span>${comp.type}</span>
        </div>
        <div class="comp-actions">
          ${this.components.length > 1 ? `<button onclick="ui.removeComponent(${i}, event)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>` : ''}
        </div>
      `;
      list.appendChild(div);
    });
  },

  renderInspector() {
    const panel = document.getElementById('inspector');
    if (this.selectedIdx < 0 || this.selectedIdx >= this.components.length) {
      panel.innerHTML = '<p class="empty-state">Select a component to edit.</p>';
      return;
    }

    const comp = this.components[this.selectedIdx];
    let html = '';

    const addSlider = (label, key, min, max, step) => {
      return `
        <div class="form-group" style="padding-bottom: 0;">
          <label>${label}</label>
          <input type="range" min="${min}" max="${max}" step="${step}" value="${comp[key]}" 
                 oninput="document.getElementById('val_${key}').innerText = this.value; ui.updateComponent('${key}', this.value)">
          <span class="val-display" id="val_${key}">${comp[key]}</span>
        </div>
      `;
    };

    if (comp.type === 'pipe') {
      html += addSlider('Length (m)', 'length', 1, 50, 0.5);
      html += addSlider('Diameter (m)', 'diameter', 0.01, 2, 0.01);
    } else if (comp.type === 'bend') {
      html += addSlider('Angle (deg)', 'angle', 10, 180, 1);
      html += addSlider('Bend Radius (m)', 'radius', 0.1, 10, 0.1);
      html += addSlider('Diameter (m)', 'diameter', 0.01, 2, 0.01);
    } else if (comp.type === 'contraction') {
      html += addSlider('Length (m)', 'length', 0.1, 5, 0.1);
      html += addSlider('Output Diameter (m)', 'd2', 0.01, 2, 0.01);
    } else if (comp.type === 'valve') {
      html += addSlider('Diameter (m)', 'diameter', 0.01, 2, 0.01);
      html += addSlider('Openness (0-1)', 'openness', 0.01, 1, 0.01);
    }

    panel.innerHTML = html;
  },
  
  updateInsight(prevPhysics, newPhysics) {
     const box = document.getElementById('insight-box');
     if (!prevPhysics || !newPhysics || prevPhysics.length === 0 || newPhysics.length === 0) return;
     
     const oldSys = prevPhysics[prevPhysics.length-1].outletP;
     const newSys = newPhysics[newPhysics.length-1].outletP;
     const dropDiff = Math.abs(oldSys - newSys);
     
     if (dropDiff < 0.1) return; // No significant change
     
     let txt = "";
     if (newSys < oldSys) {
       txt += "System pressure drop increased! ";
     } else {
       txt += "System pressure drop decreased. ";
     }
     
     // Find component with biggest loss change
     let biggestChange = 0;
     let culprit = null;
     for(let i=0; i<Math.min(prevPhysics.length, newPhysics.length); i++) {
        let diff = Math.abs(prevPhysics[i].loss - newPhysics[i].loss);
        if(diff > biggestChange) {
           biggestChange = diff;
           culprit = newPhysics[i].component;
        }
     }
     
     if (culprit) {
        txt += `The primary contributor to this change is ${culprit.id} (${culprit.type}). `;
        if (culprit.type === 'contraction') {
          txt += "Changing diameter creates significant minor losses and alters velocity (Continuity Principle).";
        } else if (culprit.type === 'valve') {
          txt += "Valve openness acts as a major flow restriction (K-factor minor loss).";
        } else if (culprit.type === 'pipe') {
           txt += "Pipe length and diameter dictating friction via Darcy-Weisbach equation.";
        }
     }
     
     box.innerHTML = `<p>${txt}</p>`;
  }
};

window.ui = ui;
