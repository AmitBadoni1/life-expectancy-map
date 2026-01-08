// =========================
// State → FIPS lookup
// =========================
const stateToFIPS = {
  "Alabama": "01", "Alaska": "02", "Arizona": "04", "Arkansas": "05",
  "California": "06", "Colorado": "08", "Connecticut": "09", "Delaware": "10",
  "District of Columbia": "11", "Florida": "12", "Georgia": "13", "Hawaii": "15",
  "Idaho": "16", "Illinois": "17", "Indiana": "18", "Iowa": "19", "Kansas": "20",
  "Kentucky": "21", "Louisiana": "22", "Maine": "23", "Maryland": "24",
  "Massachusetts": "25", "Michigan": "26", "Minnesota": "27", "Mississippi": "28",
  "Missouri": "29", "Montana": "30", "Nebraska": "31", "Nevada": "32",
  "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
  "North Carolina": "37", "North Dakota": "38", "Ohio": "39", "Oklahoma": "40",
  "Oregon": "41", "Pennsylvania": "42", "Rhode Island": "44",
  "South Carolina": "45", "South Dakota": "46", "Tennessee": "47", "Texas": "48",
  "Utah": "49", "Vermont": "50", "Virginia": "51", "Washington": "53",
  "West Virginia": "54", "Wisconsin": "55", "Wyoming": "56"
};

// =========================
// Global storage
// =========================
let countyData = {};   // keyed by stateFIPS-countyName
let activeFactor = null;
let geoLayer;

// =========================
// Leaflet map init
// =========================
let map = L.map('map').setView([37.8, -96], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// =========================
// Load CSV
// =========================
Papa.parse("data.csv", {
  header: true,
  download: true,
  complete: function(results) {

    results.data.forEach(row => {
      // Lookup state FIPS
      let stateFIPS = stateToFIPS[row.State];
      if (!stateFIPS) return;

      // Normalize county names
      let countyName = row.County.trim().toLowerCase();
      let key = `${stateFIPS}-${countyName}`;

      countyData[key] = row;
    });

    buildFactorList(results.data);
    loadGeoJSON();
  }
});

// =========================
// Build factor sidebar
// =========================
function buildFactorList(data) {
  let factors = new Set();

  data.forEach(d => {
    if (d.factor_1) factors.add(d.factor_1);
    if (d.factor_2) factors.add(d.factor_2);
    if (d.factor_3) factors.add(d.factor_3);
  });

  let container = document.getElementById("factor-list");

  factors.forEach(f => {
    let div = document.createElement("div");
    div.className = "factor";
    div.innerText = f;
    div.onclick = () => {
      activeFactor = f;
      if (geoLayer) geoLayer.setStyle(styleFeature);
    };
    container.appendChild(div);
  });
}

// =========================
// Load GeoJSON counties
// =========================
function loadGeoJSON() {
  fetch("counties.geojson")
    .then(r => r.json())
    .then(geo => {
      geoLayer = L.geoJson(geo, {
        style: styleFeature,
        onEachFeature: onEachFeature
      }).addTo(map);
    });
}

// =========================
// Style function for counties
// =========================
function styleFeature(feature) {
  let stateFIPS = feature.properties.STATE; // "01"
  let countyName = feature.properties.NAME.toLowerCase(); // "autauga"

  let key = `${stateFIPS}-${countyName}`;
  let row = countyData[key];

  if (!row || !activeFactor) {
    return { fillOpacity: 0, color: '#333', weight: 0.5 };
  }

  let contribution = 0;

  if (row.factor_1 === activeFactor) contribution = Math.abs(row.contribution_1);
  if (row.factor_2 === activeFactor) contribution = Math.abs(row.contribution_2);
  if (row.factor_3 === activeFactor) contribution = Math.abs(row.contribution_3);

  if (contribution === 0) {
    return { fillOpacity: 0, color: '#333', weight: 0.5 };
  }

  return {
    fillColor: 'red',
    fillOpacity: Math.min(contribution, 1),
    weight: 0.5,
    color: '#333'
  };
}

// =========================
// Click handler for counties
// =========================
function onEachFeature(feature, layer) {
  layer.on('click', () => {
    let stateFIPS = feature.properties.STATE;
    let countyName = feature.properties.NAME.toLowerCase();
    let key = `${stateFIPS}-${countyName}`;
    let row = countyData[key];

    if (!row) return;

    document.getElementById("county-info").innerHTML = `
      <b>${row.County}, ${row.State}</b><br/><br/>
      <b>Top factors:</b>
      <ol>
        <li>${row.factor_1} (${row.contribution_1})</li>
        <li>${row.factor_2} (${row.contribution_2})</li>
        <li>${row.factor_3} (${row.contribution_3})</li>
      </ol>
      <b>Predicted:</b> ${row.predicted_life_expectancy}<br/>
      <b>Actual:</b> ${row.actual_life_expectancy}
    `;
  });
}
