let map = L.map('map').setView([37.8, -96], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

let countyData = {};
let activeFactor = null;
let geoLayer;

// ---------- Load CSV ----------
Papa.parse("data.csv", {
  header: true,
  download: true,
  complete: function(results) {
    results.data.forEach(row => {
      let countyKey = `${row.County} County, ${row.State}`;
      countyData[countyKey] = row;
    });
    buildFactorList(results.data);
  }
});

// ---------- Build factor list ----------
function buildFactorList(data) {
  let factors = new Set();

  data.forEach(d => {
    factors.add(d.factor_1);
    factors.add(d.factor_2);
    factors.add(d.factor_3);
  });

  let container = document.getElementById("factor-list");
  factors.forEach(f => {
    let div = document.createElement("div");
    div.className = "factor";
    div.innerText = f;
    div.onclick = () => {
      activeFactor = f;
      geoLayer.setStyle(styleFeature);
    };
    container.appendChild(div);
  });
}

// ---------- Load GeoJSON ----------
fetch("counties.geojson")
  .then(r => r.json())
  .then(geo => {
    geoLayer = L.geoJson(geo, {
      style: styleFeature,
      onEachFeature: onEachFeature
    }).addTo(map);
  });

// ---------- Styling ----------
function styleFeature(feature) {
  let key = `${feature.properties.NAME} County, ${feature.properties.STATE}`;
  let row = countyData[key];

  if (!row || !activeFactor) {
    return { fillOpacity: 0 };
  }

  let contribution = 0;
  if (row.factor_1 === activeFactor) contribution = Math.abs(row.contribution_1);
  if (row.factor_2 === activeFactor) contribution = Math.abs(row.contribution_2);
  if (row.factor_3 === activeFactor) contribution = Math.abs(row.contribution_3);

  if (contribution === 0) {
    return { fillOpacity: 0 };
  }

  return {
    fillColor: 'red',
    fillOpacity: Math.min(contribution, 1),
    weight: 0.5,
    color: '#333'
  };
}

// ---------- Click handler ----------
function onEachFeature(feature, layer) {
  layer.on('click', () => {
    let key = `${feature.properties.NAME} County, ${feature.properties.STATE}`;
    let row = countyData[key];

    if (!row) return;

    document.getElementById("county-info").innerHTML = `
      <b>${key}</b><br/><br/>
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
