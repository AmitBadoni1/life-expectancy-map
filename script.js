// =========================
// Factor definitions (your map)
// =========================
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
  "EPL_DIABETES": "Diabetes percentile",
  "E_UNEMP": "% Unemployed Population",
  "E_PARK": "% Area within 1 mil of greenspace",
  "E_MOBILE": "% Housing as Mobile Homes",
  "E_NOINT": "% Popluation without internet"
};

// Normalized lookup: lowercased+trimmed keys
const FACTOR_DEFS_NORM = {};
for (const key in FACTOR_DEFS) {
  FACTOR_DEFS_NORM[key.toLowerCase().trim()] = FACTOR_DEFS[key];
}

// Helper: get human label from factor code or return same if unknown
function getFactorLabel(code) {
  if (!code) return "";
  const norm = code.toString().toLowerCase().trim();
  return FACTOR_DEFS_NORM[norm] || code;
}

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
// Globals
// =========================
let countyData = {};   // keyed by stateFIPS-countyName
let activeFactor = null;
let geoLayer;

// =========================
// Leaflet init
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
      if (!row || (!row.State && !row.County)) return;

      const stateFIPS = stateToFIPS[row.State];
      if (!stateFIPS) return;

      const countyName = (row.County || "").trim().toLowerCase();
      if (!countyName) return;

      const key = `${stateFIPS}-${countyName}`;
      countyData[key] = row;
    });

    buildFactorList(results.data);
    loadGeoJSON();
  }
});

// =========================
// Build factor list (using mapping when available)
// =========================
function buildFactorList(data) {
  const factors = new Set();

  data.forEach(d => {
    if (d.factor_1) factors.add(d.factor_1);
    if (d.factor_2) factors.add(d.factor_2);
    if (d.factor_3) factors.add(d.factor_3);
  });

  const container = document.getElementById("factor-list");
  container.innerHTML = "";

  factors.forEach(rawCode => {
    const code = (rawCode || "").toString();
    const human = getFactorLabel(code);

    const div = document.createElement("div");
    div.className = "factor";

    // If we have a different human label, show "CODE — Label"
    if (human !== code) {
      div.innerHTML = `<b>${code}</b> — ${human}`;
    } else {
      // Already human-readable or no mapping; show once
      div.innerHTML = code;
    }

    div.onclick = () => {
      activeFactor = code;
      if (geoLayer) geoLayer.setStyle(styleFeature);
    };

    container.appendChild(div);
  });
}

// =========================
// Load GeoJSON
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
// Style counties
// =========================
function styleFeature(feature) {
  const stateFIPS = feature.properties.STATE;
  const countyName = feature.properties.NAME.toLowerCase();
  const key = `${stateFIPS}-${countyName}`;
  const row = countyData[key];

  if (!row || !activeFactor) {
    return { fillOpacity: 0, color: '#333', weight: 0.5 };
  }

  let contribution = 0;

  if (row.factor_1 === activeFactor) contribution = Math.abs(row.contribution_1);
  if (row.factor_2 === activeFactor) contribution = Math.abs(row.contribution_2);
  if (row.factor_3 === activeFactor) contribution = Math.abs(row.contribution_3);

  if (!contribution) {
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
// Click handler — show mapped factor names
// =========================
function onEachFeature(feature, layer) {
  layer.on('click', () => {
    const stateFIPS = feature.properties.STATE;
    const countyName = feature.properties.NAME.toLowerCase();
    const key = `${stateFIPS}-${countyName}`;
    const row = countyData[key];
    if (!row) return;

    const f1Code = row.factor_1;
    const f2Code = row.factor_2;
    const f3Code = row.factor_3;

    const f1Label = getFactorLabel(f1Code);
    const f2Label = getFactorLabel(f2Code);
    const f3Label = getFactorLabel(f3Code);

    // Avoid repeating identical code + label
    const f1Text = (f1Label !== f1Code) ? `<b>${f1Code}</b> — ${f1Label}` : f1Code;
    const f2Text = (f2Label !== f2Code) ? `<b>${f2Code}</b> — ${f2Label}` : f2Code;
    const f3Text = (f3Label !== f3Code) ? `<b>${f3Code}</b> — ${f3Label}` : f3Code;

    document.getElementById("county-info").innerHTML = `
      <b>${row.County}, ${row.State}</b><br/><br/>
      <b>Top factors:</b>
      <ol>
        <li>${f1Text} (${row.contribution_1})</li>
        <li>${f2Text} (${row.contribution_2})</li>
        <li>${f3Text} (${row.contribution_3})</li>
      </ol>
      <b>Predicted:</b> ${row.predicted_life_expectancy}<br/>
      <b>Actual:</b> ${row.actual_life_expectancy}
    `;
  });
}
