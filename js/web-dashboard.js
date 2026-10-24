// Passenger Web Dashboard (Screen 2)
// Solves button clicking by using robust event delegation and throttled updates.
// Dedicated Single-Bus Radar Map replicates Image 2:
// Shows ONLY the tracked bus with status pill, (YOU) pickup stop, (DEST) destination stop,
// and connecting route loop.

class WebDashboardView {
  constructor(engine) {
    this.engine = engine;
    this.userDetails = null;
    this.selectedBusToTrack = null;
    this.trackMap = null;
    this.trackBusMarker = null;
    this.trackUserMarker = null;
    this.trackDestMarker = null;
    this.trackRouteLine = null;
    this.tileLayer = null;
    this.lastRenderTime = 0;

    this.initElements();
    this.bindEvents();
    this.populateStopSelects();
  }

  initElements() {
    this.formSection = document.getElementById("webUserFormSection");
    this.resultsSection = document.getElementById("webResultsSection");
    this.trackingSection = document.getElementById("webTrackingSection");
    this.form = document.getElementById("webTripPlannerForm");
    this.busListContainer = document.getElementById("webBusList");
    this.alertBannerContainer = document.getElementById("web5MinAlertBanner");
    this.userGreeting = document.getElementById("webUserGreeting");
  }

  populateStopSelects() {
    const pickupSelect = document.getElementById("webPickupStop");
    const destSelect = document.getElementById("webDestStop");

    if (pickupSelect && destSelect) {
      pickupSelect.innerHTML = `<option value="">-- Choose Your Current Stop / Location --</option>`;
      destSelect.innerHTML = `<option value="">-- Choose Your Destination Stop --</option>`;

      this.engine.stops.forEach(stop => {
        pickupSelect.innerHTML += `<option value="${stop.id}">${stop.shortName} (${stop.zone})</option>`;
        destSelect.innerHTML += `<option value="${stop.id}">${stop.shortName} (${stop.landmark})</option>`;
      });

      // Default demo values for Coimbatore
      pickupSelect.value = "stop-1"; // Gandhipuram Central
      destSelect.value = "stop-6";   // Coimbatore Jn
    }
  }

  bindEvents() {
    if (this.form) {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    const btnGps = document.getElementById("webBtnAutoGps");
    if (btnGps) {
      btnGps.addEventListener("click", () => {
        const pickupSelect = document.getElementById("webPickupStop");
        if (pickupSelect) {
          pickupSelect.value = "stop-5"; // Town Hall
          btnGps.innerHTML = "✅ GPS Detected: Town Hall";
          setTimeout(() => {
            btnGps.innerHTML = "📍 Detect My GPS Location";
          }, 3000);
        }
      });
    }

    const btnEdit = document.getElementById("webBtnEditDetails");
    if (btnEdit) {
      btnEdit.addEventListener("click", () => {
        this.showFormView();
      });
    }

    const btnBackTrack = document.getElementById("webBtnBackToResults");
    if (btnBackTrack) {
      btnBackTrack.addEventListener("click", () => {
        this.showResultsView();
      });
    }

    // ROBUST EVENT DELEGATION: Guaranteed click capture!
    // Catches clicks on ANY "Track This Bus" button inside the container
    if (this.busListContainer) {
      this.busListContainer.addEventListener("click", (e) => {
        const trackBtn = e.target.closest(".btn-web-track-bus");
        if (trackBtn) {
          e.preventDefault();
          e.stopPropagation();
          const busId = trackBtn.getAttribute("data-bus-id");
          if (busId) {
            this.showTrackingView(Number(busId));
          }
        }
      });
    }

    // Event delegation on 5-Minute Alert Banner button
    if (this.alertBannerContainer) {
      this.alertBannerContainer.addEventListener("click", (e) => {
        const alertBtn = e.target.closest(".btn-alert-track");
        if (alertBtn) {
          e.preventDefault();
          e.stopPropagation();
          const busId = alertBtn.getAttribute("data-bus-id");
          if (busId) {
            this.showTrackingView(Number(busId));
          }
        }
      });
    }

    // Global simulation subscriber with throttled UI update
    this.engine.subscribe((fleet) => {
      const now = performance.now();
      if (this.userDetails && !this.selectedBusToTrack) {
        // Throttle full card regeneration to once every 1000ms to preserve DOM elements during clicks!
        if (now - this.lastRenderTime > 1000 || !this.busListContainer.hasChildNodes()) {
          this.lastRenderTime = now;
          this.updateBusRecommendations(fleet);
        } else {
          this.updateLiveCardMetricsOnly(fleet);
        }
      } else if (this.selectedBusToTrack) {
        this.updateSingleBusTracking(fleet);
      }
    });
  }

  handleFormSubmit() {
    const nameInput = document.getElementById("webUserName");
    const phoneInput = document.getElementById("webUserPhone");
    const pickupSelect = document.getElementById("webPickupStop");
    const destSelect = document.getElementById("webDestStop");

    const pickupStop = this.engine.stops.find(s => s.id === pickupSelect.value);
    const destStop = this.engine.stops.find(s => s.id === destSelect.value);

    if (!pickupStop || !destStop) {
      alert("Please select both your current stop and destination stop!");
      return;
    }

    if (pickupStop.id === destStop.id) {
      alert("Destination must be different from current pickup stop!");
      return;
    }

    this.userDetails = {
      name: nameInput.value.trim() || "Kavitha Sundaram",
      phone: phoneInput.value.trim() || "+91 98421 67890",
      pickupStop,
      destStop
    };

    if (this.userGreeting) {
      this.userGreeting.innerHTML = `
        Hello, <strong>${this.userDetails.name}</strong>! Smart AI has analyzed oncoming buses from 
        <span class="text-blue-600 font-bold">${pickupStop.shortName}</span> to 
        <span class="text-emerald-600 font-bold">${destStop.shortName}</span>.
      `;
    }

    this.showResultsView();
    this.updateBusRecommendations(this.engine.fleet);
  }

  showFormView() {
    this.selectedBusToTrack = null;
    this.formSection.classList.remove("hidden");
    this.resultsSection.classList.add("hidden");
    this.trackingSection.classList.add("hidden");
  }

  showResultsView() {
    this.selectedBusToTrack = null;
    this.formSection.classList.add("hidden");
    this.resultsSection.classList.remove("hidden");
    this.trackingSection.classList.add("hidden");
    this.updateBusRecommendations(this.engine.fleet);
  }

  showTrackingView(busId) {
    this.selectedBusToTrack = Number(busId);
    this.formSection.classList.add("hidden");
    this.resultsSection.classList.add("hidden");
    this.trackingSection.classList.remove("hidden");

    // Initialize dedicated single-bus map
    this.initSingleBusTrackingMap();
    this.updateSingleBusTracking(this.engine.fleet);

    // Smoothly focus on bus and pickup point
    const bus = this.engine.getBus(busId);
    if (bus && this.trackMap) {
      this.trackMap.setView([bus.lat, bus.lng], 15);
    }
  }

  updateBusRecommendations(fleet) {
    if (!this.userDetails || !this.busListContainer) return;

    const { pickupStop, destStop } = this.userDetails;

    const evaluatedBuses = fleet.map(bus => {
      const eta = this.engine.calculateETA(bus, pickupStop);
      const freeSeats = bus.capacity - bus.passengers;
      const occupancyRate = bus.passengers / bus.capacity;
      const comfortScore = Math.max(0, 100 - (eta.minutes * 4) + (freeSeats * 1.2));
      return { bus, eta, freeSeats, occupancyRate, score: comfortScore };
    });

    evaluatedBuses.sort((a, b) => a.eta.minutes - b.eta.minutes);

    // 5-minute arrival alert box
    const imminentBus = evaluatedBuses.find(b => b.eta.minutes <= 5);
    if (imminentBus && this.alertBannerContainer) {
      this.alertBannerContainer.innerHTML = `
        <div class="arrival-alert-box animate-pulse">
          <div class="alert-icon">⚡</div>
          <div class="alert-content">
            <h4 class="font-bold text-amber-900">
              5-MINUTE ARRIVAL NOTIFICATION ALERT!
            </h4>
            <p class="text-sm text-amber-800">
              <strong>${imminentBus.bus.code}</strong> is arriving at 
              <u>${pickupStop.shortName}</u> in approximately 
              <span class="font-bold text-red-600">${imminentBus.eta.minutes} mins</span> 
              (${imminentBus.freeSeats} seats available). Conductor on duty: ${imminentBus.bus.conductor}.
            </p>
          </div>
          <button class="btn-alert-track" data-bus-id="${imminentBus.bus.id}">
            Track This Bus ➔
          </button>
        </div>
      `;
      this.alertBannerContainer.classList.remove("hidden");
    } else if (this.alertBannerContainer) {
      this.alertBannerContainer.classList.add("hidden");
    }

    // Render list cards with data-bus-id attribute for event delegation
    let html = "";
    evaluatedBuses.forEach((item, index) => {
      const { bus, eta, freeSeats, occupancyRate } = item;
      const isBest = index === 0;
      const crowdBadge =
        occupancyRate >= 0.8
          ? `<span class="badge-crowd-red">Crowded 🔴</span>`
          : occupancyRate >= 0.5
          ? `<span class="badge-crowd-yellow">Moderate 🟡</span>`
          : `<span class="badge-crowd-green">Low Crowd 🟢</span>`;

      html += `
        <div class="web-bus-card ${isBest ? 'best-choice-card' : ''}" id="web-bus-card-${bus.id}">
          ${isBest ? `<div class="ai-best-badge">⭐ AI RECOMMENDED (FASTEST & COMFORTABLE)</div>` : ""}
          <div class="web-bus-header">
            <div class="flex items-center gap-3">
              <span class="bus-number-chip" style="background:${bus.color}">${bus.code}</span>
              <div>
                <h4 class="font-bold text-slate-800">${bus.route}</h4>
                <div class="text-xs text-slate-500">Conductor: <strong>${bus.conductor}</strong> • ETM Synced</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-black ${eta.minutes <= 5 ? 'text-red-600' : 'text-blue-700'} card-eta-text">
                ${eta.minutes} <span class="text-xs font-semibold">MINS</span>
              </div>
              <div class="text-2xs text-slate-400 card-dist-text">${eta.distanceKm} km away</div>
            </div>
          </div>

          <div class="web-bus-body">
            <div class="bus-meta-row">
              <div class="meta-item">
                <span class="meta-label">Live Passenger Count</span>
                <span class="meta-val font-mono font-bold ${occupancyRate >= 0.8 ? 'text-red-600' : 'text-emerald-700'} card-passengers-text">
                  ${bus.passengers} / ${bus.capacity}
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Seats Available</span>
                <span class="meta-val font-bold text-emerald-600 card-freeseats-text">${freeSeats} Free</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Crowd Status</span>
                <span class="meta-val">${crowdBadge}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Current Location</span>
                <span class="meta-val text-slate-700 card-loc-text">${bus.nearestStop ? bus.nearestStop.shortName : "En Route"}</span>
              </div>
            </div>

            <div class="occupancy-progress-wrapper mt-3">
              <div class="flex justify-between text-2xs font-semibold mb-1 text-slate-500">
                <span>Bus Capacity Occupancy</span>
                <span class="card-pct-text">${Math.round(occupancyRate * 100)}%</span>
              </div>
              <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-300 card-progress-bar" style="width:${Math.round(occupancyRate * 100)}%; background:${occupancyRate >= 0.8 ? '#DC2626' : occupancyRate >= 0.5 ? '#D97706' : '#16A34A'}"></div>
              </div>
            </div>
          </div>

          <div class="web-bus-footer">
            <div class="fare-quote text-xs text-slate-600">
              Est. Fare: <strong class="text-slate-800">Rs. 15.00</strong> (TNSTC Conductor ETM on board)
            </div>
            <button type="button" class="btn-web-track-bus" data-bus-id="${bus.id}">
              <span>📍</span>
              <strong>Track This Bus</strong>
            </button>
          </div>
        </div>
      `;
    });

    this.busListContainer.innerHTML = html;
  }

  updateLiveCardMetricsOnly(fleet) {
    if (!this.userDetails) return;
    const { pickupStop } = this.userDetails;

    fleet.forEach(bus => {
      const card = document.getElementById(`web-bus-card-${bus.id}`);
      if (!card) return;

      const eta = this.engine.calculateETA(bus, pickupStop);
      const freeSeats = bus.capacity - bus.passengers;
      const occupancyRate = bus.passengers / bus.capacity;

      const etaEl = card.querySelector(".card-eta-text");
      if (etaEl) {
        etaEl.innerHTML = `${eta.minutes} <span class="text-xs font-semibold">MINS</span>`;
      }

      const passEl = card.querySelector(".card-passengers-text");
      if (passEl) {
        passEl.textContent = `${bus.passengers} / ${bus.capacity}`;
      }

      const freeEl = card.querySelector(".card-freeseats-text");
      if (freeEl) {
        freeEl.textContent = `${freeSeats} Free`;
      }

      const barEl = card.querySelector(".card-progress-bar");
      if (barEl) {
        barEl.style.width = `${Math.round(occupancyRate * 100)}%`;
      }
    });
  }

  initSingleBusTrackingMap() {
    const mapEl = document.getElementById("webSingleBusMap");
    if (!mapEl) return;

    if (!this.trackMap) {
      this.trackMap = L.map("webSingleBusMap", {
        center: [11.008, 76.965],
        zoom: 14,
        attributionControl: false
      });

      // Google Maps Tile Layer with English labels strictly enforced (hl=en)
      this.tileLayer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}", {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20
      }).addTo(this.trackMap);

      // Route path line connecting the stops (Image 2 aesthetic)
      this.trackRouteLine = L.polyline(this.engine.routePath, {
        color: "#2563EB",
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(this.trackMap);
    }

    // Force Leaflet recalculation
    setTimeout(() => { if (this.trackMap) this.trackMap.invalidateSize(); }, 50);
    setTimeout(() => { if (this.trackMap) this.trackMap.invalidateSize(); }, 200);
    setTimeout(() => { if (this.trackMap) this.trackMap.invalidateSize(); }, 500);
  }

  // Renders the dedicated single-bus radar matching Image 2
  updateSingleBusTracking(fleet) {
    if (!this.selectedBusToTrack || !this.trackMap) return;
    const bus = fleet.find(b => b.id === this.selectedBusToTrack);
    if (!bus) return;

    const { pickupStop, destStop } = this.userDetails || {};
    const eta = pickupStop ? this.engine.calculateETA(bus, pickupStop) : { minutes: 0, distanceKm: 0 };
    const freeSeats = bus.capacity - bus.passengers;
    const occupancyRate = bus.passengers / bus.capacity;

    // Bus status text
    const statusText = bus.isDwelling
      ? `STOPPED: ${Math.ceil(bus.dwellRemaining || 0)}s (BOARDING)`
      : `MOVING: ${bus.speedKmh} km/h (EN ROUTE)`;
    const statusBg = bus.isDwelling ? '#DC2626' : '#16A34A';

    // Single Bus Marker matching Image 2
    const busIcon = L.divIcon({
      className: "single-bus-tracker-icon",
      html: `
        <div class="image2-bus-marker-wrapper">
          <!-- Top Blue Badge -->
          <div class="image2-bus-pill">
            <span class="image2-pulse-dot"></span>
            <strong>BUS #${bus.id} - ${bus.passengers}/${bus.capacity}</strong>
          </div>
          <!-- Vehicle Body with heading rotation -->
          <div class="image2-bus-vehicle" style="transform: rotate(${bus.bearing || 0}deg);">
            <div class="image2-bus-roof" style="background:${bus.color}">🚌</div>
          </div>
          <!-- Status Banner under bus -->
          <div class="image2-bus-status-banner" style="border-color:${statusBg}">
            <span class="status-indicator-dot" style="background:${statusBg}"></span>
            <span>${statusText}</span>
          </div>
        </div>
      `,
      iconSize: [160, 90],
      iconAnchor: [80, 45]
    });

    if (!this.trackBusMarker) {
      this.trackBusMarker = L.marker([bus.lat, bus.lng], { icon: busIcon }).addTo(this.trackMap);
    } else {
      this.trackBusMarker.setLatLng([bus.lat, bus.lng]);
      this.trackBusMarker.setIcon(busIcon);
    }

    // (YOU) Pickup Point Marker matching Image 2
    if (!this.trackUserMarker && pickupStop) {
      const userIcon = L.divIcon({
        className: "image2-stop-marker-wrapper",
        html: `
          <div class="image2-user-pickup-pill">
            <span class="image2-user-dot">📍</span>
            <span>(YOU) ${pickupStop.shortName}</span>
          </div>
        `,
        iconSize: [140, 32],
        iconAnchor: [70, 16]
      });
      this.trackUserMarker = L.marker([pickupStop.lat, pickupStop.lng], { icon: userIcon }).addTo(this.trackMap);
    }

    // (DEST) Destination Marker matching Image 2
    if (!this.trackDestMarker && destStop) {
      const destIcon = L.divIcon({
        className: "image2-stop-marker-wrapper",
        html: `
          <div class="image2-dest-pill">
            <span class="image2-dest-dot">🎯</span>
            <span>(DEST) ${destStop.shortName}</span>
          </div>
        `,
        iconSize: [140, 32],
        iconAnchor: [70, 16]
      });
      this.trackDestMarker = L.marker([destStop.lat, destStop.lng], { icon: destIcon }).addTo(this.trackMap);
    }

    // Smoothly pan map to follow this bus
    this.trackMap.panTo([bus.lat, bus.lng], { animate: true, duration: 0.3 });

    // Live Telemetry Panel
    const infoPanel = document.getElementById("webTrackingInfoPanel");
    if (infoPanel) {
      infoPanel.innerHTML = `
        <div class="tracking-live-header">
          <div class="flex items-center gap-3">
            <span class="bus-badge-lg" style="background:${bus.color}">${bus.code}</span>
            <div>
              <h3 class="text-lg font-bold text-slate-800">${bus.route}</h3>
              <p class="text-xs text-slate-500">Live GPS Dedicated Radar • Conductor: <strong>${bus.conductor}</strong></p>
            </div>
          </div>
          <div class="live-pill">● TRACKING BUS #${bus.id} ONLY</div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div class="track-stat-box">
            <span class="text-xs text-slate-400 uppercase">Estimated Arrival</span>
            <span class="text-xl font-black ${eta.minutes <= 5 ? 'text-red-600' : 'text-blue-700'}">
              ${eta.minutes} MINS
            </span>
            <span class="text-2xs text-slate-500">${eta.distanceKm} km to pickup</span>
          </div>

          <div class="track-stat-box">
            <span class="text-xs text-slate-400 uppercase">Live Passenger Count</span>
            <span class="text-xl font-mono font-bold ${occupancyRate >= 0.8 ? 'text-red-600' : 'text-emerald-700'}">
              ${bus.passengers} / ${bus.capacity}
            </span>
            <span class="text-2xs text-slate-500">${freeSeats} seats available</span>
          </div>

          <div class="track-stat-box">
            <span class="text-xs text-slate-400 uppercase">Movement Status</span>
            <span class="text-base font-bold text-slate-700">${statusText}</span>
            <span class="text-2xs text-slate-500">Speed: ${bus.speedKmh} km/h</span>
          </div>

          <div class="track-stat-box">
            <span class="text-xs text-slate-400 uppercase">Next Station</span>
            <span class="text-base font-bold text-indigo-700">🚏 ${bus.nextStop ? bus.nextStop.shortName : "En Route"}</span>
            <span class="text-2xs text-slate-500">Auto-offload armed</span>
          </div>
        </div>

        <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
          <span>
            💡 <strong>Single Bus Radar:</strong> Tracking only Bus #${bus.id}. Real-time passenger count updates automatically via Conductor's ETM!
          </span>
          <span class="font-mono text-blue-800">ETM: ${bus.etmSerial}</span>
        </div>
      `;
    }
  }

  refreshSize() {
    if (this.trackMap) {
      setTimeout(() => this.trackMap.invalidateSize(), 100);
      setTimeout(() => this.trackMap.invalidateSize(), 300);
    }
  }
}
