# AeroFlow Intuition Tool

**[Live Demo](https://universepattern.github.io/fluid-flow-lab/)**

A high-performance, browser-based parametric fluid flow visualization and simulation tool. This application allows users to build sequential pipe networks and intuitively study the flow characteristics—velocity, pressure drops, and flow regimes (Laminar vs. Turbulent)—in real-time.

---

## 📐 Mathematical Models & Physics Engine

The core simulation engine in `physics.js` relies on simplified 1D fluid dynamics principles. Below is an explanation of the foundational mathematics used to evaluate the system.

### 1. Continuity Principle
In a closed, continuous system with steady-state flow of an incompressible fluid, the volumetric flow rate ($Q$) remains constant throughout the entire network.

$$ Q = A \cdot V $$

Where:
* **$Q$** = Volumetric flow rate ($m^3/s$)
* **$A$** = Cross-sectional area of the pipe ($\pi \cdot \frac{D^2}{4}$ in $m^2$)
* **$V$** = Velocity of the fluid ($m/s$)

*Application:* The system calculates the initial flow rate $Q$ at the inlet from the user's velocity input. For every subsequent geometric component, the local velocity is recalculated by satisfying $V_{local} = \frac{Q}{A_{local}}$.

---

### 2. Reynolds Number ($Re$)
The Reynolds number is a dimensionless quantity used to predict fluid flow patterns. It characterizes the ratio of inertial forces to viscous forces.

$$ Re = \frac{\rho \cdot V \cdot D}{\mu} $$

Where:
* **$\rho$** = Fluid density ($kg/m^3$)
* **$V$** = Fluid velocity ($m/s$)
* **$D$** = Internal diameter of the pipe ($m$)
* **$\mu$** = Dynamic viscosity of the fluid ($Pa\cdot s$)

*Application:* 
* **$Re \le 2300$**: Governs the flow as **Laminar**.
* **$Re > 2300$**: Triggers the **Turbulent** regime. 
In the UI, particles travel straight during laminar flow but visibly "jiggle" via random orthogonal walk mapping when $Re > 2300$.

---

### 3. Major Losses (Darcy-Weisbach Equation)
Major pressure losses occur due to friction between the fluid and the straight pipe walls. 

$$ \Delta P_{major} = f \cdot \frac{L}{D} \cdot \left(\frac{\rho \cdot V^2}{2}\right) $$

Where:
* **$f$** = Darcy friction factor
* **$L$** = Pipe length ($m$)

**Friction Factor Calculation:**
The friction factor $f$ varies dramatically depending on the flow regime:
* **Laminar Flow:** $f = \frac{64}{Re}$
* **Turbulent Flow (Blasius Correlation):** $f \approx 0.316 \cdot Re^{-0.25}$

---

### 4. Minor Losses (K-Factors)
Minor losses represent pressure drops due to localized disruptions like bends, valves, or rapid contractions/expansions.

$$ \Delta P_{minor} = K \cdot \left(\frac{\rho \cdot V^2}{2}\right) $$

Where **$K$** is the localized loss coefficient.
* **Valves:** $K = \frac{0.5}{openness^2}$ (Approximated to simulate asymptotic flow restriction as a valve closes).
* **Bends:** $K$ scales linearly with angle ($0.5$ at $90^\circ$).
* **Transitions:** Gradual / sudden contractions apply Borda-Carnot style kinetic losses based on the ratio of expansion or contraction ($1 - \frac{A_2}{A_1}$).

---

### 5. Bernoulli's Theorem
For geometric transitions (like a Venturi expansion or contraction), the tool calculates macroscopic kinetic/potential energy conversions independent of friction.

$$ P_1 + \frac{1}{2}\rho V_1^2 = P_2 + \frac{1}{2}\rho V_2^2 + \Delta P_{loss} $$

*Application:* When exiting a contraction, kinetic energy (high velocity) is converted back to static pressure, leading to partial pressure recovery, correctly mapped on the user's Pressure vs Distance graphs.

---

## 💻 Tech Stack
- **JavaScript (ES6+)**: Core mathematical models and logic.
- **HTML5 Canvas API**: Driving to 60fps local particle flow mapping.
- **Vanilla CSS3**: Theming and layout. 
- **jsPDF**: For generating client-side engineering reports and visualizations. No backend required.

## 🚀 How to Run
1. Clone or download this directory.
2. Ensure you have an active internet connection if you wish to use the PDF Export features (it loads the `jsPDF` library via a CDN).
3. Open `index.html` in any modern web browser.

## 📁 File Structure
- `index.html`: Web structure and layout.
- `style.css`: UI Styling.
- `js/main.js`: Main event orchestrator.
- `js/physics.js`: Fluid dynamics calculation engine.
- `js/geometry.js`: Path mapping computation.
- `js/renderer.js`: Abstract visual particle systems mapping to vectors.
- `js/charts.js`: Zero-dependency graphing script.
- `js/ui.js`: DOM inspector bindings and real-time text analysis generation.
