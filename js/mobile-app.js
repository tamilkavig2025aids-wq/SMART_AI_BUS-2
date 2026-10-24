// Mobile App UI/UX Simulator (Screen 3)
// Robust event delegation for mobile "Track Bus" button.
// Replicates Image 2 dedicated single-bus view inside the smartphone frame!

class MobileAppSimulator {
  constructor(engine) {
    this.engine = engine;
    this.currentStop = this.engine.stops[0]; // Default: Gandhipuram Central
    this.selectedBusToTrack = null;
    this.phoneMap = null;
    this.phoneBusMarker = null;
    this.phoneUserMarker = null;
    this.phoneDestMarker = null;
    this.phonePolyline = null;
    this.tileLayer = null;
    this.lastRenderTime = 0;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.feedView = document.getElementById("mobileFeedView");
    this.trackingView = document.getElementById("mobileTrackingView");
    this.busListEl = document.getElementById("mobileBusList");
    this.alertBox = document.getElementById("mobilePushAlert");
    this.userLocationText = document.getElementById("mobileUserLocationText");
    this.locationSelector = document.getElementById("mobileStopSelector");

    if (this.locationSelector) {
      this.locationSelector.innerHTML = "";
      this.engine.stops.forEach(stop => {
        const opt = document.createElement("option");
        opt.value = stop.id;
        opt.textContent = stop.shortName;
        if (stop.id === this.currentStop.id) opt.selected = true;
        this.locationSelector.appendChild(opt);
      });

      this.locationSelector.addEventListener("change", (e) => {
        const found = this.engine.stops.find(s => s.id === e.target.value);
        if (found) {
          this.currentStop = found;
          if (this.userLocationText) {
            this.userLocationText.textContent = this.currentStop.shortName;
          }
          this.updateMobileFeed(this.engine.fleet);
        }
      });
    }

    if (this.userLocationText) {
      this.userLocationText.textContent = this.currentStop.shortName;
    }
  }

  bindEvents() {
    const backBtn = document.getElementById("mobileBtnBackToFeed");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.showFeedScreen();
      });
    }

    // EVENT DELEGATION on mobile bus list
    if (this.busListEl) {
      this.busListEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".mobile-btn-track");
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          const busId = btn.getAttribute("data-bus-id");
          if (busId) {
            this.showTrackingScreen(Number(busId));
          }
        }
      });
    }

    // EVENT DELEGATION on mobile push alert
    if (this.alertBox) {
      this.alertBox.addEventListener("click", (e) => {
        const btn = e.target.closest(".notif-action-btn");
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          const busId = btn.getAttribute("data-bus-id");
          if (busId) {
            this.showTrackingScreen(Number(busId));
          }
        }
      });
    }

    this.engine.subscribe((fleet) => {
      const now = performance.now();
      if (!this.selectedBusToTrack) {
        if (now - this.lastRenderTime > 1000 || !this.busListEl.hasChildNodes()) {
          this.lastRenderTime = now;
          this.updateMobileFeed(fleet);
        }
      } else {
        this.updateMobileTracking(fleet);
      }
    });

    const clockEl = document.getElementById("phoneClockTime");
    if (clockEl) {
      setInterval(() => {
        const d = new Date();
        clockEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }, 1000);
    }
  }

  showFeedScreen() {
    this.selectedBusToTrack = null;
    if (this.feedView) this.feedView.classList.remove("hidden");
    if (this.trackingView) this.trackingView.classList.add("hidden");
    this.updateMobileFeed(this.engine.fleet);
  }

  showTrackingScreen(busId) {
    this.selectedBusToTrack = Number(busId);
    if (this.feedView) this.feedView.classList.add("hidden");
    if (this.trackingView) this.trackingView.classList.remove("hidden");

    this.initMobileMap();
    this.updateMobileTracking(this.engine.fleet);

    const bus = this.engine.getBus(busId);
    if (bus && this.phoneMap) {
      this.phoneMap.setView([bus.lat, bus.lng], 15);
    }
  }

  updateMobileFeed(fleet) {
    if (!this.busListEl || !this.currentStop) return;

    const busesWithEta = fleet.map(bus => {
      const eta = this.engine.calculateETA(bus, this.currentStop);
      const freeSeats = bus.capacity - bus.passengers;
      const occupancyRate = bus.passengers / bus.capacity;
      return { bus, eta, freeSeats, occupancyRate };
    });

    busesWithEta.sort((a, b) => a.eta.minutes - b.eta.minutes);

    // 5-min push alert
    const imminent = busesWithEta.find(b => b.eta.minutes <= 5);
    if (imminent && this.alertBox) {
      this.alertBox.innerHTML = `
        <div class="mobile-notification-card animate-bounce">
          <div class="notif-header">
            <span class="notif-app">SMART BUS • NOW</span>
            <span class="notif-badge">ARRIVAL ALERT</span>
          </div>
          <div class="notif-body">
            <strong>${imminent.bus.code}</strong> arriving in 
            <span class="text-red-500 font-bold">${imminent.eta.minutes} mins</span> at ${this.currentStop.shortName}!
            <br><span class="text-2xs text-slate-400 font-mono">🟢 ${imminent.freeSeats} Seats Free • ETM Synced</span>
          </div>
          <button type="button" class="notif-action-btn" data-bus-id="${imminent.bus.id}">
            Track Bus ➔
          </button>
        </div>
      `;
      this.alertBox.classList.remove("hidden");
    } else if (this.alertBox) {
      this.alertBox.classList.add("hidden");
    }

    let html = "";
    busesWithEta.forEach((item) => {
      const { bus, eta, freeSeats, occupancyRate } = item;
      const crowdColor =
        occupancyRate >= 0.8 ? "text-red-500" : occupancyRate >= 0.5 ? "text-amber-500" : "text-emerald-500";
      const crowdBg =
        occupancyRate >= 0.8 ? "bg-red-50 border-red-200" : occupancyRate >= 0.5 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";

      html += `
        <div class="mobile-bus-item">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="mobile-bus-chip" style="background:${bus.color}">
                ${bus.code.split(" ")[0]}
              </span>
              <div>
                <div class="font-bold text-xs text-slate-900">${bus.route}</div>
                <div class="text-3xs text-slate-500">Cond: ${bus.conductor}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-black ${eta.minutes <= 5 ? 'text-red-600' : 'text-blue-600'}">
                ${eta.minutes} min
              </div>
              <div class="text-3xs text-slate-400">${eta.distanceKm} km</div>
            </div>
          </div>

          <div class="mobile-occupancy-pill ${crowdBg} mt-2 flex items-center justify-between text-2xs p-1.5 rounded">
            <span class="font-medium ${crowdColor}">
              ● Live: ${bus.passengers}/${bus.capacity} seats
            </span>
            <span class="font-bold text-slate-700">${freeSeats} Free</span>
          </div>

          <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span class="text-3xs text-slate-400">
              Next: ${bus.nextStop ? bus.nextStop.shortName : "En Route"}
            </span>
            <button type="button" class="mobile-btn-track" data-bus-id="${bus.id}">
              <span>📍</span> Track Bus
            </button>
          </div>
        </div>
      `;
    });

    this.busListEl.innerHTML = html;
  }

  initMobileMap() {
    const mapEl = document.getElementById("mobileTrackingMap");
    if (!mapEl) return;

    if (!this.phoneMap) {
      this.phoneMap = L.map("mobileTrackingMap", {
        center: [11.008, 76.965],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      this.tileLayer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}", {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20
      }).addTo(this.phoneMap);

      this.phonePolyline = L.polyline(this.engine.routePath, {
        color: "#2563EB",
        weight: 5,
        opacity: 0.8
      }).addTo(this.phoneMap);
    }

    setTimeout(() => { if (this.phoneMap) this.phoneMap.invalidateSize(); }, 50);
    setTimeout(() => { if (this.phoneMap) this.phoneMap.invalidateSize(); }, 200);
    setTimeout(() => { if (this.phoneMap) this.phoneMap.invalidateSize(); }, 500);
  }

  updateMobileTracking(fleet) {
    if (!this.selectedBusToTrack || !this.phoneMap) return;
    const bus = fleet.find(b => b.id === this.selectedBusToTrack);
    if (!bus) return;

    const eta = this.engine.calculateETA(bus, this.currentStop);
    const freeSeats = bus.capacity - bus.passengers;
    const occupancyRate = bus.passengers / bus.capacity;

    const statusText = bus.isDwelling ? `STOPPED: ${Math.ceil(bus.dwellRemaining || 0)}s` : `MOVING: ${bus.speedKmh} km/h`;

    // Single Bus Marker matching Image 2
    const busIcon = L.divIcon({
      className: "phone-bus-marker-wrapper",
      html: `
        <div class="image2-mobile-bus-marker">
          <div class="image2-mobile-pill">
            ● BUS #${bus.id} - ${bus.passengers}/${bus.capacity}
          </div>
          <div class="image2-bus-vehicle" style="transform: rotate(${bus.bearing || 0}deg); width:26px; height:26px;">
            <div class="image2-bus-roof" style="background:${bus.color}; font-size:0.75rem;">🚌</div>
          </div>
        </div>
      `,
      iconSize: [120, 50],
      iconAnchor: [60, 25]
    });

    if (!this.phoneBusMarker) {
      this.phoneBusMarker = L.marker([bus.lat, bus.lng], { icon: busIcon }).addTo(this.phoneMap);
    } else {
      this.phoneBusMarker.setLatLng([bus.lat, bus.lng]);
      this.phoneBusMarker.setIcon(busIcon);
    }

    // User marker
    if (!this.phoneUserMarker && this.currentStop) {
      const userIcon = L.divIcon({
        className: "phone-user-marker",
        html: `
          <div class="image2-user-pickup-pill" style="font-size:0.6rem; padding:1px 6px;">
            <span>📍 (YOU) ${this.currentStop.shortName}</span>
          </div>
        `,
        iconSize: [120, 26],
        iconAnchor: [60, 13]
      });
      this.phoneUserMarker = L.marker([this.currentStop.lat, this.currentStop.lng], { icon: userIcon }).addTo(this.phoneMap);
    }

    this.phoneMap.panTo([bus.lat, bus.lng], { animate: true, duration: 0.3 });

    // Drawer info
    const drawer = document.getElementById("mobileTrackingSheet");
    if (drawer) {
      drawer.innerHTML = `
        <div class="sheet-pill-handle"></div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="mobile-bus-chip" style="background:${bus.color}">${bus.code.split(" ")[0]}</span>
            <div>
              <h4 class="text-xs font-bold text-slate-800">${bus.route}</h4>
              <p class="text-3xs text-slate-400">Conductor: ${bus.conductor}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-base font-black ${eta.minutes <= 5 ? 'text-red-600' : 'text-blue-600'}">
              ${eta.minutes} min
            </span>
            <div class="text-3xs text-slate-400">ETA to ${this.currentStop.shortName}</div>
          </div>
        </div>

        <div class="mobile-metrics-strip mt-2">
          <div class="strip-item">
            <span class="strip-label">Passengers</span>
            <span class="strip-val font-mono ${occupancyRate >= 0.8 ? 'text-red-500' : 'text-emerald-500'}">
              ${bus.passengers}/${bus.capacity}
            </span>
          </div>
          <div class="strip-item">
            <span class="strip-label">Available</span>
            <span class="strip-val text-emerald-600">${freeSeats} Seats</span>
          </div>
          <div class="strip-item">
            <span class="strip-label">Status</span>
            <span class="strip-val text-3xs">${statusText}</span>
          </div>
          <div class="strip-item">
            <span class="strip-label">ETM GPS</span>
            <span class="strip-val text-blue-600">SYNCED</span>
          </div>
        </div>

        <div class="mobile-sheet-actions mt-3">
          <button class="mobile-btn-notify" onclick="alert('🔔 1-minute boarding reminder active!')">
            🔔 1-Min Alert
          </button>
          <button class="mobile-btn-share" onclick="alert('📲 Live ETA link copied to clipboard!')">
            🔗 Share Trip
          </button>
        </div>
      `;
    }
  }

  refreshSize() {
    if (this.phoneMap) {
      setTimeout(() => this.phoneMap.invalidateSize(), 100);
      setTimeout(() => this.phoneMap.invalidateSize(), 300);
    }
  }
}
