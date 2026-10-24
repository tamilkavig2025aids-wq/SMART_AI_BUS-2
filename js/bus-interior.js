// Bus Interior Cutaway Visualizer
// Shows inside of the bus: seated passengers according to live count,
// and conductor standing with ETM machine in hand. Clicking ETM zooms into hardware simulation.

class BusInteriorVisualizer {
  constructor(engine, etmSimulator) {
    this.engine = engine;
    this.etmSimulator = etmSimulator;
    this.activeBusId = null;

    this.modal = document.getElementById("interiorModal");
    this.closeBtn = document.getElementById("interiorCloseBtn");
    this.busTitle = document.getElementById("interiorBusTitle");
    this.busSubtitle = document.getElementById("interiorBusSubtitle");
    this.cabinContainer = document.getElementById("interiorCabinGrid");
    this.conductorCard = document.getElementById("interiorConductorCard");

    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }

    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) {
        this.close();
      }
    });

    // Listen to fleet engine updates to refresh interior in real time if open
    this.engine.subscribe((fleet) => {
      if (this.isOpen() && this.activeBusId) {
        this.renderInterior(this.activeBusId);
      }
    });
  }

  open(busId) {
    this.activeBusId = Number(busId);
    this.renderInterior(this.activeBusId);
    if (this.modal) {
      this.modal.classList.add("active");
      document.body.classList.add("modal-open");
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove("active");
      document.body.classList.remove("modal-open");
    }
  }

  isOpen() {
    return this.modal && this.modal.classList.contains("active");
  }

  renderInterior(busId) {
    const bus = this.engine.getBus(busId);
    if (!bus) return;

    if (this.busTitle) {
      this.busTitle.innerHTML = `
        <span class="inline-flex items-center gap-2">
          <span class="bus-color-dot" style="background:${bus.color}"></span>
          Interior Cabin: ${bus.code}
        </span>
      `;
    }

    if (this.busSubtitle) {
      const freeSeats = bus.capacity - bus.passengers;
      this.busSubtitle.innerHTML = `
        <span class="text-emerald-400 font-semibold">${bus.passengers} Passengers Aboard</span> | 
        <span class="text-blue-300">${freeSeats} Seats Free</span> | 
        <span>Conductor: <strong>${bus.conductor}</strong></span> |
        <span>Speed: ${bus.speedKmh} km/h</span> |
        <span class="text-amber-400">Next: ${bus.nextStop ? bus.nextStop.shortName : "En Route"}</span>
      `;
    }

    // Render Conductor Spotlight with ETM Machine in hand
    if (this.conductorCard) {
      this.conductorCard.innerHTML = `
        <div class="conductor-profile-box">
          <div class="conductor-avatar-wrapper">
            <div class="conductor-badge">ON-DUTY CONDUCTOR</div>
            <div class="conductor-figure">
              <div class="conductor-cap">👮</div>
              <div class="conductor-body">
                <div class="conductor-head">👤</div>
                <div class="conductor-uniform">🧥</div>
                <div class="conductor-arm-etm pulse-glow" id="zoomEtmFromInterior">
                  <div class="mini-etm-device">
                    <span class="mini-etm-screen">ETM-500</span>
                    <span class="mini-pulse-dot"></span>
                  </div>
                  <div class="zoom-tooltip">🔍 Zoom into ETM Hardware</div>
                </div>
              </div>
            </div>
          </div>
          <div class="conductor-info">
            <h4 class="conductor-name">${bus.conductor}</h4>
            <p class="conductor-role">Lead Transit Conductor • ETM Device #<code>${bus.etmSerial}</code></p>
            <p class="conductor-status">GPS Signal Synced • Automatic Destination Offloading Enabled</p>
            <div class="conductor-actions">
              <button class="btn-zoom-etm" id="btnZoomEtmDirect">
                <span class="icon">🔍</span>
                <span>Zoom into Conductor's ETM Machine</span>
                <span class="badge">Hardware Sim</span>
              </button>
            </div>
          </div>
        </div>
      `;

      // Click listener on ETM device or zoom button
      const directBtn = document.getElementById("btnZoomEtmDirect");
      const armEtm = document.getElementById("zoomEtmFromInterior");
      const openETM = () => {
        this.close(); // Close interior view
        setTimeout(() => {
          this.etmSimulator.openForBus(bus.id);
        }, 150);
      };

      if (directBtn) directBtn.addEventListener("click", openETM);
      if (armEtm) armEtm.addEventListener("click", openETM);
    }

    // Render Seat Layout (42 Seats: 11 rows of 4 seats, plus 2 rear)
    if (this.cabinContainer) {
      let seatsHtml = `
        <div class="cabin-bus-chassis">
          <div class="cabin-front">
            <div class="windshield">
              <span>FRONT WINDSHIELD • DRIVER COCKPIT</span>
              <span class="driver-wheel">⚙️ Driver</span>
            </div>
            <div class="cabin-doors">ENTRY DOOR [GPS TELEMETRY]</div>
          </div>
          <div class="cabin-aisle-container">
            <div class="cabin-seats-grid">
      `;

      const totalSeats = bus.capacity; // 42
      const occupied = bus.passengers;

      for (let i = 1; i <= totalSeats; i++) {
        const isOccupied = i <= occupied;
        const passengerEmoji = isOccupied ? this.getPassengerEmoji(i) : "";
        const seatClass = isOccupied ? "seat-occupied" : "seat-empty";
        const title = isOccupied ? `Seat ${i}: Occupied by Passenger` : `Seat ${i}: Empty (Available)`;

        seatsHtml += `
          <div class="bus-seat ${seatClass}" title="${title}">
            <div class="seat-headrest"></div>
            <div class="seat-cushion">
              ${isOccupied ? `<span class="seated-passenger-emoji">${passengerEmoji}</span>` : `<span class="seat-num">${i}</span>`}
            </div>
          </div>
        `;
      }

      seatsHtml += `
            </div>
          </div>
          <div class="cabin-rear">
            <span>REAR PASSENGER EXIT • SMART SENSOR ACTIVE</span>
          </div>
        </div>
      `;

      this.cabinContainer.innerHTML = seatsHtml;
    }
  }

  getPassengerEmoji(index) {
    const emojis = ["🧑‍💼", "👩‍💻", "👨‍🎓", "👩‍🦰", "👴", "👵", "🧔", "👱‍♀️", "👩‍🏫", "🧑‍🔬", "👨‍🎨", "👩‍💼"];
    return emojis[index % emojis.length];
  }
}
