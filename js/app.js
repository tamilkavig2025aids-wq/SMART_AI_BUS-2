// Main Application Controller & View Orchestrator
// Coordinates the 3 dedicated screens: Fleet Operations, Web Dashboard, and Mobile App.

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize core simulation engine with Coimbatore, Tamil Nadu transit data
  const engine = new FleetSimulationEngine(COIMBATORE_STOPS, ROUTE_PATH, INITIAL_FLEET);
  window.simulationEngine = engine;

  // 2. Initialize ETM Hardware Simulator
  const etmSimulator = new ETMHardwareSimulator(engine);
  window.etmSimulator = etmSimulator;

  // 3. Initialize Bus Interior Visualizer
  const interiorVisualizer = new BusInteriorVisualizer(engine, etmSimulator);
  window.interiorVisualizer = interiorVisualizer;

  // 4. Initialize Screen 1: Operational Fleet Map View (All 10 buses)
  const fleetView = new OperationalFleetView(engine, etmSimulator, interiorVisualizer);
  window.fleetView = fleetView;

  // 5. Initialize Screen 2: Passenger Web Dashboard (Independent)
  const webDashboard = new WebDashboardView(engine);
  window.webDashboard = webDashboard;

  // 6. Initialize Screen 3: Mobile App UI/UX Design (Independent)
  const mobileApp = new MobileAppSimulator(engine);
  window.mobileApp = mobileApp;

  // 7. Tab Navigation Manager (Guarantees clean view isolation!)
  const tabButtons = document.querySelectorAll(".nav-tab-btn");
  const viewSections = {
    fleet: document.getElementById("viewFleetSection"),
    web: document.getElementById("viewWebSection"),
    mobile: document.getElementById("viewMobileSection")
  };

  function switchTab(targetTab) {
    // Update button states
    tabButtons.forEach(btn => {
      const isTarget = btn.dataset.tab === targetTab;
      btn.classList.toggle("active", isTarget);
    });

    // Update screen views
    Object.keys(viewSections).forEach(key => {
      const section = viewSections[key];
      if (section) {
        if (key === targetTab) {
          section.classList.remove("hidden");
        } else {
          section.classList.add("hidden");
        }
      }
    });

    // Invalidate map sizes on tab change to ensure smooth tile rendering
    if (targetTab === "fleet") {
      fleetView.refreshSize();
    } else if (targetTab === "web") {
      webDashboard.refreshSize();
    } else if (targetTab === "mobile") {
      mobileApp.refreshSize();
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      switchTab(target);
    });
  });

  // Default to Fleet Operations View
  switchTab("fleet");

  // 8. Global Event Toast System (Real-time ETM & GPS Offload Notifications)
  const toastContainer = document.getElementById("globalToastContainer");
  window.addEventListener("smartbus:event", (e) => {
    const detail = e.detail;
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `smart-toast toast-${detail.type}`;

    let icon = "📢";
    if (detail.type === "alight") icon = "🚏";
    else if (detail.type === "ticket_issued") icon = "🎫";
    else if (detail.type === "arrive") icon = "📍";

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-body">
        <div class="toast-title">${detail.timestamp} • ${detail.busCode || 'Fleet Telemetry'}</div>
        <div class="toast-msg">${detail.message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add("toast-fadeout");
        setTimeout(() => toast.remove(), 400);
      }
    }, 5000);
  });
});
