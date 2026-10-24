// Simulation Engine: Manages GPS movement, route interpolation, stop arrival detection,
// automated passenger alighting upon destination arrival, and telemetry synchronization.

class FleetSimulationEngine {
  constructor(stops, routePath, initialFleet) {
    this.stops = stops;
    this.routePath = routePath;
    this.fleet = JSON.parse(JSON.stringify(initialFleet));
    this.subscribers = [];
    this.eventLog = [];
    this.speedMultiplier = 1.0;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.dwellDurationSeconds = 5; // Dwell at each stop for 5 simulated seconds

    // Compute route segment lengths for smooth distance interpolation
    this.computeRouteSegments();
    
    // Initialize initial lat/lng for all buses
    this.fleet.forEach(bus => {
      this.updateBusCoordinates(bus);
    });

    // Start simulation loop
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  computeRouteSegments() {
    this.segments = [];
    let total = 0;
    for (let i = 0; i < this.routePath.length - 1; i++) {
      const p1 = this.routePath[i];
      const p2 = this.routePath[i + 1];
      const d = this.haversineDistance(p1[0], p1[1], p2[0], p2[1]);
      this.segments.push({
        p1,
        p2,
        dist: d,
        cumStart: total,
        cumEnd: total + d
      });
      total += d;
    }
    this.totalRouteLength = total;
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km
  }

  getInterpolatedPoint(progressFraction) {
    // progressFraction: 0.0 to 1.0
    const targetDist = ((progressFraction % 1.0) + 1.0) % 1.0 * this.totalRouteLength;
    let seg = this.segments.find(s => targetDist >= s.cumStart && targetDist <= s.cumEnd);
    if (!seg) seg = this.segments[this.segments.length - 1];

    const segRatio = seg.dist === 0 ? 0 : (targetDist - seg.cumStart) / seg.dist;
    const lat = seg.p1[0] + (seg.p2[0] - seg.p1[0]) * segRatio;
    const lng = seg.p1[1] + (seg.p2[1] - seg.p1[1]) * segRatio;

    // Bearing in degrees
    const y = Math.sin((seg.p2[1] - seg.p1[1]) * Math.PI / 180) * Math.cos(seg.p2[0] * Math.PI / 180);
    const x = Math.cos(seg.p1[0] * Math.PI / 180) * Math.sin(seg.p2[0] * Math.PI / 180) -
              Math.sin(seg.p1[0] * Math.PI / 180) * Math.cos(seg.p2[0] * Math.PI / 180) * Math.cos((seg.p2[1] - seg.p1[1]) * Math.PI / 180);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

    return { lat, lng, bearing };
  }

  updateBusCoordinates(bus) {
    const pt = this.getInterpolatedPoint(bus.progress);
    bus.lat = pt.lat;
    bus.lng = pt.lng;
    bus.bearing = pt.bearing;

    // Find nearest / next stop
    let nearestStop = null;
    let minDist = Infinity;
    this.stops.forEach(stop => {
      const d = this.haversineDistance(bus.lat, bus.lng, stop.lat, stop.lng);
      if (d < minDist) {
        minDist = d;
        nearestStop = stop;
      }
    });

    bus.nearestStop = nearestStop;
    bus.nearestStopDistKm = minDist;

    // Determine upcoming stops along forward progress
    bus.nextStop = this.findNextStopAhead(bus);
  }

  findNextStopAhead(bus) {
    // Project small distance ahead
    const aheadPoint = this.getInterpolatedPoint((bus.progress + 0.04) % 1.0);
    let best = this.stops[0];
    let bestDist = Infinity;
    this.stops.forEach(s => {
      const d = this.haversineDistance(aheadPoint.lat, aheadPoint.lng, s.lat, s.lng);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    });
    return best;
  }

  loop(currentTime) {
    const deltaSeconds = Math.min((currentTime - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = currentTime;

    if (this.isRunning) {
      this.fleet.forEach(bus => {
        if (bus.isDwelling) {
          bus.dwellRemaining -= deltaSeconds * this.speedMultiplier;
          bus.status = `Boarding at ${bus.currentStationName} (${Math.ceil(bus.dwellRemaining)}s)`;
          if (bus.dwellRemaining <= 0) {
            bus.isDwelling = false;
            bus.status = "Moving";
            bus.speedKmh = 30 + Math.floor(Math.random() * 8);
          }
        } else {
          // Advance progress based on speed (km/h)
          // Speed 30 km/h over totalRouteLength (~9 km)
          const distIncrementKm = (bus.speedKmh / 3600) * deltaSeconds * this.speedMultiplier;
          const progressInc = distIncrementKm / this.totalRouteLength;
          bus.progress = (bus.progress + progressInc) % 1.0;
          this.updateBusCoordinates(bus);

          // Check if entering a station zone (< 0.08 km = 80 meters)
          if (bus.nearestStopDistKm < 0.08) {
            const stop = bus.nearestStop;
            if (bus.lastVisitedStopId !== stop.id) {
              bus.lastVisitedStopId = stop.id;
              this.handleStationArrival(bus, stop);
            }
          } else if (bus.nearestStopDistKm > 0.15) {
            // Cleared station zone
            if (bus.lastVisitedStopId === bus.nearestStop.id) {
              bus.lastVisitedStopId = null;
            }
          }
        }
      });

      this.notifySubscribers();
    }

    requestAnimationFrame(this.loop);
  }

  handleStationArrival(bus, stop) {
    bus.isDwelling = true;
    bus.dwellRemaining = this.dwellDurationSeconds;
    bus.currentStationName = stop.shortName || stop.name;
    bus.status = `At ${stop.shortName}`;

    // AUTOMATIC PASSENGER ALIGHTING VIA ETM / GPS MATCH
    // Any ticket booked with destination matching this stop's name or shortName is alighted!
    let alightedCount = 0;
    const remainingTickets = [];

    bus.tickets.forEach(ticket => {
      const destLower = ticket.to.toLowerCase();
      const stopNameLower = stop.name.toLowerCase();
      const shortNameLower = stop.shortName.toLowerCase();

      const isMatch = destLower.includes(shortNameLower) || 
                      shortNameLower.includes(destLower) ||
                      destLower.includes(stopNameLower) ||
                      stopNameLower.includes(destLower);

      if (isMatch) {
        alightedCount += ticket.qty;
      } else {
        remainingTickets.push(ticket);
      }
    });

    if (alightedCount > 0) {
      bus.tickets = remainingTickets;
      const prevPass = bus.passengers;
      bus.passengers = Math.max(0, bus.passengers - alightedCount);

      const logMsg = `🚏 [ETM GPS AUTO-OFFLOAD] Bus ${bus.code} arrived at "${stop.shortName}". ${alightedCount} passenger(s) alighted. Occupancy: ${bus.passengers}/${bus.capacity} seats.`;
      this.addEventLog({
        type: "alight",
        busId: bus.id,
        busCode: bus.code,
        stopName: stop.shortName,
        alightedCount,
        newOccupancy: bus.passengers,
        capacity: bus.capacity,
        message: logMsg,
        timestamp: new Date().toLocaleTimeString()
      });
    } else {
      this.addEventLog({
        type: "arrive",
        busId: bus.id,
        busCode: bus.code,
        stopName: stop.shortName,
        message: `📍 Bus ${bus.code} arrived at "${stop.shortName}". Waiting for boarding (5s).`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }

  issueTicket(busId, ticketData) {
    const bus = this.fleet.find(b => b.id === Number(busId));
    if (!bus) return { success: false, message: "Bus not found" };

    const qty = Number(ticketData.qty) || 1;
    if (bus.passengers + qty > bus.capacity) {
      return {
        success: false,
        message: `Bus is at high capacity! Only ${bus.capacity - bus.passengers} seat(s) available.`
      };
    }

    // Add passenger count immediately
    bus.passengers += qty;

    const newTicket = {
      ticketNo: ticketData.ticketNo || `TCK-${Math.floor(100000 + Math.random() * 900000)}`,
      from: ticketData.from || (bus.nearestStop ? bus.nearestStop.shortName : "Current Stop"),
      to: ticketData.to,
      qty: qty,
      fare: ticketData.fare || (qty * 15.00),
      fareType: ticketData.fareType || "FULL",
      timestamp: new Date().toLocaleTimeString(),
      conductor: bus.conductor,
      etmSerial: bus.etmSerial
    };

    bus.tickets.push(newTicket);

    const logMsg = `🎫 [ETM TICKET ISSUED] Bus ${bus.code}: ${qty} ticket(s) to "${ticketData.to}". Passenger count increased to ${bus.passengers}/${bus.capacity}.`;
    this.addEventLog({
      type: "ticket_issued",
      busId: bus.id,
      busCode: bus.code,
      ticket: newTicket,
      message: logMsg,
      timestamp: new Date().toLocaleTimeString()
    });

    this.notifySubscribers();
    return { success: true, ticket: newTicket, bus: bus };
  }

  addEventLog(entry) {
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 50) this.eventLog.pop();

    // Dispatch global CustomEvent for UI toast / notification
    window.dispatchEvent(new CustomEvent("smartbus:event", { detail: entry }));
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.fleet);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.fleet));
  }

  getBus(id) {
    return this.fleet.find(b => b.id === Number(id));
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
  }

  togglePause() {
    this.isRunning = !this.isRunning;
    return this.isRunning;
  }

  // Calculate ETA in minutes for a bus to reach a given stop
  calculateETA(bus, targetStop) {
    if (!targetStop) return { minutes: 0, distanceKm: 0 };
    
    // Find target stop index along circular route
    let targetDistAlongRoute = 0;
    let minDist = Infinity;
    this.segments.forEach(seg => {
      const d = this.haversineDistance(seg.p1[0], seg.p1[1], targetStop.lat, targetStop.lng);
      if (d < minDist) {
        minDist = d;
        targetDistAlongRoute = seg.cumStart;
      }
    });

    const currentDistAlongRoute = bus.progress * this.totalRouteLength;
    let distRemaining = targetDistAlongRoute - currentDistAlongRoute;
    if (distRemaining < 0) {
      distRemaining += this.totalRouteLength; // Loop wrap around
    }

    const effectiveSpeed = Math.max(bus.speedKmh, 20); // Average km/h
    const hours = distRemaining / effectiveSpeed;
    const minutes = Math.max(1, Math.round(hours * 60));

    return {
      minutes,
      distanceKm: distRemaining.toFixed(1)
    };
  }
}
