// Coimbatore, Tamil Nadu, India transit stops and circular route coordinates
// Authentic Coimbatore city geography covering major hubs: Gandhipuram, Cross Cut Rd,
// Brookefields, RS Puram, Town Hall, Coimbatore Jn, Ukkadam, Sungam, Ramanathapuram, Lakshmi Mills.

const COIMBATORE_STOPS = [
  {
    id: "stop-1",
    name: "Gandhipuram Central Bus Stand",
    shortName: "Gandhipuram Central",
    lat: 11.01684,
    lng: 76.96782,
    zone: "Central Transit Hub",
    landmark: "Gandhipuram Central Bus Terminus & GP Signal"
  },
  {
    id: "stop-2",
    name: "Cross Cut Road / Ram Nagar",
    shortName: "Cross Cut Rd",
    lat: 11.01950,
    lng: 76.96120,
    zone: "North Commercial Corridor",
    landmark: "Ram Nagar & Premier Textile Market"
  },
  {
    id: "stop-3",
    name: "Brookefields Mall / Sukrawarpet",
    shortName: "Brookefields Mall",
    lat: 11.01180,
    lng: 76.95720,
    zone: "Brooke Bond Commercial",
    landmark: "Brookefields Shopping Hub & Krishnaswamy Rd"
  },
  {
    id: "stop-4",
    name: "RS Puram / DB Road Post Office",
    shortName: "RS Puram (DB Rd)",
    lat: 11.00860,
    lng: 76.94980,
    zone: "West Commercial & Heritage",
    landmark: "Diwan Bahadur Road & Head Post Office"
  },
  {
    id: "stop-5",
    name: "Town Hall / Koniamman Temple",
    shortName: "Town Hall",
    lat: 10.99680,
    lng: 76.96150,
    zone: "Heritage Core",
    landmark: "Historic Arulmigu Koniamman Temple & Oppanakara St"
  },
  {
    id: "stop-6",
    name: "Coimbatore Junction Railway Station",
    shortName: "Coimbatore Jn",
    lat: 10.99790,
    lng: 76.96860,
    zone: "Southern Railway Terminus",
    landmark: "Coimbatore Central Junction & District Collectorate"
  },
  {
    id: "stop-7",
    name: "Ukkadam Bus Terminus / Periyakulam",
    shortName: "Ukkadam Terminus",
    lat: 10.98820,
    lng: 76.96050,
    zone: "South Gateway",
    landmark: "Ukkadam Bus Stand & Smart City Lakefront"
  },
  {
    id: "stop-8",
    name: "Sungam Junction / Valankulam Lake",
    shortName: "Sungam Jn",
    lat: 10.99500,
    lng: 76.97900,
    zone: "Trichy Road Corridor",
    landmark: "Valankulam Lake Promenade & Sungam Flyover"
  },
  {
    id: "stop-9",
    name: "Ramanathapuram Junction / Trichy Rd",
    shortName: "Ramanathapuram",
    lat: 11.00150,
    lng: 76.99280,
    zone: "East Transit Hub",
    landmark: "Ramanathapuram Commercial Junction & 80 Feet Road"
  },
  {
    id: "stop-10",
    name: "Lakshmi Mills Junction / Avinashi Rd",
    shortName: "Lakshmi Mills",
    lat: 11.01520,
    lng: 76.98420,
    zone: "IT & Avinashi Corridor",
    landmark: "Lakshmi Mills Urban Junction & GKD Memorial"
  }
];

// Circular route waypoints representing realistic Coimbatore street segments
// Gandhipuram -> Cross Cut -> Brookefields -> RS Puram -> Town Hall -> Coimbatore Jn -> Ukkadam -> Sungam -> Ramanathapuram -> Lakshmi Mills -> Gandhipuram
const ROUTE_PATH = [
  [11.01684, 76.96782], // Stop 1: Gandhipuram Central Bus Stand
  [11.01850, 76.96550], // Cross Cut Rd Entry
  [11.01950, 76.96120], // Stop 2: Cross Cut Rd / Ram Nagar
  [11.01550, 76.95900], // Brooke Bond Road
  [11.01180, 76.95720], // Stop 3: Brookefields Mall
  [11.01020, 76.95300], // Cowley Brown Rd
  [11.00860, 76.94980], // Stop 4: RS Puram (DB Rd)
  [11.00250, 76.95450], // Sukrawarpet / Raja Street
  [10.99680, 76.96150], // Stop 5: Town Hall / Koniamman Temple
  [10.99720, 76.96500], // State Bank Road
  [10.99790, 76.96860], // Stop 6: Coimbatore Jn Railway Station
  [10.99200, 76.96400], // Ukkadam Flyover North
  [10.98820, 76.96050], // Stop 7: Ukkadam Bus Terminus
  [10.98950, 76.97200], // Ukkadam-Sungam Bypass (Periyakulam / Valankulam)
  [10.99500, 76.97900], // Stop 8: Sungam Jn / Valankulam
  [10.99850, 76.98600], // Trichy Road East
  [11.00150, 76.99280], // Stop 9: Ramanathapuram / Trichy Rd
  [11.00700, 76.99150], // Puliyakulam Road
  [11.01300, 76.98600], // Avinashi Road Entry
  [11.01520, 76.98420], // Stop 10: Lakshmi Mills Junction
  [11.01350, 76.97400], // VOC Park / Anna Silai
  [11.01420, 76.96950], // Park Gate / Dr. Nanjappa Rd
  [11.01684, 76.96782]  // Loop back to Gandhipuram Central
];

// 10 Concurrently operating buses spaced across the Coimbatore circular route
const INITIAL_FLEET = [
  {
    id: 101,
    code: "TN-38 #101 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "M. Selvakumar",
    etmSerial: "TNSTC-CBE-9012",
    capacity: 42,
    passengers: 12,
    progress: 0.05, // 0.0 to 1.0 along ROUTE_PATH
    speedKmh: 32,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#2563EB", // Sapphire Blue
    tickets: [
      { ticketNo: "TCK-801", from: "Cross Cut Rd", to: "Coimbatore Jn", qty: 2, fare: 30.00 },
      { ticketNo: "TCK-802", from: "RS Puram (DB Rd)", to: "Ukkadam Terminus", qty: 4, fare: 60.00 },
      { ticketNo: "TCK-803", from: "Town Hall", to: "Lakshmi Mills", qty: 6, fare: 90.00 }
    ]
  },
  {
    id: 102,
    code: "TN-38 #102 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "S. Priya",
    etmSerial: "TNSTC-CBE-9013",
    capacity: 42,
    passengers: 15,
    progress: 0.15,
    speedKmh: 30,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#16A34A", // Emerald
    tickets: [
      { ticketNo: "TCK-624622", from: "Brookefields Mall", to: "Ukkadam Terminus", qty: 3, fare: 45.00 },
      { ticketNo: "TCK-624623", from: "RS Puram (DB Rd)", to: "Ramanathapuram", qty: 5, fare: 75.00 },
      { ticketNo: "TCK-624624", from: "Town Hall", to: "Gandhipuram Central", qty: 7, fare: 105.00 }
    ]
  },
  {
    id: 103,
    code: "TN-38 #103 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "K. Murugan",
    etmSerial: "TNSTC-CBE-9014",
    capacity: 42,
    passengers: 28,
    progress: 0.25,
    speedKmh: 28,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#D97706", // Amber
    tickets: [
      { ticketNo: "TCK-710", from: "RS Puram (DB Rd)", to: "Coimbatore Jn", qty: 10, fare: 150.00 },
      { ticketNo: "TCK-711", from: "Town Hall", to: "Lakshmi Mills", qty: 8, fare: 120.00 },
      { ticketNo: "TCK-712", from: "Coimbatore Jn", to: "Gandhipuram Central", qty: 10, fare: 150.00 }
    ]
  },
  {
    id: 104,
    code: "TN-38 #104 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "R. Dhanapal",
    etmSerial: "TNSTC-CBE-9015",
    capacity: 42,
    passengers: 8,
    progress: 0.35,
    speedKmh: 34,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#9333EA", // Purple
    tickets: [
      { ticketNo: "TCK-850", from: "Town Hall", to: "Sungam Jn", qty: 4, fare: 60.00 },
      { ticketNo: "TCK-851", from: "Coimbatore Jn", to: "Lakshmi Mills", qty: 4, fare: 60.00 }
    ]
  },
  {
    id: 105,
    code: "TN-38 #105 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "A. Kaviya",
    etmSerial: "TNSTC-CBE-9016",
    capacity: 42,
    passengers: 22,
    progress: 0.45,
    speedKmh: 31,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#E11D48", // Crimson
    tickets: [
      { ticketNo: "TCK-901", from: "Coimbatore Jn", to: "Ramanathapuram", qty: 8, fare: 120.00 },
      { ticketNo: "TCK-902", from: "Ukkadam Terminus", to: "Gandhipuram Central", qty: 14, fare: 210.00 }
    ]
  },
  {
    id: 106,
    code: "TN-38 #106 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "G. Subramaniam",
    etmSerial: "TNSTC-CBE-9017",
    capacity: 42,
    passengers: 37,
    progress: 0.55,
    speedKmh: 26,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#EA580C", // Deep Orange
    tickets: [
      { ticketNo: "TCK-950", from: "Ukkadam Terminus", to: "Lakshmi Mills", qty: 18, fare: 270.00 },
      { ticketNo: "TCK-951", from: "Sungam Jn", to: "Gandhipuram Central", qty: 19, fare: 285.00 }
    ]
  },
  {
    id: 107,
    code: "TN-38 #107 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "P. Velusamy",
    etmSerial: "TNSTC-CBE-9018",
    capacity: 42,
    passengers: 14,
    progress: 0.65,
    speedKmh: 33,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#0D9488", // Teal
    tickets: [
      { ticketNo: "TCK-101", from: "Sungam Jn", to: "Gandhipuram Central", qty: 6, fare: 90.00 },
      { ticketNo: "TCK-102", from: "Ramanathapuram", to: "Cross Cut Rd", qty: 8, fare: 120.00 }
    ]
  },
  {
    id: 108,
    code: "TN-38 #108 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "N. Saravanan",
    etmSerial: "TNSTC-CBE-9019",
    capacity: 42,
    passengers: 19,
    progress: 0.75,
    speedKmh: 29,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#4F46E5", // Indigo
    tickets: [
      { ticketNo: "TCK-201", from: "Ramanathapuram", to: "Brookefields Mall", qty: 9, fare: 135.00 },
      { ticketNo: "TCK-202", from: "Lakshmi Mills", to: "Town Hall", qty: 10, fare: 150.00 }
    ]
  },
  {
    id: 109,
    code: "TN-38 #109 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "T. Karthik",
    etmSerial: "TNSTC-CBE-9020",
    capacity: 42,
    passengers: 31,
    progress: 0.85,
    speedKmh: 27,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#0284C7", // Sky Blue
    tickets: [
      { ticketNo: "TCK-301", from: "Lakshmi Mills", to: "Coimbatore Jn", qty: 16, fare: 240.00 },
      { ticketNo: "TCK-302", from: "Gandhipuram Central", to: "Ukkadam Terminus", qty: 15, fare: 225.00 }
    ]
  },
  {
    id: 110,
    code: "TN-38 #110 [11C]",
    route: "City Circular 11C (Gandhipuram ↔ Ukkadam)",
    conductor: "S. Anitha",
    etmSerial: "TNSTC-CBE-9021",
    capacity: 42,
    passengers: 6,
    progress: 0.95,
    speedKmh: 35,
    status: "Moving",
    isDwelling: false,
    dwellRemaining: 0,
    color: "#059669", // Dark Green
    tickets: [
      { ticketNo: "TCK-401", from: "Gandhipuram Central", to: "RS Puram (DB Rd)", qty: 3, fare: 45.00 },
      { ticketNo: "TCK-402", from: "Cross Cut Rd", to: "Town Hall", qty: 3, fare: 45.00 }
    ]
  }
];

// Base fare constant per passenger in INR (Rupees)
const FARE_PER_PASSENGER_INR = 15.00;
const CONC_FARE_PER_PASSENGER_INR = 8.00;

// Aliases for backwards compatibility with any legacy references
const COIMBATORE_STOPS_ALIAS = COIMBATORE_STOPS;
const MELBOURNE_STOPS = COIMBATORE_STOPS;
const FARE_PER_PASSENGER_AUD = FARE_PER_PASSENGER_INR;
const CONC_FARE_PER_PASSENGER_AUD = CONC_FARE_PER_PASSENGER_INR;
