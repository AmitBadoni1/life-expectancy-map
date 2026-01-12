//-----------------------------------------
// CONFIG
//-----------------------------------------


const DATA_CSV = "data.csv";
const GEOJSON_FILE = "counties.geojson";

let map;
let geoLayer;
let countyData = {};
let activeFactor = null;

// Factor rename overrides
const FACTOR_RENAME = {
  "E_UNEMP": "% Unemployed Population",
  "E_PARK": "% Area within 1 mil of greenspace",
  "E_MOBILE": "% Housing as Mobile Homes",
  "E_NOINT": "% Population without internet",
  "E_TOTCR": "Air toxics cancer risk"
};

// Factor -> bucket mapping
const FACTOR_BUCKETS = {
  "Environmental": ["E_TOTCR", "E_PARK"],
  "Health": [
    "Obesity among adults aged >=18 years",
    "Current asthma among adults aged >=18 years",
    "Sleeping less than 7 hours among adults aged >=18 years",
    "Older adult women aged >=65 years who are up to date on a core set of clinical preventive services: Flu shot past year, PPV shot ever, Colorectal cancer screening, and Mammogram past 2 years"
  ],
  "Income": [
    "Household Income (Pacific Islander)",
    "% Food Insecure",
    "% Population without internet"
  ],
  "Demographics": [
    "% Asian",
    "% Unemployed",
    "% Unemployed Population"
  ],
  "Other": [
    "Average Grade Performance",
    "Visits to doctor for routine checkup within the past year among adults aged >=18 years",
    "Cervical cancer screening among adult women aged 21-65 years"
  ]
};

//-----------------------------------------
// INITIALIZE MAP
//-----------------------------------------
function initMap() {
  map = L.map('map').setView([37.8, -96], 4);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

//-----------------------------------------
// LOAD CSV
//-----------------------------------------
function loadCSV() {
  Papa.parse(DATA_CSV, {
    header: true,
    download: true,
    complete: results => {
      results.data.forEach(row => {
        const state = row.State?.trim();
        const county = row.County?.trim();

        if (!state || !county) return;

        // Match GeoJSON naming convention
        const key = `${county} County, ${state}`;
        countyData[key] = row;
      });

      console.log("Loaded:", Object.keys(countyData).length, "counties");
      loadGeoJSON();
    }
  });
}

//-----------------------------------------
// LOAD GEOJSON
//-----------------------------------------
function loadGeoJSON() {
  fetch(GEOJSON_FILE)
    .then(r => r.json())
    .then(geojson => {
      geoLayer = L.geoJSON(geojson, {
        style: baseStyle,
        onEachFeature: onEachCounty
      }).addTo(map);

      fillBuckets();
    });
}

//-----------------------------------------
// BASE MAP STYLE
//-----------------------------------------
function baseStyle() {
  return {
    color: "#555",
    weight: 0.5,
    fillOpacity: 0.15,
    fillColor: "#ffffff"
  };
}

//-----------------------------------------
// FACTOR STYLE WHEN ACTIVE
//-----------------------------------------
function styleCounty(feature) {
  const key = `${feature.properties.NAME} County, ${feature.properties.STATE}`;
  const row = countyData[key];
  if (!row || !activeFactor) return baseStyle();

  let contribution = 0;

  if (row.factor_1 === activeFactor) contribution = Math.abs(parseFloat(row.contribution_1 || 0));
  if (row.factor_2 === activeFactor) contribution = Math.abs(parseFloat(row.contribution_2 || 0));
  if (row.factor_3 === activeFactor) contribution = Math.abs(parseFloat(row.contribution_3 || 0));

  if (contribution === 0) return baseStyle();

  return {
    color: "#800000",
    weight: 0.6,
    fillOpacity: Math.min(contribution, 0.9),
    fillColor: "#ff4f4f"
  };
}

//-----------------------------------------
// COUNTY CLICK HANDLER
//-----------------------------------------
function onEachCounty(feature, layer) {
  layer.on("click", () => showCountyDetails(feature));
}

function showCountyDetails(feature) {
  const key = `${feature.properties.NAME} County, ${feature.properties.STATE}`;
  const row = countyData[key];

  const titleEl = document.getElementById("county-title");
  const detailEl = document.getElementById("county-details");

  if (!row) {
    titleEl.textContent = feature.properties.NAME + " (no data)";
    detailEl.innerHTML = "";
    return;
  }

  titleEl.textContent = key;

  const factors = [
    { name: row.factor_1, val: parseFloat(row.contribution_1) },
    { name: row.factor_2, val: parseFloat(row.contribution_2) },
    { name: row.factor_3, val: parseFloat(row.contribution_3) }
  ]
    .filter(d => d.name)
    .sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

  let html = `<b>Top factors:</b><br><ol>`;
  factors.forEach(f => {
    html += `<li>${renameFactor(f.name)} (${f.val.toFixed(4)})</li>`;
  });
  html += `</ol>`;

  html += `<b>Predicted:</b> ${parseFloat(row.predicted_life_expectancy).toFixed(2)}<br>`;
  html += `<b>Actual:</b> ${parseFloat(row.actual_life_expectancy).toFixed(2)}<br>`;

  detailEl.innerHTML = html;
}

//-----------------------------------------
// FACTOR RENAME FUNCTION
//-----------------------------------------
function renameFactor(name) {
  return FACTOR_RENAME[name] || name;
}

//-----------------------------------------
// FILL BUCKETS WITH FACTORS
//-----------------------------------------
function fillBuckets() {
  Object.entries(FACTOR_BUCKETS).forEach(([bucket, list]) => {
    const div = document.querySelector(`#bucket-${bucket.toLowerCase()} .factor-list`);
    div.innerHTML = "";

    list.forEach(factor => {
      const el = document.createElement("div");
      el.className = "factor";
      el.textContent = renameFactor(factor);
      el.onclick = () => activateFactor(factor);
      div.appendChild(el);
    });
  });
}

//-----------------------------------------
// ACTIVATE FACTOR (HIGHLIGHT MAP)
//-----------------------------------------
function activateFactor(factor) {
  activeFactor = factor;
  geoLayer.setStyle(styleCounty);
}

//-----------------------------------------
// INIT
//-----------------------------------------
initMap();
loadCSV();



