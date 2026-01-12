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

// factorDefinitions.js

const FACTOR_DEFS = {
  "STATEFP": "State FIPS code",
  "COUNTYFP": "County FIPS code",
  "TRACTCE": "Census tract code",
  "AFFGEOID": "Census tract full identifier",
  "GEOID": "11-digit tract ID",
  "COUNTY": "County name",
  "StateAbbr": "State abbreviation",
  "StateDesc": "State full name",
  "Location": "Text location",
  "E_TOTPOP": "Population estimate",
  "M_TOTPOP": "Pop estimate margin of error",
  "E_DAYPOP": "Estimated daytime population",
  "SPL_EJI": "Environmental Justice index",
  "RPL_EJI": "EJI percentile rank",
  "SPL_SER": "Social/Environmental risk sum",
  "RPL_SER": "SER percentile rank",
  "EP_MINRTY": "% racial/ethnic minority",
  "EPL_MINRTY": "Minority percentile rank",
  "SPL_SVM_DOM1": "Minority domain sum",
  "RPL_SVM_DOM1": "Minority domain percentile",
  "EP_POV200": "% below 200% poverty line",
  "EPL_POV200": "Poverty percentile",
  "EP_NOHSDP": "% no high school diploma",
  "EPL_NOHSDP": "No-HS diploma percentile",
  "EP_UNEMP": "% unemployed",
  "EPL_UNEMP": "Unemployment percentile",
  "EP_RENTER": "% renter-occupied housing",
  "EPL_RENTER": "Renter percentile",
  "EP_HOUBDN": "% housing cost burdened",
  "EPL_HOUBDN": "Housing burden percentile",
  "EP_UNINSUR": "% uninsured",
  "EPL_UNINSUR": "Uninsured percentile",
  "EP_NOINT": "% no internet",
  "EPL_NOINT": "No-internet percentile",
  "EP_AGE65": "% aged 65+",
  "EPL_AGE65": "65+ percentile",
  "EP_AGE17": "% aged <17",
  "EPL_AGE17": "<17 percentile",
  "EP_DISABL": "% disabled population",
  "EPL_DISABL": "Disability percentile",
  "EP_LIMENG": "% limited English",
  "EPL_LIMENG": "Limited-English percentile",
  "EP_MOBILE": "% mobile homes",
  "EPL_MOBILE": "Mobile homes percentile",
  "EP_GROUPQ": "% group quarters",
  "EPL_GROUPQ": "Group quarters percentile",
  "E_OZONE": "Days above ozone limit",
  "EPL_OZONE": "Ozone percentile",
  "E_PM": "Days above PM2.5 limit",
  "EPL_PM": "PM2.5 percentile",
  "E_DSLPM": "Diesel particulate matter",
  "EPL_DSLPM": "Diesel PM percentile",
  "E_TOTCR": "Air toxics cancer risk",
  "EPL_TOTCR": "Cancer risk percentile",
  "EP_ASTHMA": "% asthma",
  "EPL_ASTHMA": "Asthma percentile",
  "EP_CANCER": "% cancer",
  "EPL_CANCER": "Cancer percentile",
  "EP_MHLTH": "% poor mental health",
  "EPL_MHLTH": "Mental health percentile",
  "EP_DIABETES": "% diabetes",
  "EPL_DIABETES": "Diabetes percentile"
  // ... add more if needed
};

// Helper → returns description or raw name
function prettyFactor(f) {
  return FACTOR_DEFS[f] || f || "";
}

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
    console.log("Parsed rows:", results.data.length);

    results.data.forEach(row => {
      if (!row || (!row.State && !row.County)) {
        return;
      }

      let stateFIPS = stateToFIPS[row.State];
      if (!stateFIPS) return;

      let countyName = (row.County || "").trim().toLowerCase();
      if (!countyName) return;

      let key = `${stateFIPS}-${countyName}`;
      countyData[key] = row;
    });

    console.log("County records loaded:", Object.keys(countyData).length);

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

  console.log("Unique factors:", factors.size);

  let container = document.getElementById("factor-list");
  container.innerHTML = "";

  factors.forEach(f => {
    let div = document.createElement("div");
    div.className = "factor";
    div.innerText = prettyFactor(f);   // use pretty name
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
      console.log("GeoJSON features:", geo.features.length);
      geoLayer = L.geoJson(geo, {
        style: styleFeature,
        onEachFeature: onEachFeature
      }).addTo(map);
    })
    .catch(err => {
      console.error("Error loading GeoJSON:", err);
    });
}

// =========================
// Style function for counties
// =========================
function styleFeature(feature) {
  let stateFIPS = feature.properties.STATE;
  let countyName = feature.properties.NAME.toLowerCase();

  let key = `${stateFIPS}-${countyName}`;
  let row = countyData[key];

  if (!row || !activeFactor) {
    return { fillOpacity: 0, color: '#333', weight: 0.5 };
  }

  let contribution = 0;

  if (row.factor_1 === activeFactor) contribution = Math.abs(row.contribution_1);
  if (row.factor_2 === activeFactor) contribution = Math.abs(row.contribution_2);
  if (row.factor_3 === activeFactor) contribution = Math.abs(row.contribution_3);

  if (!contribution || contribution === 0) {
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
        <li>${prettyFactor(row.factor_1)} (${row.contribution_1})</li>
        <li>${prettyFactor(row.factor_2)} (${row.contribution_2})</li>
        <li>${prettyFactor(row.factor_3)} (${row.contribution_3})</li>
      </ol>
      <b>Predicted:</b> ${row.predicted_life_expectancy}<br/>
      <b>Actual:</b> ${row.actual_life_expectancy}
    `;
  });
}
