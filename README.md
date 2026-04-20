# AeroFlow Single Pipe Simulator

**[Live Demo](https://universepattern.github.io/fluid-flow-lab/)**

A high-performance, browser-based analytical fluid simulator. This application allows users to evaluate fluid dynamics through a single straight or tapered pipe. It visualizes the flow utilizing a 20-segment color gradient mapping system directly rendered in the browser.

---

## 📐 Mathematical Models & Physics Engine

The core simulation relies on 1D fluid dynamics principles. The pipe is programmatically divided into 20 structural segments derived linearly from the user's start and end diameters. 

### 1. Continuity Principle
Volumetric flow rate ($Q$) remains constant throughout the pipe.
$$ Q = A_i \cdot V_i $$

Where:
* **$A_i$** = Cross-sectional area of segment $i$ ($\pi \cdot \frac{D_i^2}{4}$)
* **$V_i$** = Velocity of the fluid in segment $i$ ($m/s$)

### 2. Reynolds Number ($Re$)
Calculated per segment to characterize fluid flow patterns.
$$ Re_i = \frac{\rho \cdot V_i \cdot D_i}{\mu} $$

### 3. Frictional Pressure Drop (Darcy-Weisbach)
The primary loss occurring through the pipe segments.
$$ \Delta P_i = f_i \cdot \frac{L_{seg}}{D_i} \cdot \left(\frac{\rho \cdot V_i^2}{2}\right) $$

**Friction Factor ($f_i$) Calculation:**
* **Laminar Flow ($Re \le 2300$):** $f_i = \frac{64}{Re_i}$
* **Turbulent Flow (Blasius Correlation):** $f_i \approx 0.316 \cdot Re_i^{-0.25}$

The entire system dynamically aggregates $\Delta P$ across all 20 subdivisions to provide precise inlet and outlet metrics in real-time.

---

## 💻 Tech Stack
- **JavaScript (ES6+)**: Structural parsing and analytical fluid calculations.
- **HTML5 Canvas API**: Segment-based visual modeling and gradient mapping.
- **Vanilla CSS3**: Theming and layout. 

## 🚀 How to Run
1. Clone or download this directory.
2. Open `index.html` in any modern web browser.

## 📁 File Structure
- `index.html`: Web structure and layout.
- `style.css`: Warm, premium dark-mode styling.
- `js/main.js`: Setup, DOM updates, and data bindings.
- `js/physics.js`: Fluid dynamics calculation engine slicing geometry into 20 arrays.
- `js/renderer.js`: Visual canvas renderer applying segmented gradient mapping.
