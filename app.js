// Global Data variables
let globalData = null;
let activeTab = 'potential'; // 'potential', 'bonus_potential', or 'flame'

// UI Elements
const selectEquipment = document.getElementById('select-equipment');
const selectTier = document.getElementById('select-tier');
const selectLines = document.getElementById('select-lines');

const statsChecklistContainer = document.getElementById('stats-checklist-container');
const btnClearStats = document.getElementById('btn-clear-stats');
const linesConfigGroup = document.getElementById('lines-config-group');

// Results elements
const textProbPercent = document.getElementById('prob-percentage');
const textProbOdds = document.getElementById('prob-odds-ratio');
const valP50 = document.getElementById('val-p50');
const valP75 = document.getElementById('val-p75');
const valP85 = document.getElementById('val-p85');
const valP95 = document.getElementById('val-p95');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadData();
});

// Setup events
function setupEventListeners() {
  // Tabs Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      
      // Update form lines selector visibility (flames roll 1 or 2 lines; potentials 2 or 3)
      if (activeTab === 'flame') {
        linesConfigGroup.querySelector('label').textContent = "Number of Flame Lines on Item";
        selectLines.innerHTML = `
          <option value="1">1 Line</option>
          <option value="2" selected>2 Lines</option>
        `;
      } else {
        linesConfigGroup.querySelector('label').textContent = "Number of Potential Lines on Item";
        selectLines.innerHTML = `
          <option value="2">2 Lines</option>
          <option value="3" selected>3 Lines</option>
        `;
      }
      
      populateEquipmentAndTiers();
      updateCostVisibility();
      resetResults();
    });
  });

  // Inputs Changes
  selectEquipment.addEventListener('change', () => {
    populateTiers();
    renderStatsChecklist();
    resetResults();
  });
  
  selectTier.addEventListener('change', () => {
    renderStatsChecklist();
    resetResults();
  });
  
  selectLines.addEventListener('change', (e) => {
    renderStatsChecklist();
    resetResults();
  });

  btnClearStats.addEventListener('click', () => {
    if (activeTab === 'flame') {
      document.querySelectorAll('.flame-stat-select').forEach(sel => {
        sel.value = '';
        const row = sel.closest('.flame-row');
        const valSel = row.querySelector('.flame-threshold-select');
        if (valSel) {
          valSel.innerHTML = '<option value="">Min Value</option>';
          valSel.value = '';
          valSel.disabled = true;
        }
      });
    } else {
      document.querySelectorAll('.potential-threshold-input').forEach(input => {
        input.value = '';
      });
    }
    resetResults();
  });

  // Calculate Odds button
  const btnCalculate = document.getElementById('btn-calculate-odds');
  if (btnCalculate) {
    btnCalculate.addEventListener('click', () => {
      calculateOdds();
    });
  }
}

// Fetch JSON data
function loadData() {
  fetch('data/probabilities.json')
    .then(response => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then(data => {
      globalData = data;
      populateEquipmentAndTiers();
      updateCostVisibility();
      resetResults();
    })
    .catch(error => {
      console.error("Failed to load probabilities data: ", error);
      alert("Error: Failed to load probability data. Make sure scripts/scrape_odds.py was executed and generated data/probabilities.json");
    });
}

// Populate Equipments and Tiers based on active tab
function populateEquipmentAndTiers() {
  if (!globalData) return;
  
  let source = null;
  if (activeTab === 'potential') source = globalData.potentials;
  else if (activeTab === 'bonus_potential') source = globalData.bonus_potentials;
  else if (activeTab === 'flame') source = globalData.flames;
  
  if (!source) return;
  
  // Populate Equipment
  const equips = Object.keys(source).sort();
  selectEquipment.innerHTML = '';
  equips.forEach(eq => {
    const opt = document.createElement('option');
    opt.value = eq;
    opt.textContent = eq;
    selectEquipment.appendChild(opt);
  });
  
  // Select default equipment
  if (equips.includes("Weapon")) selectEquipment.value = "Weapon";
  else if (equips.length > 0) selectEquipment.value = equips[0];
  
  populateTiers();
}

function populateTiers() {
  if (!globalData) return;
  
  const eq = selectEquipment.value;
  let source = null;
  if (activeTab === 'potential') source = globalData.potentials[eq];
  else if (activeTab === 'bonus_potential') source = globalData.bonus_potentials[eq];
  else if (activeTab === 'flame') source = globalData.flames[eq];
  
  if (!source) {
    selectTier.innerHTML = '';
    return;
  }
  
  const tiers = Object.keys(source);
  selectTier.innerHTML = '';
  
  // Rebirth flame has Mythic, Potentials do not
  const tierOrder = ["Mythic", "Legendary", "Unique", "Epic", "Rare"];
  tierOrder.forEach(t => {
    if (tiers.includes(t)) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      selectTier.appendChild(opt);
    }
  });
  
  // Select highest tier by default
  if (selectTier.options.length > 0) {
    selectTier.selectedIndex = 0;
  }
  
  renderStatsChecklist();
}

// Render Presets


// Render Stat Dropdown Rows matching lines count (for flames) or all possible stats (for potentials)
function renderStatsChecklist() {
  statsChecklistContainer.innerHTML = '';
  
  if (!globalData) return;
  
  const eq = selectEquipment.value;
  const tier = selectTier.value;
  const lines = parseInt(selectLines.value);
  const legendPanel = document.querySelector('.legend-panel');
  const grid = document.querySelector('.calculator-grid');
  
  let sourceList = [];
  let firstPool = [];
  let secThirdPool = [];
  
  if (activeTab === 'potential') {
    const eqData = globalData.potentials[eq];
    if (eqData && eqData[tier]) {
      firstPool = eqData[tier]["first"] || [];
      secThirdPool = eqData[tier]["second_third"] || [];
      sourceList = [...firstPool, ...secThirdPool];
    }
  } else if (activeTab === 'bonus_potential') {
    const eqData = globalData.bonus_potentials[eq];
    if (eqData && eqData[tier]) {
      firstPool = eqData[tier]["first"] || [];
      secThirdPool = eqData[tier]["second_third"] || [];
      sourceList = [...firstPool, ...secThirdPool];
    }
  } else if (activeTab === 'flame') {
    const eqData = globalData.flames[eq];
    if (eqData && eqData[tier]) {
      sourceList = eqData[tier] || [];
    }
  }
  
  // Configure grid columns and Legend Panel visibility based on active tab
  if (activeTab === 'flame') {
    if (legendPanel) legendPanel.style.display = 'none';
    if (grid) grid.style.gridTemplateColumns = '450px 1fr';
  } else {
    if (legendPanel) legendPanel.style.display = 'flex';
    if (grid) grid.style.gridTemplateColumns = '320px 430px 1fr';
    updateRollGuide(firstPool, secThirdPool);
  }
  
  // Blend checklist container (remove background/borders/padding)
  statsChecklistContainer.style.background = 'transparent';
  statsChecklistContainer.style.border = 'none';
  statsChecklistContainer.style.padding = '0';
  statsChecklistContainer.style.overflowY = 'visible';
  statsChecklistContainer.style.flex = 'initial';
  statsChecklistContainer.style.boxShadow = 'none';
  
  if (activeTab === 'flame') {
    // Get unique option names for the stat dropdown
    const uniqueOpts = Array.from(new Set(sourceList.map(o => o.raw_option)));
    if (uniqueOpts.some(o => o.startsWith("PHY ATK scales with"))) uniqueOpts.push("PHY ATK scales with X");
    if (uniqueOpts.some(o => o.startsWith("MAG ATK scales with"))) uniqueOpts.push("MAG ATK scales with X");
    if (uniqueOpts.some(o => o.startsWith("Crit DMG scales with"))) uniqueOpts.push("Crit DMG scales with X");
    uniqueOpts.sort();
    
    for (let i = 1; i <= lines; i++) {
      const row = document.createElement('div');
      row.className = 'flame-row flame-row-only';
      
      const leftDiv = document.createElement('div');
      leftDiv.className = 'flame-row-left';
      
      const select = document.createElement('select');
      select.className = 'flame-stat-select';
      
      const optAny = document.createElement('option');
      optAny.value = '';
      optAny.textContent = 'Any Stat';
      select.appendChild(optAny);
      
      uniqueOpts.forEach(optVal => {
        const optEl = document.createElement('option');
        optEl.value = optVal;
        optEl.textContent = optVal;
        select.appendChild(optEl);
      });
      
      leftDiv.appendChild(select);
      row.appendChild(leftDiv);
      
      const rightDiv = document.createElement('div');
      rightDiv.className = 'flame-row-right';
      
      const valueSelect = document.createElement('select');
      valueSelect.className = 'flame-threshold-select';
      valueSelect.disabled = true;
      
      const optAnyVal = document.createElement('option');
      optAnyVal.value = '';
      optAnyVal.textContent = 'Min Value';
      valueSelect.appendChild(optAnyVal);
      
      rightDiv.appendChild(valueSelect);
      row.appendChild(rightDiv);
      
      select.addEventListener('change', () => {
        const selectedVal = select.value;
        valueSelect.innerHTML = '';
        
        if (selectedVal) {
          if (selectedVal.endsWith("scales with X")) {
            valueSelect.disabled = true;
            const optAnyVal = document.createElement('option');
            optAnyVal.value = '';
            optAnyVal.textContent = 'Min Value';
            valueSelect.appendChild(optAnyVal);
          } else {
            valueSelect.disabled = false;
            
            const optAnyVal = document.createElement('option');
            optAnyVal.value = '';
            optAnyVal.textContent = 'Any Value';
            valueSelect.appendChild(optAnyVal);
            
            // Find unique values for selected raw option in the pool
            const statVals = Array.from(new Set(sourceList.filter(o => o.raw_option === selectedVal).map(o => o.value)));
            const getNumeric = (s) => parseFloat((s || "0").replace('%', ''));
            statVals.sort((a, b) => getNumeric(a) - getNumeric(b));
            
            statVals.forEach(v => {
              const optEl = document.createElement('option');
              optEl.value = getNumeric(v);
              optEl.textContent = v;
              valueSelect.appendChild(optEl);
            });
          }
        } else {
          valueSelect.disabled = true;
          const optPlaceholder = document.createElement('option');
          optPlaceholder.value = '';
          optPlaceholder.textContent = 'Min Value';
          valueSelect.appendChild(optPlaceholder);
        }
        // recalc deferred to button
      });
      
      valueSelect.addEventListener('change', () => {
        // recalc deferred to button
      });
      
      statsChecklistContainer.appendChild(row);
    }
  } else {
    // Potentials & Bonus Potentials: List all possible options as static label rows with number inputs
    const uniqueOpts = Array.from(new Set(sourceList.map(o => o.option))).sort();
    
    if (uniqueOpts.length === 0) {
      statsChecklistContainer.innerHTML = '<div style="color: var(--text-muted); padding: 1rem; text-align: center;">No stats found for this configuration.</div>';
      return;
    }
    
    uniqueOpts.forEach(opt => {
      const isPercent = sourceList.some(o => o.option === opt && o.value.includes("%"));
      
      let labelText = opt;
      if (!labelText.includes("(%)") && !labelText.includes("(flat)")) {
        labelText += isPercent ? " (%)" : " (flat)";
      }
      
      const row = document.createElement('div');
      row.className = 'flame-row potential-row-only';
      
      const leftDiv = document.createElement('div');
      leftDiv.className = 'flame-row-left';
      
      const label = document.createElement('span');
      label.style.fontWeight = '500';
      label.style.fontSize = '0.85rem';
      label.textContent = labelText;
      leftDiv.appendChild(label);
      row.appendChild(leftDiv);
      
      const rightDiv = document.createElement('div');
      rightDiv.className = 'flame-row-right';
      
      const valInput = document.createElement('input');
      valInput.type = 'number';
      valInput.step = 'any';
      valInput.placeholder = 'Min';
      valInput.className = 'chk-input-val potential-threshold-input';
      valInput.dataset.stat = opt;
      
      rightDiv.appendChild(valInput);
      row.appendChild(rightDiv);
      
      valInput.addEventListener('input', () => {
        // recalc deferred to button
      });
      
      statsChecklistContainer.appendChild(row);
    });
  }
}

// Update dynamic stat roll guide in the Legend Panel as a table
function updateRollGuide(firstPool, secThirdPool) {
  const legendContainer = document.getElementById('legend-content');
  if (!legendContainer) return;
  
  if (firstPool.length === 0 && secThirdPool.length === 0) {
    legendContainer.innerHTML = '<p class="legend-empty-text">No stats available for this configuration.</p>';
    return;
  }
  
  const getNumeric = (s) => parseFloat((s || "0").replace('%', ''));
  
  // Union of all options
  const uniqueOpts = Array.from(new Set([
    ...firstPool.map(o => o.option),
    ...secThirdPool.map(o => o.option)
  ])).sort();
  
  // Build table
  let html = '<table class="legend-table" style="table-layout: fixed; width: 100%;">';
  html += '<colgroup><col style="width: 46%;"><col style="width: 18%;"><col style="width: 18%;"><col style="width: 18%;"></colgroup>';
  html += '<thead><tr><th>Stat</th><th>1L Max</th><th>2L Max</th><th>3L Max</th></tr></thead>';
  html += '<tbody>';
  
  const round1D = (val) => Math.round(val * 10) / 10;
  
  uniqueOpts.forEach(opt => {
    const firstEntries = firstPool.filter(o => o.option === opt);
    const secEntries = secThirdPool.filter(o => o.option === opt);
    
    // Get max value from first line pool
    const firstVals = firstEntries.map(o => getNumeric(o.value));
    const secVals = secEntries.map(o => getNumeric(o.value));
    
    const maxFirst = firstVals.length > 0 ? Math.max(...firstVals) : 0;
    const maxSec = secVals.length > 0 ? Math.max(...secVals) : 0;
    
    // 1L max: best of first-line or second-line single roll
    const max1L = Math.max(maxFirst, maxSec);
    // 2L max: first-line max + second-line max
    const max2L = maxFirst + maxSec;
    // 3L max: first-line max + 2 * second-line max
    const max3L = maxFirst + (maxSec * 2);
    
    // Detect if percent-based
    const isPercent = firstEntries.some(o => o.value.includes('%')) || secEntries.some(o => o.value.includes('%'));
    const suffix = isPercent ? '%' : '';
    
    html += '<tr>';
    html += `<td class="legend-stat-name">${opt}</td>`;
    html += `<td>${round1D(max1L)}${suffix}</td>`;
    html += `<td>${round1D(max2L)}${suffix}</td>`;
    html += `<td>${round1D(max3L)}${suffix}</td>`;
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  legendContainer.innerHTML = html;
}

// Display impossible/error message in result panel
function displayResultsError(msg) {
  textProbPercent.innerHTML = `<span class="error-text">Impossible</span>`;
  textProbOdds.innerHTML = `<span class="error-subtext">${msg}</span>`;
  valP50.textContent = "N/A";
  valP75.textContent = "N/A";
  valP85.textContent = "N/A";
  valP95.textContent = "N/A";
  
  document.querySelectorAll('.percentile-card-cost').forEach(el => {
    el.style.display = 'none';
  });
}

// Helper to check if a rolled tuple of options meets target criteria
function isTupleMatching(tuple, checkedStats, statThresholds) {
  const tupleSums = {};
  const tupleCounts = {};
  
  tuple.forEach(it => {
    const opt = (activeTab === 'flame') ? it.raw_option : it.option;
    const val = parseFloat((it.value || "0").replace('%', ''));
    tupleSums[opt] = (tupleSums[opt] || 0) + val;
    tupleCounts[opt] = (tupleCounts[opt] || 0) + 1;
  });
  
  // Count requested targets
  const reqCounts = {};
  checkedStats.forEach(opt => {
    reqCounts[opt] = (reqCounts[opt] || 0) + 1;
  });
  
  for (const opt of Object.keys(reqCounts)) {
    let count = 0;
    let sumVal = 0.0;
    
    if (activeTab === 'flame' && opt.endsWith("scales with X")) {
      // Sum up any rolled option that matches "scales with X" generic type (option === opt)
      tuple.forEach(it => {
        if (it.option === opt) {
          count++;
          sumVal += parseFloat((it.value || "0").replace('%', ''));
        }
      });
    } else {
      count = tupleCounts[opt] || 0;
      sumVal = tupleSums[opt] || 0;
    }
    
    const reqCount = reqCounts[opt];
    if (count < reqCount) {
      return false; // did not roll enough lines of this stat
    }
    
    const th = statThresholds[opt];
    if (th !== undefined && th !== null) {
      if (sumVal < th) {
        return false; // threshold not met
      }
    }
  }
  
  return true;
}

// Update cost input visibility based on active tab
function updateCostVisibility() {
  const costConfig = document.getElementById('cost-config');
  const mesoRow = document.getElementById('cost-meso-row');
  const crystalInput = document.getElementById('input-crystal-cost');
  
  if (activeTab === 'flame') {
    costConfig.style.display = 'none';
  } else if (activeTab === 'bonus_potential') {
    costConfig.style.display = 'block';
    mesoRow.style.display = 'none';
    crystalInput.value = '50';
  } else {
    costConfig.style.display = 'block';
    mesoRow.style.display = 'flex';
    crystalInput.value = '25';
  }
}

// Reset results panel to default empty state
function resetResults() {
  document.getElementById('prob-percentage').textContent = '—';
  document.getElementById('prob-odds-ratio').textContent = 'Configure stats and click Calculate';
  document.getElementById('val-p50').textContent = '-';
  document.getElementById('val-p75').textContent = '-';
  document.getElementById('val-p85').textContent = '-';
  document.getElementById('val-p95').textContent = '-';
  
  // Hide cost sections
  const costSections = document.querySelectorAll('.percentile-card-cost');
  costSections.forEach(el => {
    el.style.display = 'none';
  });
}

// Calculate success probability and percentiles
function calculateOdds() {
  if (!globalData) return;
  
  const eq = selectEquipment.value;
  const tier = selectTier.value;
  const lines = parseInt(selectLines.value);
  
  let checkedStats = [];
  let statThresholds = {};
  
  if (activeTab === 'flame') {
    const selects = document.querySelectorAll('.flame-stat-select');
    const valSelects = document.querySelectorAll('.flame-threshold-select');
    
    selects.forEach((sel, idx) => {
      const val = sel.value;
      if (val) {
        checkedStats.push(val);
        const valSel = valSelects[idx];
        if (valSel && valSel.value !== "") {
          statThresholds[val] = (statThresholds[val] || 0) + parseFloat(valSel.value);
        }
      }
    });
  } else {
    const inputs = document.querySelectorAll('.potential-threshold-input');
    inputs.forEach(input => {
      const val = input.value;
      if (val !== "" && !isNaN(parseFloat(val))) {
        const statName = input.dataset.stat;
        checkedStats.push(statName);
        statThresholds[statName] = parseFloat(val);
      }
    });
  }
  
  let successProb = 0.0;
  
  if (checkedStats.length === 0) {
    displayResults(activeTab === 'flame' ? 1.0 : 0.0);
    return;
  }
  
  // Fetch probabilities lists
  let firstPool = [];
  let secThirdPool = [];
  
  if (activeTab === 'potential' || activeTab === 'bonus_potential') {
    const source = activeTab === 'potential' ? globalData.potentials : globalData.bonus_potentials;
    const eqData = source[eq];
    if (eqData && eqData[tier]) {
      firstPool = eqData[tier]["first"] || [];
      secThirdPool = eqData[tier]["second_third"] || [];
    }
  } else if (activeTab === 'flame') {
    const eqData = globalData.flames[eq];
    if (eqData && eqData[tier]) {
      firstPool = eqData[tier] || [];
      secThirdPool = eqData[tier] || []; // same pool for both lines in flames
    }
  }
  
  if (firstPool.length === 0 && secThirdPool.length === 0) {
    displayResults(0.0);
    return;
  }
  
  // Math impossibility validation for potentials / bonus potentials
  if (activeTab === 'potential' || activeTab === 'bonus_potential') {
    if (checkedStats.length > lines) {
      displayResultsError("Cannot select more target stats than the number of lines (" + lines + ") available.");
      return;
    }
    
    let totalMinLinesRequired = 0;
    
    for (const opt of checkedStats) {
      const firstVals = firstPool.filter(o => o.option === opt).map(o => parseFloat((o.value || "0").replace('%', '')));
      const secVals = secThirdPool.filter(o => o.option === opt).map(o => parseFloat((o.value || "0").replace('%', '')));
      
      const maxFirst = firstVals.length > 0 ? Math.max(...firstVals) : 0;
      const maxSec = secVals.length > 0 ? Math.max(...secVals) : 0;
      
      if (maxFirst === 0 && maxSec === 0) {
        displayResultsError(opt + " is not rollable on this equipment tier.");
        return;
      }
      
      const targetVal = statThresholds[opt];
      if (targetVal !== undefined && targetVal !== null && !isNaN(targetVal)) {
        // Build descending slots
        let slots = [];
        if (lines === 1) slots = [maxFirst];
        else if (lines === 2) slots = [maxFirst, maxSec];
        else if (lines === 3) slots = [maxFirst, maxSec, maxSec];
        slots.sort((a, b) => b - a);
        
        const sumMaxPossible = slots.reduce((a, b) => a + b, 0);
        if (targetVal > sumMaxPossible) {
          displayResultsError("Min value for " + opt + " exceeds the absolute maximum roll possible (" + sumMaxPossible + "%).");
          return;
        }
        
        // Find minimum lines required to hit the threshold
        let linesReq = 1;
        if (targetVal <= slots[0]) {
          linesReq = 1;
        } else if (lines > 1 && targetVal <= slots[0] + slots[1]) {
          linesReq = 2;
        } else if (lines > 2 && targetVal <= slots[0] + slots[1] + slots[2]) {
          linesReq = 3;
        }
        totalMinLinesRequired += linesReq;
      } else {
        // Checking the option without a minimum value requires at least 1 line
        totalMinLinesRequired += 1;
      }
    }
    
    if (totalMinLinesRequired > lines) {
      displayResultsError("Required combination of stats requires at least " + totalMinLinesRequired + " lines, which exceeds the item's line limit.");
      return;
    }
  }
  
  // Use raw probabilities directly from the JSON
  const normFirstPool = firstPool;
  const normSecThirdPool = secThirdPool;
  
  if (activeTab === 'flame' && checkedStats.length === 0) {
    successProb = 1.0;
  } else if (lines === 1) {
    // 1 Line (Flames only)
    normFirstPool.forEach(item1 => {
      const isMatch = isTupleMatching([item1], checkedStats, statThresholds);
      if (isMatch) {
        successProb += item1.prob;
      }
    });
  } else if (lines === 2) {
    // 2 Lines
    normFirstPool.forEach(item1 => {
      normSecThirdPool.forEach(item2 => {
        const isMatch = isTupleMatching([item1, item2], checkedStats, statThresholds);
        if (isMatch) {
          successProb += item1.prob * item2.prob;
        }
      });
    });
  } else if (lines === 3) {
    // 3 Lines
    normFirstPool.forEach(item1 => {
      normSecThirdPool.forEach(item2 => {
        normSecThirdPool.forEach(item3 => {
          const isMatch = isTupleMatching([item1, item2, item3], checkedStats, statThresholds);
          if (isMatch) {
            successProb += item1.prob * item2.prob * item3.prob;
          }
        });
      });
    });
  }
  
  displayResults(successProb);
}

// Display results
function displayResults(p) {
  if (p <= 0.0) {
    textProbPercent.textContent = "0.0000%";
    textProbOdds.textContent = "Odds: 1 in ∞ rolls";
    valP50.textContent = "-";
    valP75.textContent = "-";
    valP85.textContent = "-";
    valP95.textContent = "-";
    
    document.querySelectorAll('.percentile-card-cost').forEach(el => {
      el.style.display = 'none';
    });
    return;
  }
  
  // Format percentage display
  const pPercent = (p * 100).toFixed(4);
  textProbPercent.textContent = `${pPercent}%`;
  
  const oddsRatio = Math.round(1 / p);
  textProbOdds.textContent = `Odds: 1 in ${oddsRatio.toLocaleString()} roll${oddsRatio > 1 ? 's' : ''}`;
  
  // Calculate Geometric Percentiles: n = ceil( ln(1 - X) / ln(1 - p) )
  const calculatePercentile = (targetPct) => {
    return Math.ceil(Math.log(1 - targetPct) / Math.log(1 - p));
  };
  
  const n50 = calculatePercentile(0.50);
  const n75 = calculatePercentile(0.75);
  const n85 = calculatePercentile(0.85);
  const n95 = calculatePercentile(0.95);
  
  valP50.textContent = n50.toLocaleString();
  valP75.textContent = n75.toLocaleString();
  valP85.textContent = n85.toLocaleString();
  valP95.textContent = n95.toLocaleString();
  
  if (activeTab === 'flame') {
    document.querySelectorAll('.percentile-card-cost').forEach(el => {
      el.style.display = 'none';
    });
    return;
  }
  
  // Calculate cost estimates for each percentile card
  const percentiles = [
    { key: 'p50', rolls: n50 },
    { key: 'p75', rolls: n75 },
    { key: 'p85', rolls: n85 },
    { key: 'p95', rolls: n95 }
  ];
  
  const crystalPerCube = activeTab === 'bonus_potential' ? 50 : 25;
  const mesoInput = document.getElementById('input-meso-cost');
  const mesoCost = mesoInput ? parseFloat(mesoInput.value) : 0;
  const showMeso = activeTab === 'potential' && mesoCost > 0;
  
  percentiles.forEach(pct => {
    const costContainer = document.getElementById(`cost-${pct.key}`);
    const mesoEl = document.getElementById(`cost-meso-${pct.key}`);
    const crystalEl = document.getElementById(`cost-crystal-${pct.key}`);
    
    if (costContainer) {
      costContainer.style.display = 'flex';
      
      // Crystal cost
      if (crystalEl) {
        const crystalTotal = pct.rolls * crystalPerCube;
        crystalEl.textContent = `💎 ${crystalTotal.toLocaleString()}`;
        crystalEl.style.display = 'block';
      }
      
      // Meso cost
      if (mesoEl) {
        if (showMeso) {
          const mesoTotal = pct.rolls * (mesoCost * 1000000);
          mesoEl.textContent = `💰 ${formatMesos(mesoTotal)}`;
          mesoEl.style.display = 'block';
        } else {
          mesoEl.style.display = 'none';
        }
      }
    }
  });
}

function formatMesos(amount) {
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1) + 'B';
  } else if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + 'M';
  } else if (amount >= 1_000) {
    return (amount / 1_000).toFixed(1) + 'K';
  }
  return amount.toLocaleString();
}
