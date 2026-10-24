// Operational Fleet Simulation Map (Screen 1)
// Uses Google Maps tiles (Roadmap & Satellite Hybrid matching user image)
// Features direct booking popups on all buses, quick-book toolbar, and inspector drawer.

class OperationalFleetView {
  constructor(engine, etmSimulator, interiorVisualizer) {
    this.engine = engine;
    this.etmSimulator = etmSimulator;
    this.interiorVisualizer = interiorVisualizer;
    this.map = null;
    this.busMarkers = {};
    this.stopMarkers = [];
    this.routePolyline = null;
    this.selectedBusId = null;
    this.currentTileType = 'm'; // 'm' for Roadmap, 'y' for Satellite Hybrid
    this.tileLayer = null;

    this.initMap();
    this.renderQuickFleetBar();
    this.bindFleetEvents();
  }

  initMap() {
    const mapContainer = document.getElementById("fleetMap");
    if (!mapContainer) return;

    // Center on Coimbatore City Center, Tamil Nadu, India
    this.map = L.map("fleetMap", {
      center: [11.008, 76.965],
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });

    // Authentic Google Maps Tile Layer (Zero API key required!)
    this.setMapType('m');

    // Add Google-style Map / Satellite toggle control in top left
    this.addGoogleMapTypeControl();

    // Draw circular route corridor
    this.routePolyline = L.polyline(this.engine.routePath, {
      color: "#2563EB",
      weight: 6,
      opacity: 0.75,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(this.map);

    // Glowing center line
    L.polyline(this.engine.routePath, {
      color: "#60A5FA",
      weight: 2,
      opacity: 0.95
    }).addTo(this.map);

    // Render transit stops matching Coimbatore landmarks
    this.renderStops();

    // Setup initial bus markers with direct click popups
    this.renderInitialBuses();

    setTimeout(() => {
      this.map.invalidateSize();
    }, 250);
  }

  setMapType(type) {
    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }
    this.currentTileType = type;
    // Authentic Google Maps Tile Layer with English labels strictly enforced (hl=en)
    this.tileLayer = L.tileLayer(`https://mt{s}.google.com/vt/lyrs=${type}&hl=en&x={x}&y={y}&z={z}`, {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20
    }).addTo(this.map);
  }

  addGoogleMapTypeControl() {
    const typeControl = L.control({ position: "topleft" });
    typeControl.onAdd = () => {
      const div = L.DomUtil.create("div", "google-map-type-bar");
      div.innerHTML = `
        <button class="gmap-type-btn active" id="btnGMapRoad">Map</button>
        <button class="gmap-type-btn" id="btnGMapSat">Satellite</button>
      `;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    typeControl.addTo(this.map);

    setTimeout(() => {
      const roadBtn = document.getElementById("btnGMapRoad");
      const satBtn = document.getElementById("btnGMapSat");

      if (roadBtn && satBtn) {
        roadBtn.addEventListener("click", () => {
          this.setMapType('m');
          roadBtn.classList.add("active");
          satBtn.classList.remove("active");
        });
        satBtn.addEventListener("click", () => {
          this.setMapType('y');
          satBtn.classList.add("active");
          roadBtn.classList.remove("active");
        });
      }
    }, 100);
  }

  renderStops() {
    this.engine.stops.forEach((stop, index) => {
      const stopIcon = L.divIcon({
        className: "custom-stop-marker",
        html: `
          <div class="stop-pin" title="${stop.name}">
            <span class="stop-dot">🚏</span>
            <span class="stop-label">${stop.shortName}</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(this.map);
      marker.bindPopup(`
        <div class="p-2 text-slate-800">
          <div class="font-bold text-sm text-blue-800">🚏 Stop ${index + 1}: ${stop.name}</div>
          <div class="text-xs text-slate-600 mt-1">${stop.landmark}</div>
          <div class="text-xs font-semibold text-emerald-600 mt-1">Zone: ${stop.zone}</div>
        </div>
      `);
      this.stopMarkers.push(marker);
    });
  }

  createBusIcon(bus) {
    const occupancyPercent = Math.round((bus.passengers / bus.capacity) * 100);
    const badgeColor =
      occupancyPercent >= 80 ? "#DC2626" : occupancyPercent >= 50 ? "#D97706" : "#16A34A";

    return L.divIcon({
      className: "bus-custom-marker-wrapper",
      html: `
        <div class="bus-marker-container ${bus.isDwelling ? "is-dwelling" : ""}" id="marker-bus-${bus.id}">
          <div class="bus-occupancy-pill" style="border-color:${badgeColor}">
            <span class="pill-code">${bus.code.split(" ")[0]}</span>
            <span class="pill-count" style="background:${badgeColor}">${bus.passengers}/${bus.capacity}</span>
          </div>
          <div class="bus-vehicle-body" style="transform: rotate(${bus.bearing || 0}deg); border-color:${bus.color}">
            <div class="bus-roof" style="background:${bus.color}">
              <span class="bus-mini-icon">🚌</span>
            </div>
          </div>
          ${bus.isDwelling ? '<div class="station-wait-ping"></div>' : ""}
        </div>
      `,
      iconSize: [48, 56],
      iconAnchor: [24, 28]
    });
  }

  renderInitialBuses() {
    this.engine.fleet.forEach(bus => {
      const icon = this.createBusIcon(bus);
      const marker = L.marker([bus.lat, bus.lng], { icon: icon }).addTo(this.map);

      // Directly open ETM Visual when clicking ANY bus on the map!
      marker.on("click", (e) => {
        if (e && e.originalEvent) {
          L.DomEvent.stopPropagation(e);
        }
        this.selectBus(bus.id);
        this.etmSimulator.openForBus(bus.id);
      });

      this.busMarkers[bus.id] = marker;
    });
  }

  getBusPopupContent(busId) {
    const bus = this.engine.getBus(busId);
    if (!bus) return "";

    const freeSeats = bus.capacity - bus.passengers;
    return `
      <div class="bus-interactive-popup">
        <div class="bus-popup-header" style="background:${bus.color}">
          <div class="font-extrabold text-sm text-white">${bus.code}</div>
          <span class="popup-seat-pill">${bus.passengers}/${bus.capacity} seats</span>
        </div>
        <div class="bus-popup-content">
          <div class="text-xs text-slate-600 mb-1">
            <strong>Conductor:</strong> ${bus.conductor} • ETM: <code>${bus.etmSerial}</code>
          </div>
          <div class="text-xs text-slate-600 mb-2">
            <strong>Status:</strong> <span class="text-blue-600 font-semibold">${bus.status}</span> 
            (${freeSeats} seats free)
          </div>
          <div class="popup-btn-actions">
            <button class="popup-book-btn" onclick="window.etmSimulator.openForBus(${bus.id})">
              🎫 Book Ticket (Open ETM)
            </button>
            <button class="popup-quick-btn" onclick="window.quickBookTicket(${bus.id})">
              ⚡ Quick +1 Ticket
            </button>
            <button class="popup-zoom-btn" onclick="window.interiorVisualizer.open(${bus.id})">
              🔍 Zoom Inside Bus
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderQuickFleetBar() {
    const container = document.getElementById("fleetQuickChipsBar");
    if (!container) return;

    let html = `
      <div class="quick-fleet-bar-wrapper">
        <div class="quick-bar-title">⚡ Instant Ticket Booking (Click Any Bus to Book):</div>
        <div class="quick-fleet-chips-scroll">
    `;

    this.engine.fleet.forEach(bus => {
      const freeSeats = bus.capacity - bus.passengers;
      html += `
        <div class="quick-bus-chip" onclick="window.etmSimulator.openForBus(${bus.id})">
          <span class="quick-chip-color" style="background:${bus.color}"></span>
          <span class="quick-chip-code">${bus.code.split(" ")[0]}</span>
          <span class="quick-chip-count" id="chip-count-${bus.id}">${bus.passengers}/${bus.capacity}</span>
          <button class="quick-chip-book-btn">🎫 Book</button>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  bindFleetEvents() {
    // Reactive subscription to simulation engine updates
    this.engine.subscribe((fleet) => {
      fleet.forEach(bus => {
        const marker = this.busMarkers[bus.id];
        if (marker) {
          marker.setLatLng([bus.lat, bus.lng]);
          marker.setIcon(this.createBusIcon(bus));
        }

        // Update quick chips count
        const chipCount = document.getElementById(`chip-count-${bus.id}`);
        if (chipCount) {
          chipCount.textContent = `${bus.passengers}/${bus.capacity}`;
        }
      });

      // Update inspector drawer if a bus is currently selected
      if (this.selectedBusId) {
        this.updateInspectorCard(this.selectedBusId);
      }

      // Update fleet stats banner
      this.updateStatsBanner(fleet);
    });

    // Control buttons (speed, pause)
    const btnPause = document.getElementById("btnFleetPause");
    const speedSelect = document.getElementById("fleetSpeedSelect");

    if (btnPause) {
      btnPause.addEventListener("click", () => {
        const running = this.engine.togglePause();
        btnPause.innerHTML = running ? "⏸️ Pause Simulation" : "▶️ Resume Simulation";
        btnPause.classList.toggle("paused", !running);
      });
    }

    if (speedSelect) {
      speedSelect.addEventListener("change", (e) => {
        this.engine.setSpeed(parseFloat(e.target.value));
      });
    }
  }

  selectBus(busId) {
    this.selectedBusId = Number(busId);
    const bus = this.engine.getBus(busId);
    if (!bus) return;

    this.map.panTo([bus.lat, bus.lng], { animate: true, duration: 0.5 });

    const drawer = document.getElementById("fleetBusInspector");
    if (drawer) drawer.classList.add("active");

    this.updateInspectorCard(busId);
  }

  closeInspector() {
    this.selectedBusId = null;
    const drawer = document.getElementById("fleetBusInspector");
    if (drawer) drawer.classList.remove("active");
  }

  updateInspectorCard(busId) {
    const bus = this.engine.getBus(busId);
    if (!bus) return;

    const drawer = document.getElementById("fleetBusInspector");
    if (!drawer) return;

    const occupancyPercent = Math.round((bus.passengers / bus.capacity) * 100);
    const freeSeats = bus.capacity - bus.passengers;
    const crowdStatus =
      occupancyPercent >= 80 ? "High Crowd 🔴" : occupancyPercent >= 50 ? "Moderate 🟡" : "Seats Available 🟢";

    drawer.innerHTML = `
      <div class="inspector-header">
        <div class="flex items-center gap-3">
          <div class="bus-badge-lg" style="background:${bus.color}">${bus.code}</div>
          <div>
            <h3 class="text-base font-bold text-slate-800">${bus.route}</h3>
            <p class="text-xs text-slate-500">Conductor: <strong>${bus.conductor}</strong> • ETM: <code>${bus.etmSerial}</code></p>
          </div>
        </div>
        <button class="inspector-close-btn" id="btnCloseInspector">✕</button>
      </div>

      <div class="inspector-metrics-grid">
        <div class="metric-card">
          <span class="metric-title">Passenger Count</span>
          <span class="metric-value font-mono ${occupancyPercent >= 80 ? 'text-red-600' : 'text-emerald-700'}">
            ${bus.passengers} / ${bus.capacity}
          </span>
          <span class="metric-sub">${freeSeats} seats available</span>
        </div>

        <div class="metric-card">
          <span class="metric-title">Crowd Level</span>
          <span class="metric-value text-sm font-semibold">${crowdStatus}</span>
          <div class="progress-track mt-1">
            <div class="progress-bar" style="width:${occupancyPercent}%; background:${occupancyPercent >= 80 ? '#DC2626' : occupancyPercent >= 50 ? '#D97706' : '#16A34A'}"></div>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-title">Current Status</span>
          <span class="metric-value text-sm font-medium ${bus.isDwelling ? 'text-amber-600' : 'text-blue-600'}">
            ${bus.status}
          </span>
          <span class="metric-sub">Speed: ${bus.speedKmh} km/h • GPS Active</span>
        </div>

        <div class="metric-card">
          <span class="metric-title">Next Destination Stop</span>
          <span class="metric-value text-sm font-bold text-slate-700">
            🚏 ${bus.nextStop ? bus.nextStop.shortName : "En Route"}
          </span>
          <span class="metric-sub">Auto-offload armed</span>
        </div>
      </div>

      <div class="inspector-active-manifest">
        <div class="manifest-header">Active Issued Tickets (${bus.tickets.length})</div>
        <div class="manifest-tags">
          ${bus.tickets.map(t => `
            <span class="manifest-tag">
              🎫 ${t.qty}x to <strong>${t.to}</strong> (Rs. ${t.fare})
            </span>
          `).join("") || '<span class="text-xs text-slate-400">No active tickets</span>'}
        </div>
      </div>

      <div class="inspector-action-buttons">
        <button class="btn-action-etm" id="btnInspectIssueTicket">
          <span class="icon">🎫</span>
          <div class="text-left">
            <div class="font-bold">Book Ticket (Open ETM)</div>
            <div class="text-2xs opacity-80">TNSTC ETM-500 Simulation</div>
          </div>
        </button>

        <button class="btn-action-interior" id="btnInspectZoomInterior">
          <span class="icon">🔍</span>
          <div class="text-left">
            <div class="font-bold">Zoom Inside Bus</div>
            <div class="text-2xs opacity-80">View Seated Passengers & Conductor</div>
          </div>
        </button>
      </div>
    `;

    const closeBtn = document.getElementById("btnCloseInspector");
    const issueBtn = document.getElementById("btnInspectIssueTicket");
    const interiorBtn = document.getElementById("btnInspectZoomInterior");

    if (closeBtn) closeBtn.addEventListener("click", () => this.closeInspector());
    if (issueBtn) issueBtn.addEventListener("click", () => this.etmSimulator.openForBus(bus.id));
    if (interiorBtn) interiorBtn.addEventListener("click", () => this.interiorVisualizer.open(bus.id));
  }

  updateStatsBanner(fleet) {
    const elTotalPass = document.getElementById("statTotalPassengers");
    const elActiveBuses = document.getElementById("statActiveBuses");
    const elAvgOccupancy = document.getElementById("statAvgOccupancy");

    if (elTotalPass) {
      const total = fleet.reduce((sum, b) => sum + b.passengers, 0);
      elTotalPass.textContent = total;
    }
    if (elActiveBuses) {
      elActiveBuses.textContent = fleet.length;
    }
    if (elAvgOccupancy) {
      const totalCap = fleet.reduce((sum, b) => sum + b.capacity, 0);
      const totalPass = fleet.reduce((sum, b) => sum + b.passengers, 0);
      const pct = Math.round((totalPass / totalCap) * 100);
      elAvgOccupancy.textContent = `${pct}%`;
    }
  }

  refreshSize() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 150);
      setTimeout(() => this.map.invalidateSize(), 400);
    }
  }
}

// Global Quick Book Function
window.quickBookTicket = function(busId) {
  const bus = window.simulationEngine.getBus(busId);
  if (!bus) return;

  const nextStop = bus.nextStop || window.simulationEngine.stops[0];
  const res = window.simulationEngine.issueTicket(busId, {
    to: nextStop.shortName || nextStop.name,
    qty: 1,
    fare: 15.00,
    fareType: "FULL"
  });

  if (res.success) {
    window.etmSimulator.playSuccessChime();
    alert(`🎫 Quick Ticket Booked for ${bus.code}!\nDestination: ${nextStop.shortName}\nPassengers Aboard: ${bus.passengers}/${bus.capacity}`);
  } else {
    alert(res.message);
  }
};
