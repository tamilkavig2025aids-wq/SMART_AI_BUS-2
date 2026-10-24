// ETM (Electronic Ticket Machine) Hardware Simulator
// Matches TNSTC-CBE ETM-500 hardware interface
// Provides multiple easy booking controls: Keypad PRINT, Direct Issue Button, and Destination Selector.

class ETMHardwareSimulator {
  constructor(engine) {
    this.engine = engine;
    this.activeBus = null;
    this.selectedDestIndex = 0;
    this.passengerQty = 1;
    this.fareType = "FULL";
    this.unitFare = 15.00;
    this.isPrinting = false;
    this.audioCtx = null;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.modal = document.getElementById("etmModal");
    this.closeBtn = document.getElementById("etmCloseBtn");
    this.returnBtn = document.getElementById("etmReturnBtn");

    // ETM LCD screen elements
    this.lcdTime = document.getElementById("etmLcdTime");
    this.lcdBus = document.getElementById("etmLcdBus");
    this.lcdCond = document.getElementById("etmLcdCond");
    this.lcdFrom = document.getElementById("etmLcdFrom");
    this.lcdDest = document.getElementById("etmLcdDest");
    this.lcdPassengers = document.getElementById("etmLcdPassengers");
    this.lcdFare = document.getElementById("etmLcdFare");
    this.lcdCapacity = document.getElementById("etmLcdCapacity");
    this.lcdActionHint = document.getElementById("etmLcdActionHint");

    // Fast-action destination dropdown & direct book button
    this.destSelect = document.getElementById("etmDestDropdown");
    this.directIssueBtn = document.getElementById("etmDirectIssueBtn");

    // Receipt slot & paper
    this.receiptContainer = document.getElementById("etmReceiptContainer");
    this.receiptPaper = document.getElementById("etmReceiptPaper");

    const initAudio = () => {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
    };
    window.addEventListener("click", initAudio, { once: true });
    window.addEventListener("keydown", initAudio, { once: true });
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeModal();
      });
    }

    if (this.returnBtn) {
      this.returnBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeModal();
      });
    }

    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) {
        this.closeModal();
      }
    });

    // Destination dropdown change listener
    if (this.destSelect) {
      this.destSelect.addEventListener("change", (e) => {
        const idx = this.engine.stops.findIndex(s => s.id === e.target.value);
        if (idx !== -1) {
          this.selectedDestIndex = idx;
          this.updateScreen();
        }
      });
    }

    // Direct big green issue button
    if (this.directIssueBtn) {
      this.directIssueBtn.addEventListener("click", () => {
        this.issueAndPrintTicket();
      });
    }

    // Keypad listeners
    document.querySelectorAll(".etm-key").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const val = btn.dataset.val;
        this.playBeep();

        if (action === "dest") {
          this.cycleDestination();
        } else if (action === "qty-plus") {
          this.changeQty(1);
        } else if (action === "qty-minus") {
          this.changeQty(-1);
        } else if (action === "clr") {
          this.clearEntry();
        } else if (action === "full") {
          this.setFareType("FULL");
        } else if (action === "conc") {
          this.setFareType("CONC");
        } else if (action === "print") {
          this.issueAndPrintTicket();
        } else if (action === "num") {
          const num = parseInt(val, 10);
          if (num >= 1 && num <= 9) {
            this.setQty(num);
          }
        }
      });
    });

    setInterval(() => {
      if (this.lcdTime) {
        const now = new Date();
        this.lcdTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }, 1000);
  }

  openForBus(busId) {
    const bus = this.engine.getBus(busId);
    if (!bus) return;

    this.activeBus = bus;
    this.passengerQty = 1;
    this.fareType = "FULL";
    this.unitFare = 15.00;

    // Default destination: next stop ahead
    const stops = this.engine.stops;
    if (bus.nextStop) {
      const idx = stops.findIndex(s => s.id === bus.nextStop.id);
      this.selectedDestIndex = idx !== -1 ? idx : 0;
    } else {
      this.selectedDestIndex = 0;
    }

    // Populate dropdown
    if (this.destSelect) {
      this.destSelect.innerHTML = "";
      stops.forEach((s, idx) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${idx + 1}. ${s.shortName} (${s.landmark})`;
        if (idx === this.selectedDestIndex) opt.selected = true;
        this.destSelect.appendChild(opt);
      });
    }

    if (this.receiptContainer) {
      this.receiptContainer.classList.remove("printed");
      this.receiptPaper.innerHTML = "";
    }

    this.updateScreen();

    if (this.modal) {
      this.modal.classList.add("active");
      document.body.classList.add("modal-open");
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.classList.remove("active");
      document.body.classList.remove("modal-open");
    }
  }

  isOpen() {
    return this.modal && this.modal.classList.contains("active");
  }

  cycleDestination() {
    const stops = this.engine.stops;
    this.selectedDestIndex = (this.selectedDestIndex + 1) % stops.length;
    if (this.destSelect) {
      this.destSelect.value = stops[this.selectedDestIndex].id;
    }
    this.updateScreen();
  }

  setQty(qty) {
    if (!this.activeBus) return;
    const maxAllowed = Math.max(1, this.activeBus.capacity - this.activeBus.passengers);
    this.passengerQty = Math.min(Math.max(1, qty), Math.min(maxAllowed, 9));
    this.updateScreen();
  }

  changeQty(delta) {
    this.setQty(this.passengerQty + delta);
  }

  clearEntry() {
    this.passengerQty = 1;
    this.fareType = "FULL";
    this.unitFare = 15.00;
    if (this.receiptContainer) {
      this.receiptContainer.classList.remove("printed");
    }
    this.updateScreen();
  }

  setFareType(type) {
    this.fareType = type;
    this.unitFare = type === "FULL" ? 15.00 : 8.00;
    this.updateScreen();
  }

  calculateTotalFare() {
    return (this.passengerQty * this.unitFare).toFixed(2);
  }

  updateScreen() {
    if (!this.activeBus) return;

    const stops = this.engine.stops;
    const targetStop = stops[this.selectedDestIndex] || stops[0];
    const totalFare = this.calculateTotalFare();

    if (this.lcdBus) this.lcdBus.textContent = `${this.activeBus.code}`;
    if (this.lcdCond) this.lcdCond.textContent = `${this.activeBus.conductor}`;
    if (this.lcdFrom) {
      this.lcdFrom.textContent = this.activeBus.nearestStop
        ? this.activeBus.nearestStop.shortName
        : "Gandhipuram Central";
    }
    if (this.lcdDest) this.lcdDest.textContent = targetStop.shortName || targetStop.name;
    if (this.lcdPassengers) {
      this.lcdPassengers.textContent = `${this.passengerQty} (${this.fareType})`;
    }
    if (this.lcdFare) this.lcdFare.textContent = `Rs. ${totalFare}`;
    if (this.lcdCapacity) {
      this.lcdCapacity.textContent = `${this.activeBus.passengers}/${this.activeBus.capacity} SEATS`;
    }
    if (this.lcdActionHint) {
      this.lcdActionHint.textContent = `PRESS [PRINT / ISSUE]`;
    }
  }

  issueAndPrintTicket() {
    if (!this.activeBus || this.isPrinting) return;

    const stops = this.engine.stops;
    const targetStop = stops[this.selectedDestIndex] || stops[0];
    const totalFare = Number(this.calculateTotalFare());

    if (this.activeBus.passengers + this.passengerQty > this.activeBus.capacity) {
      alert(`⚠️ Bus is full! Only ${this.activeBus.capacity - this.activeBus.passengers} seats available.`);
      return;
    }

    this.isPrinting = true;
    this.playPrinterSound();

    if (this.lcdActionHint) {
      this.lcdActionHint.textContent = "PRINTING RECEIPT...";
    }

    // Register ticket in simulation engine
    const res = this.engine.issueTicket(this.activeBus.id, {
      from: this.activeBus.nearestStop ? this.activeBus.nearestStop.shortName : "Current Stop",
      to: targetStop.shortName || targetStop.name,
      qty: this.passengerQty,
      fare: totalFare,
      fareType: this.fareType
    });

    if (res.success) {
      const t = res.ticket;
      const now = new Date();
      const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.toLocaleTimeString()}`;

      this.receiptPaper.innerHTML = `
        <div class="receipt-header">TNSTC (COIMBATORE) PASSENGER TICKET</div>
        <div class="receipt-divider">-----------------------------------------</div>
        <div class="receipt-row"><span>TICKET NO:</span> <strong>${t.ticketNo}</strong></div>
        <div class="receipt-row"><span>BUS / ROUTE:</span> <strong>${this.activeBus.code}</strong></div>
        <div class="receipt-row"><span>DATE & TIME:</span> <span>${dateStr}</span></div>
        <div class="receipt-row"><span>BOARDING:</span> <strong>${t.from}</strong></div>
        <div class="receipt-row"><span>DESTINATION:</span> <strong>${t.to}</strong></div>
        <div class="receipt-row"><span>QTY:</span> <strong>${t.qty} PASSENGER(S) [${t.fareType}]</strong></div>
        <div class="receipt-dotted"></div>
        <div class="receipt-fare-row">
          <span>TOTAL FARE:</span>
          <span class="receipt-fare-amount">Rs. ${Number(t.fare).toFixed(2)}</span>
        </div>
        <div class="receipt-divider">-----------------------------------------</div>
        <div class="receipt-row"><span>CONDUCTOR:</span> <span>${this.activeBus.conductor}</span></div>
        <div class="receipt-row"><span>ETM SERIAL:</span> <span>${this.activeBus.etmSerial}</span></div>
        <div class="receipt-barcode-box">
          <div class="receipt-barcode-pattern"></div>
          <div class="receipt-barcode-label">SCAN UPON BOARDING / INSPECTION</div>
          <div class="receipt-tagline">GPS TRACKED BY TNSTC SMART BUS</div>
          <div class="receipt-offload">AUTO-OFFLOAD AT: ${t.to}</div>
        </div>
        <div class="receipt-perforation"></div>
      `;

      setTimeout(() => {
        if (this.receiptContainer) {
          this.receiptContainer.classList.add("printed");
        }
        this.updateScreen();
        this.playSuccessChime();
        this.isPrinting = false;
        if (this.lcdActionHint) {
          this.lcdActionHint.textContent = "TICKET ISSUED - CAPACITY UPDATED";
        }
      }, 500);
    } else {
      this.isPrinting = false;
      this.updateScreen();
    }
  }

  playBeep() {
    try {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.07);
    } catch (e) {}
  }

  playPrinterSound() {
    try {
      if (!this.audioCtx) return;
      const bufferSize = this.audioCtx.sampleRate * 0.45;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i / 10);
      }
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2400;
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.45);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      noise.start();
    } catch (e) {}
  }

  playSuccessChime() {
    try {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      [800, 1200].forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.16);
      });
    } catch (e) {}
  }
}
