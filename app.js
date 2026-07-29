// Global Data variables
let globalData = null;
let activeTab = 'potential'; // 'potential', 'bonus_potential', or 'flame'

// Helper to filter allowed potentials in target checklist selector dropdowns
function isAllowedPotential(opt) {
  const allowed = [
    "Max HP (%)", "Max HP (flat)", "Max HP", "PHY ATK", "MAG ATK", "Crit DMG",
    "Item Drop Rate Increase", "EXP Increase", "PHY ATK Increase",
    "MAG ATK Increase", "PHY DMG Increase", "MAG DMG Increase",
    "Boss ATK Increase (%)", "Boss ATK Increase", "SPD Increase", "Speed"
  ];
  return allowed.includes(opt);
}

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
      saveCurrentTabState();
      activeTab = btn.getAttribute('data-tab');
      onTabChange();
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

  // Help Modal functionality
  const btnOpenHelp = document.getElementById('btn-open-help');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const helpModal = document.getElementById('help-modal');
  
  if (btnOpenHelp && btnCloseModal && helpModal) {
    btnOpenHelp.addEventListener('click', () => {
      helpModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
    
    btnCloseModal.addEventListener('click', () => {
      helpModal.style.display = 'none';
      document.body.style.overflow = '';
    });
    
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }

  // Simulator Controls
  const btnSimRoll = document.getElementById('btn-sim-roll');
  const btnSimAuto = document.getElementById('btn-sim-auto');
  const btnSimReset = document.getElementById('btn-sim-reset');
  const selectSimMode = document.getElementById('select-sim-mode');
  const simSelectEquipment = document.getElementById('sim-select-equipment');
  const simSelectTier = document.getElementById('sim-select-tier');
  const simSelectLines = document.getElementById('sim-select-lines');
  const btnSimClearTarget = document.getElementById('btn-sim-clear-stats');
  
  if (btnSimRoll) {
    btnSimRoll.addEventListener('click', () => {
      rollSimItem();
    });
  }
  if (btnSimAuto) {
    btnSimAuto.addEventListener('click', () => {
      autoRollSimItem();
    });
  }
  if (btnSimReset) {
    btnSimReset.addEventListener('click', () => {
      resetSimStats();
    });
  }
  if (selectSimMode) {
    selectSimMode.addEventListener('change', () => {
      populateSimEquipmentAndTiers(true);
      initSimulator();
    });
  }
  if (simSelectEquipment) {
    simSelectEquipment.addEventListener('change', () => {
      populateSimTiers();
    });
  }
  if (simSelectTier) {
    simSelectTier.addEventListener('change', () => {
      renderSimStatsChecklist();
      initSimulator();
    });
  }
  if (simSelectLines) {
    simSelectLines.addEventListener('change', () => {
      renderSimStatsChecklist();
      initSimulator();
    });
  }
  if (btnSimClearTarget) {
    btnSimClearTarget.addEventListener('click', () => {
      const inputs = document.querySelectorAll('#sim-stats-checklist-container .sim-potential-threshold-input');
      inputs.forEach(i => i.value = '');
      
      const selects = document.querySelectorAll('#sim-stats-checklist-container .sim-flame-stat-select');
      const valSelects = document.querySelectorAll('#sim-stats-checklist-container .sim-flame-threshold-select');
      selects.forEach((sel, idx) => {
        sel.value = '';
        const valSel = valSelects[idx];
        if (valSel) {
          valSel.innerHTML = '<option value="">Min Value</option>';
          valSel.value = '';
          valSel.disabled = true;
        }
      });
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
      initTabStates();
      populateSimEquipmentAndTiers();
      onTabChange();
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
  if (activeTab === 'potential' || activeTab === 'optimizer') source = globalData.potentials;
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
  if (activeTab === 'potential' || activeTab === 'optimizer') source = globalData.potentials[eq];
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
  
  if (activeTab === 'potential' || activeTab === 'optimizer') {
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
    // Filter raw options to exclude trash stats, and include both discrete and consolidated options
    const rawOpts = Array.from(new Set(sourceList.map(o => o.raw_option)));
    const uniqueOptsSet = new Set();
    rawOpts.forEach(o => {
      const isTarget = o.startsWith("PHY ATK scales with") ||
                       o.startsWith("MAG ATK scales with") ||
                       o.startsWith("Crit DMG scales with") ||
                       o.startsWith("Final DMG Increase") ||
                       o.startsWith("DEF Ignore Rate");
      if (isTarget) {
        uniqueOptsSet.add(o);
        if (o.startsWith("PHY ATK scales with")) uniqueOptsSet.add("PHY ATK scales with X");
        else if (o.startsWith("MAG ATK scales with")) uniqueOptsSet.add("MAG ATK scales with X");
        else if (o.startsWith("Crit DMG scales with")) uniqueOptsSet.add("Crit DMG scales with X");
      }
    });
    const uniqueOpts = Array.from(uniqueOptsSet).sort();
    
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
    // Potentials & Bonus Potentials: List only allowed options in the checklist
    const uniqueOpts = Array.from(new Set(sourceList.map(o => o.option)))
      .filter(isAllowedPotential)
      .sort();
    
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
  
  // Union of all options, filtered by allowed potentials
  const uniqueOpts = Array.from(new Set([
    ...firstPool.map(o => o.option),
    ...secThirdPool.map(o => o.option)
  ]))
    .filter(isAllowedPotential)
    .sort();
  
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
function isTupleMatching(tuple, checkedStats, statThresholds, isFlame = false) {
  const tupleSums = {};
  const tupleCounts = {};
  
  tuple.forEach(it => {
    const opt = isFlame ? (it.raw_option || it.option || '') : (it.option || it.raw_option || '');
    const val = parseFloat((it.value || "0").toString().replace('%', ''));
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
    
    if (isFlame && opt.endsWith("scales with X")) {
      const prefix = opt.replace("scales with X", "scales with");
      tuple.forEach(it => {
        const itemOpt = isFlame ? (it.raw_option || it.option || '') : (it.option || it.raw_option || '');
        if (itemOpt.startsWith(prefix)) {
          count++;
          sumVal += parseFloat((it.value || "0").toString().replace('%', ''));
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

// Toggle layouts, show/hide panel inputs, and reset results on tab change
function onTabChange() {
  const calcGrid = document.getElementById('calculator-grid');
  const simWorkspace = document.getElementById('simulator-workspace');
  const legendPanel = document.querySelector('.legend-panel');
  const configPanel = document.querySelector('.config-panel');
  const resultsPanel = document.querySelector('.results-panel');
  
  const costConfig = document.getElementById('cost-config');
  const mesoRow = document.getElementById('cost-meso-row');
  const crystalRow = document.getElementById('cost-crystal-row');
  const choiceMesoRow = document.getElementById('cost-choice-meso-row');
  const optModeRow = document.getElementById('opt-mode-row');
  const crystalsPerDollarRow = document.getElementById('crystals-per-dollar-row');
  const dollarsPerBillionRow = document.getElementById('dollars-per-billion-row');
  
  const standardResults = document.getElementById('standard-results-container');
  const optResults = document.getElementById('optimizer-results-container');
  const btnCalculate = document.getElementById('btn-calculate-odds');
  const resultsTitle = document.getElementById('results-panel-title');
  const linesGroup = document.getElementById('lines-config-group');
  
  // Reset outputs
  resetResults();
  
  if (activeTab === 'simulator') {
    calcGrid.style.display = 'none';
    simWorkspace.style.display = 'grid';
    // Initialize simulator view
    initSimulator();
    return;
  }
  
  calcGrid.style.display = 'grid';
  simWorkspace.style.display = 'none';
  
  // Show/hide lines group: flames roll 1 or 2 lines; potentials 2 or 3
  if (activeTab === 'flame') {
    linesGroup.style.display = 'block';
    linesGroup.querySelector('label').textContent = "Number of Flame Lines on Item";
    selectLines.innerHTML = `
      <option value="1">1 Line</option>
      <option value="2" selected>2 Lines</option>
    `;
  } else if (activeTab === 'optimizer') {
    // Optimizer is regular potentials, which is always 3 lines
    linesGroup.style.display = 'none';
    selectLines.innerHTML = `<option value="3" selected>3 Lines</option>`;
  } else {
    linesGroup.style.display = 'block';
    linesGroup.querySelector('label').textContent = "Number of Potential Lines on Item";
    selectLines.innerHTML = `
      <option value="2">2 Lines</option>
      <option value="3" selected>3 Lines</option>
    `;
  }
  
  populateEquipmentAndTiers();
  
  // Hide Legend for Rebirth Flames
  if (activeTab === 'flame') {
    legendPanel.style.display = 'none';
    calcGrid.style.gridTemplateColumns = '450px 1fr';
  } else {
    legendPanel.style.display = 'flex';
    calcGrid.style.gridTemplateColumns = '320px 430px 1fr';
  }
  
  // Show/hide cost inputs based on tab
  if (activeTab === 'flame') {
    costConfig.style.display = 'none';
  } else {
    costConfig.style.display = 'block';
    
    // Toggle Red Cube costs
    if (activeTab === 'bonus_potential') {
      mesoRow.style.display = 'none';
      crystalRow.style.display = 'flex';
      document.getElementById('input-crystal-cost').value = '50';
    } else {
      mesoRow.style.display = 'flex';
      crystalRow.style.display = 'flex';
      document.getElementById('input-crystal-cost').value = '25';
    }
    
    // Toggle Choice Cube costs & optimization rows
    const isOpt = activeTab === 'optimizer';
    choiceMesoRow.style.display = isOpt ? 'flex' : 'none';
    optModeRow.style.display = isOpt ? 'flex' : 'none';
    crystalsPerDollarRow.style.display = isOpt ? 'flex' : 'none';
    dollarsPerBillionRow.style.display = isOpt ? 'flex' : 'none';
  }
  
  // Toggle results containers
  if (activeTab === 'optimizer') {
    standardResults.style.display = 'none';
    optResults.style.display = 'block';
    btnCalculate.textContent = "⚡ Run Optimizer";
    resultsTitle.textContent = "2. Optimization Results";
  } else {
    standardResults.style.display = 'block';
    optResults.style.display = 'none';
    btnCalculate.textContent = "🎲 Calculate Odds";
    resultsTitle.textContent = "2. Probability Results";
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

  // Reset Optimizer fields
  const bestStrat = document.getElementById('opt-best-strat');
  if (bestStrat) bestStrat.textContent = 'Calculating...';
  const bestDetails = document.getElementById('opt-best-details');
  if (bestDetails) bestDetails.textContent = 'Configure stats and click Optimize';
  const tbody = document.getElementById('optimizer-paths-tbody');
  if (tbody) tbody.innerHTML = '';
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
  
  if (activeTab === 'potential' || activeTab === 'bonus_potential' || activeTab === 'optimizer') {
    const source = (activeTab === 'potential' || activeTab === 'optimizer') ? globalData.potentials : globalData.bonus_potentials;
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
  if (activeTab === 'potential' || activeTab === 'bonus_potential' || activeTab === 'optimizer') {
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
  
  if (activeTab === 'optimizer') {
    calculateOptimizer(firstPool, secThirdPool, checkedStats, statThresholds);
    return;
  }
  
  // Use raw probabilities directly from the JSON
  const normFirstPool = firstPool;
  const normSecThirdPool = secThirdPool;
  
  if (activeTab === 'flame' && checkedStats.length === 0) {
    successProb = 1.0;
  } else if (lines === 1) {
    // 1 Line (Flames only)
    normFirstPool.forEach(item1 => {
      const isMatch = isTupleMatching([item1], checkedStats, statThresholds, activeTab === 'flame');
      if (isMatch) {
        successProb += item1.prob;
      }
    });
  } else if (lines === 2) {
    // 2 Lines
    normFirstPool.forEach(item1 => {
      normSecThirdPool.forEach(item2 => {
        const isMatch = isTupleMatching([item1, item2], checkedStats, statThresholds, activeTab === 'flame');
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
          const isMatch = isTupleMatching([item1, item2, item3], checkedStats, statThresholds, activeTab === 'flame');
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

// Choice Cube Optimizer Logic
function calculateOptimizer(firstPool, secThirdPool, checkedStats, statThresholds) {
  // Retrieve cost parameters
  const redMesoInput = document.getElementById('input-meso-cost');
  const redMeso = redMesoInput && redMesoInput.value !== "" ? parseFloat(redMesoInput.value) * 1000000 : 0;
  const redCrystal = 25;

  const choiceMesoInput = document.getElementById('input-choice-meso-cost');
  // choiceMeso scaling factor is Billion (1,000,000,000)
  const choiceMeso = choiceMesoInput && choiceMesoInput.value !== "" ? parseFloat(choiceMesoInput.value) * 1000000000 : 0;
  const choiceCrystal = 0; // Choice cubes are Meso-only in MSM

  const optMode = document.getElementById('select-opt-mode').value; // 'meso', 'crystal', or 'combined'
  const crystalsPerDollar = parseFloat(document.getElementById('input-crystals-per-dollar').value) || 30;
  const dollarsPerBillion = parseFloat(document.getElementById('input-dollars-per-billion-mesos').value) || 10;

  // Conversion helper: calculate expected dollar cost from Mesos and Crystals
  const getDollarCost = (mesos, crystals) => {
    const mesoDollars = mesos * (dollarsPerBillion / 1000000000);
    const crystalDollars = crystals / crystalsPerDollar;
    return mesoDollars + crystalDollars;
  };

  // Determine resource usage choices for Red Cubes (Meso OR Crystals, never both)
  let effectiveRedMeso = 0;
  let effectiveRedCrystal = 0;

  if (optMode === 'meso') {
    effectiveRedMeso = redMeso;
    effectiveRedCrystal = 0;
  } else if (optMode === 'crystal') {
    effectiveRedMeso = 0;
    effectiveRedCrystal = redCrystal;
  } else {
    // combined: choose whichever has the lower USD equivalent for Red Cubes
    const redMesoDollarCost = redMeso * (dollarsPerBillion / 1000000000);
    const redCrystalDollarCost = redCrystal / crystalsPerDollar;
    if (redMesoDollarCost <= redCrystalDollarCost) {
      effectiveRedMeso = redMeso;
      effectiveRedCrystal = 0;
    } else {
      effectiveRedMeso = 0;
      effectiveRedCrystal = redCrystal;
    }
  }

  // 1. Path D: Pure Red Cubes
  let successProbRed = 0.0;
  firstPool.forEach(item1 => {
    secThirdPool.forEach(item2 => {
      secThirdPool.forEach(item3 => {
        if (isTupleMatching([item1, item2, item3], checkedStats, statThresholds)) {
          successProbRed += item1.prob * item2.prob * item3.prob;
        }
      });
    });
  });

  const redRollsOnly = successProbRed > 0 ? 1 / successProbRed : Infinity;
  const redMesoTotal = redRollsOnly * effectiveRedMeso;
  const redCrystalTotal = redRollsOnly * effectiveRedCrystal;
  const redCombinedTotal = getDollarCost(redMesoTotal, redCrystalTotal);

  const pathD = {
    name: 'Pure Red Cubes',
    redCubes: redRollsOnly,
    choiceCubes: 0,
    meso: redMesoTotal,
    crystal: redCrystalTotal,
    combined: redCombinedTotal,
    costToMinimize: optMode === 'meso' ? redMesoTotal : (optMode === 'crystal' ? redCrystalTotal : redCombinedTotal)
  };

  // 2. Path A: Lock Line 2 & 3, Choice Reroll Line 1 (First Line Pool)
  let bestPathA = null;
  const validPairsA = [];

  secThirdPool.forEach(item2 => {
    secThirdPool.forEach(item3 => {
      // Find completing probability for Line 1
      let pChoice = 0;
      firstPool.forEach(item1 => {
        if (isTupleMatching([item1, item2, item3], checkedStats, statThresholds)) {
          pChoice += item1.prob;
        }
      });

      if (pChoice > 0) {
        validPairsA.push({
          pPair: item2.prob * item3.prob,
          pChoice: pChoice,
          item2: item2,
          item3: item3
        });
      }
    });
  });

  if (validPairsA.length > 0) {
    const totalPPair = validPairsA.reduce((acc, p) => acc + p.pPair, 0);
    const redCubesNeeded = 1 / totalPPair;
    const choiceCubesNeeded = validPairsA.reduce((acc, p) => acc + (p.pPair / totalPPair) * (1 / p.pChoice), 0);

    const totalMeso = (redCubesNeeded * effectiveRedMeso) + (choiceCubesNeeded * choiceMeso);
    const totalCrystal = (redCubesNeeded * effectiveRedCrystal) + (choiceCubesNeeded * choiceCrystal);
    const totalCombined = getDollarCost(totalMeso, totalCrystal);
    const cost = optMode === 'meso' ? totalMeso : (optMode === 'crystal' ? totalCrystal : totalCombined);

    // Pick the most probable starting pair to show as a cosmetic recommendation
    const bestPair = validPairsA.sort((a, b) => b.pPair - a.pPair)[0];

    bestPathA = {
      name: 'Reroll Line 1 using Choice Cubes',
      item2: bestPair.item2,
      item3: bestPair.item3,
      redCubes: redCubesNeeded,
      choiceCubes: choiceCubesNeeded,
      meso: totalMeso,
      crystal: totalCrystal,
      combined: totalCombined,
      costToMinimize: cost
    };
  }

  // 3. Path B/C: Lock Line 1 & Line 2 (or 3), Choice Reroll Remaining Line 2/3 (Second Line Pool)
  let bestPathBC = null;
  const validPairsBC = [];

  firstPool.forEach(item1 => {
    secThirdPool.forEach(item2 => {
      // Find completing probability for the remaining line (Line 3)
      let pChoice = 0;
      secThirdPool.forEach(item3 => {
        if (isTupleMatching([item1, item2, item3], checkedStats, statThresholds)) {
          pChoice += item3.prob;
        }
      });

      if (pChoice > 0) {
        validPairsBC.push({
          pPair: item1.prob * item2.prob,
          pChoice: pChoice,
          item1: item1,
          item2: item2
        });
      }
    });
  });

  if (validPairsBC.length > 0) {
    const totalPPair = validPairsBC.reduce((acc, p) => acc + p.pPair, 0);
    const redCubesNeeded = 1 / totalPPair;
    const choiceCubesNeeded = validPairsBC.reduce((acc, p) => acc + (p.pPair / totalPPair) * (1 / p.pChoice), 0);

    const totalMeso = (redCubesNeeded * effectiveRedMeso) + (choiceCubesNeeded * choiceMeso);
    const totalCrystal = (redCubesNeeded * effectiveRedCrystal) + (choiceCubesNeeded * choiceCrystal);
    const totalCombined = getDollarCost(totalMeso, totalCrystal);
    const cost = optMode === 'meso' ? totalMeso : (optMode === 'crystal' ? totalCrystal : totalCombined);

    // Pick the most probable starting pair to show as a cosmetic recommendation
    const bestPair = validPairsBC.sort((a, b) => b.pPair - a.pPair)[0];

    bestPathBC = {
      name: 'Reroll remaining line using Choice Cubes',
      item1: bestPair.item1,
      item2: bestPair.item2,
      redCubes: redCubesNeeded,
      choiceCubes: choiceCubesNeeded,
      meso: totalMeso,
      crystal: totalCrystal,
      combined: totalCombined,
      costToMinimize: cost
    };
  }

  // Render comparison table
  const tbody = document.getElementById('optimizer-paths-tbody');
  tbody.innerHTML = '';

  const paths = [pathD];
  if (bestPathA) paths.push(bestPathA);
  if (bestPathBC) paths.push(bestPathBC);

  // Sort paths by cost to minimize (cheapest first)
  paths.sort((a, b) => a.costToMinimize - b.costToMinimize);

  paths.forEach(p => {
    const tr = document.createElement('tr');
    
    let costText = '';
    const breakdown = (p.meso > 0 && p.crystal > 0) ? `${formatMesos(p.meso)} + ${Math.round(p.crystal).toLocaleString()} 💎` :
                      (p.meso > 0 ? formatMesos(p.meso) : `${Math.round(p.crystal).toLocaleString()} 💎`);

    if (optMode === 'combined') {
      costText = `$${p.combined.toFixed(2)} (${breakdown})`;
    } else {
      costText = breakdown;
    }

    tr.innerHTML = `
      <td class="legend-stat-name">${p.name}</td>
      <td>${p.redCubes === Infinity ? '—' : Math.round(p.redCubes).toLocaleString()}</td>
      <td>${p.choiceCubes === Infinity ? '—' : Math.round(p.choiceCubes).toLocaleString()}</td>
      <td style="color: var(--accent-cyan); font-weight: 600;">${costText}</td>
    `;
    tbody.appendChild(tr);
  });

  // Helper to compute minimum required sum on locked lines for Phase 1
  function getLockedConstraintsText(rerollPool, checkedStats, statThresholds, isPathA) {
    const linesText = isPathA ? "Line 2 & 3" : "Line 1 and Line 2 or 3";
    const bullets = [];
    
    checkedStats.forEach(s => {
      let maxC = 0;
      rerollPool.forEach(item => {
        if (item.option === s) {
          const val = parseFloat((item.value || "0").replace('%', ''));
          if (val > maxC) maxC = val;
        }
      });
      
      const target = statThresholds[s] || 0;
      const minLockedSum = target - maxC;
      
      // Determine if percentage or flat
      const isPercent = firstPool.concat(secThirdPool).some(o => o.option === s && o.value.includes("%"));
      const unit = isPercent ? '%' : '';
      
      if (minLockedSum > 0) {
        bullets.push(`at least <strong>${minLockedSum.toFixed(1).replace('.0', '')}${unit}</strong> of <strong>${s}</strong>`);
      } else if (target > 0) {
        bullets.push(`any combination of <strong>${s}</strong> (or complete it later)`);
      }
    });
    
    if (bullets.length === 0) {
      return `any starting stats on the locked lines (${linesText})`;
    }
    return `the locked lines (${linesText}) hit a sum of ${bullets.join(' and ')}`;
  }

  // Best path recommendation card
  const best = paths[0];
  const bestStrat = document.getElementById('opt-best-strat');
  const bestDetails = document.getElementById('opt-best-details');

  if (best.costToMinimize === Infinity) {
    bestStrat.innerHTML = `<span class="error-text">Impossible</span>`;
    bestDetails.textContent = "Your target stats cannot roll on this tier.";
    return;
  }

  bestStrat.textContent = best.name;

  if (best.name === 'Pure Red Cubes') {
    bestDetails.innerHTML = `Using only Red Cubes is the most cost-efficient path. Expect to use <strong>${Math.round(best.redCubes).toLocaleString()}</strong> Red Cubes.`;
  } else if (best.name === 'Reroll Line 1 using Choice Cubes') {
    const constraints = getLockedConstraintsText(firstPool, checkedStats, statThresholds, true);
    bestDetails.innerHTML = `
      <strong>Phase 1:</strong> Roll Red/Black Cubes until <strong>${constraints}</strong>.<br>
      <strong>Phase 2:</strong> Choose <strong>Line 1</strong> to reroll using Choice Cubes while keeping Line 2 & 3.<br>
      Expect: <strong>${Math.round(best.redCubes).toLocaleString()}</strong> Red/Black Cubes + <strong>${Math.round(best.choiceCubes).toLocaleString()}</strong> Choice Cubes.
    `;
  } else {
    // Path B/C
    const constraints = getLockedConstraintsText(secThirdPool, checkedStats, statThresholds, false);
    bestDetails.innerHTML = `
      <strong>Phase 1:</strong> Roll Red/Black Cubes until <strong>${constraints}</strong>.<br>
      <strong>Phase 2:</strong> Choose <strong>the remaining line</strong> to reroll using Choice Cubes while keeping the other two lines.<br>
      Expect: <strong>${Math.round(best.redCubes).toLocaleString()}</strong> Red/Black Cubes + <strong>${Math.round(best.choiceCubes).toLocaleString()}</strong> Choice Cubes.
    `;
  }
}

// RNG Simulator State Variables
let simRollCount = 0;
let simMesoSpent = 0;
let simCrystalsSpent = 0;
let simCurrentItemLines = [];
let simHeldLines = [false, false, false];

// Initialize RNG Simulator View
function initSimulator() {
  const simMode = document.getElementById('select-sim-mode').value;
  const eq = document.getElementById('sim-select-equipment').value || 'Weapon';
  const tier = document.getElementById('sim-select-tier').value || 'Legendary';

  const itemBadge = document.getElementById('item-tier-badge');
  const itemName = document.getElementById('item-name');
  const cardLines = document.getElementById('item-card-lines');
  const cardElement = document.getElementById('virtual-item-card');

  // Sync virtual item card tier border and badge
  cardElement.className = `virtual-item-card ${tier.toLowerCase()}`;
  itemBadge.textContent = tier.toUpperCase();
  itemName.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${eq.replace(/_/g, ' ')}`;

  // Clear lines
  simCurrentItemLines = [];
  cardLines.innerHTML = '';

  const linesToRender = parseInt(document.getElementById('sim-select-lines').value) || (simMode === 'flame' ? 2 : 3);

  for (let i = 0; i < linesToRender; i++) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'sim-item-line';
    lineDiv.innerHTML = `<span>—</span>`;
    cardLines.appendChild(lineDiv);
  }
}

// Roll Simulator Once
function rollSimItem() {
  if (!globalData) return;

  const simMode = document.getElementById('select-sim-mode').value;
  const eq = document.getElementById('sim-select-equipment').value;
  const tier = document.getElementById('sim-select-tier').value;
  const lines = parseInt(document.getElementById('sim-select-lines').value);

  const redMesoInput = document.getElementById('input-meso-cost');
  const redMeso = redMesoInput && redMesoInput.value !== "" ? parseFloat(redMesoInput.value) * 1000000 : 0;
  const choiceMesoInput = document.getElementById('input-choice-meso-cost');
  const choiceMeso = choiceMesoInput && choiceMesoInput.value !== "" ? parseFloat(choiceMesoInput.value) * 100000000 : 0;

  // Retrieve pools
  let firstPool = [];
  let secThirdPool = [];
  if (simMode === 'potential' || simMode === 'bonus_potential') {
    const source = simMode === 'potential' ? globalData.potentials : globalData.bonus_potentials;
    const eqData = source[eq];
    if (eqData && eqData[tier]) {
      firstPool = eqData[tier]["first"] || [];
      secThirdPool = eqData[tier]["second_third"] || [];
    }
  } else {
    // flame
    const eqData = globalData.flames[eq];
    if (eqData && eqData[tier]) {
      firstPool = eqData[tier] || [];
      secThirdPool = eqData[tier] || [];
    }
  }

  if (firstPool.length === 0 && secThirdPool.length === 0) return;

  // Perform rolling
  const cardElement = document.getElementById('virtual-item-card');
  cardElement.classList.add('roll-active');
  setTimeout(() => {
    cardElement.classList.remove('roll-active');
  }, 450);

  let newLines = [];

  if (simMode === 'flame') {
    const selected = [];
    for (let i = 0; i < lines; i++) {
      selected.push(sampleWeighted(firstPool));
    }
    newLines = selected.map(o => ({ option: o.raw_option || o.option, value: o.value }));
  } else {
    // Potential / Bonus Potential
    const sampled1 = sampleWeighted(firstPool);
    newLines.push({ option: sampled1.option || sampled1.raw_option, value: sampled1.value });
    
    const sampled2 = sampleWeighted(secThirdPool);
    newLines.push({ option: sampled2.option || sampled2.raw_option, value: sampled2.value });
    
    if (lines === 3) {
      const sampled3 = sampleWeighted(secThirdPool);
      newLines.push({ option: sampled3.option || sampled3.raw_option, value: sampled3.value });
    }
  }

  simCurrentItemLines = newLines;

  // Render Virtual Item display
  const cardLines = document.getElementById('item-card-lines');
  const lineDivs = cardLines.querySelectorAll('.sim-item-line');
  
  newLines.forEach((ln, idx) => {
    if (lineDivs[idx]) {
      const isPercent = ln.value.toString().includes('%');
      const suffix = isPercent ? '' : '';
      const text = `${ln.option} +${ln.value}${suffix}`;
      
      lineDivs[idx].querySelector('span').textContent = text;
    }
  });

  // Increment session stats
  simRollCount++;
  document.getElementById('sim-stat-rolls').textContent = simRollCount.toLocaleString();
}

// Auto-roll until target is met
function autoRollSimItem() {
  if (!globalData) return;

  const simMode = document.getElementById('select-sim-mode').value;
  const eq = document.getElementById('sim-select-equipment').value;
  const tier = document.getElementById('sim-select-tier').value;

  // Retrieve simulator target checklist configurations
  let checkedStats = [];
  let statThresholds = {};

  if (simMode === 'flame') {
    const selects = document.querySelectorAll('#sim-stats-checklist-container .sim-flame-stat-select');
    const valSelects = document.querySelectorAll('#sim-stats-checklist-container .sim-flame-threshold-select');
    
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
    // Potential
    const inputs = document.querySelectorAll('#sim-stats-checklist-container .sim-potential-threshold-input');
    inputs.forEach(input => {
      const val = input.value;
      if (val !== "" && !isNaN(parseFloat(val))) {
        const statName = input.dataset.stat;
        checkedStats.push(statName);
        statThresholds[statName] = parseFloat(val);
      }
    });
  }

  if (checkedStats.length === 0) {
    alert("Please configure at least one target stat threshold before auto-rolling.");
    return;
  }

  // Confirm alert
  const confirmStart = confirm(`Auto-rolling will perform up to 5,000 rolls until your target thresholds are hit. Continue?`);
  if (!confirmStart) return;

  let rollsExecuted = 0;
  const maxSimLimit = 5000;
  let targetMet = false;

  // Check if initial item already matches
  if (simCurrentItemLines.length > 0) {
    const normalizedLines = simCurrentItemLines.map(ln => ({ option: ln.option, value: ln.value.toString() }));
    if (isTupleMatching(normalizedLines, checkedStats, statThresholds, simMode === 'flame')) {
      alert("Current rolled item already satisfies the target thresholds!");
      return;
    }
  }

  while (rollsExecuted < maxSimLimit && !targetMet) {
    rollSimItem();
    rollsExecuted++;

    // Evaluate targets match
    if (simCurrentItemLines.length > 0) {
      const normalizedLines = simCurrentItemLines.map(ln => ({ option: ln.option, value: ln.value.toString() }));
      if (isTupleMatching(normalizedLines, checkedStats, statThresholds, simMode === 'flame')) {
        targetMet = true;
      }
    }
  }

  if (targetMet) {
    alert(`Success! Hit target combination in ${rollsExecuted} roll(s).`);
  } else {
    alert(`Reached limit of 5,000 auto-rolls without hitting target. Try adjusting thresholds.`);
  }
}

// Reset Simulator Statistics
function resetSimStats() {
  simRollCount = 0;
  simCurrentItemLines = [];

  document.getElementById('sim-stat-rolls').textContent = '0';

  initSimulator();
}

// Sample item from array based on weight properties
function sampleWeighted(pool) {
  if (!pool || pool.length === 0) return null;
  const totalProb = pool.reduce((sum, item) => sum + item.prob, 0);
  const rand = Math.random() * totalProb;
  let running = 0;
  for (let i = 0; i < pool.length; i++) {
    running += pool[i].prob;
    if (rand <= running) {
      return pool[i];
    }
  }
  return pool[pool.length - 1];
}

// Global Tab States for 4 calculator tabs
let tabStates = {};

// Initialize default tab states when globalData is loaded
function initTabStates() {
  if (!globalData) return;
  const getFirstKey = (obj) => Object.keys(obj)[0] || '';
  const getFirstSubKey = (obj, parentKey) => {
    if (obj && obj[parentKey]) return Object.keys(obj[parentKey])[0] || '';
    return '';
  };

  const potEq = getFirstKey(globalData.potentials);
  const potTier = getFirstSubKey(globalData.potentials, potEq);

  const bonusEq = getFirstKey(globalData.bonus_potentials);
  const bonusTier = getFirstSubKey(globalData.bonus_potentials, bonusEq);

  const flameEq = getFirstKey(globalData.flames);
  const flameTier = getFirstSubKey(globalData.flames, flameEq);

  tabStates = {
    potential: { eq: potEq || 'Weapon', tier: potTier || 'Legendary', lines: 3, targets: {} },
    bonus_potential: { eq: bonusEq || 'Weapon', tier: bonusTier || 'Legendary', lines: 3, targets: {} },
    flame: { eq: flameEq || 'Weapon', tier: flameTier || 'Legendary', lines: 2, targets: {} },
    optimizer: { eq: potEq || 'Weapon', tier: potTier || 'Legendary', lines: 3, targets: {} }
  };
}

// Save selections and input target values of active tab
function saveCurrentTabState() {
  if (!tabStates[activeTab]) return;
  const state = tabStates[activeTab];
  state.eq = selectEquipment.value;
  state.tier = selectTier.value;
  state.lines = parseInt(selectLines.value);

  state.targets = {};
  if (activeTab === 'flame') {
    const selects = document.querySelectorAll('.flame-stat-select');
    const valSelects = document.querySelectorAll('.flame-threshold-select');
    selects.forEach((sel, idx) => {
      const val = sel.value;
      if (val) {
        const valSel = valSelects[idx];
        state.targets[idx] = { option: val, value: valSel ? valSel.value : '' };
      }
    });
  } else {
    const inputs = document.querySelectorAll('.potential-threshold-input');
    inputs.forEach(input => {
      const val = input.value;
      if (val !== "") {
        state.targets[input.dataset.stat] = val;
      }
    });
  }
}

// Restore selectors and inputs of active tab
function restoreNewTabState() {
  if (!tabStates[activeTab]) return;
  const state = tabStates[activeTab];

  // 1. Sync selectors in HTML
  selectEquipment.value = state.eq;
  populateTiers();
  selectTier.value = state.tier;
  selectLines.value = state.lines;

  // 2. Re-render stats inputs checklist
  renderStatsChecklist();

  // 3. Restore target values into the checklist
  if (activeTab === 'flame') {
    const selects = document.querySelectorAll('.flame-stat-select');
    const valSelects = document.querySelectorAll('.flame-threshold-select');
    
    // Clear them first
    selects.forEach((sel, idx) => {
      sel.value = '';
      const valSel = valSelects[idx];
      if (valSel) {
        valSel.innerHTML = '<option value="">Min Value</option>';
        valSel.value = '';
        valSel.disabled = true;
      }
    });

    // Load saved targets
    Object.keys(state.targets).forEach(idxKey => {
      const idx = parseInt(idxKey);
      const target = state.targets[idxKey];
      const sel = selects[idx];
      if (sel) {
        sel.value = target.option;
        
        // Populate threshold values list
        let sourceList = [];
        const eqData = globalData.flames[state.eq];
        if (eqData && eqData[state.tier]) {
          sourceList = eqData[state.tier] || [];
        }
        populateFlameThresholdSelect(target.option, valSelects[idx], sourceList, target.value);
      }
    });
  } else {
    const inputs = document.querySelectorAll('.potential-threshold-input');
    inputs.forEach(input => {
      const statName = input.dataset.stat;
      if (state.targets[statName] !== undefined) {
        input.value = state.targets[statName];
      } else {
        input.value = '';
      }
    });
  }

  // 4. Update the legend table
  renderLegendGuide();
}

// Populate Simulator Dropdown Selects
function populateSimEquipmentAndTiers() {
  if (!globalData) return;
  const simMode = document.getElementById('select-sim-mode').value;
  
  let source = null;
  if (simMode === 'potential') source = globalData.potentials;
  else if (simMode === 'bonus_potential') source = globalData.bonus_potentials;
  else if (simMode === 'flame') source = globalData.flames;
  
  if (!source) return;
  
  // Populate Equipments
  const equips = Object.keys(source).sort();
  const simEq = document.getElementById('sim-select-equipment');
  const oldEqVal = simEq.value;
  simEq.innerHTML = '';
  equips.forEach(eq => {
    const opt = document.createElement('option');
    opt.value = eq;
    opt.textContent = eq;
    simEq.appendChild(opt);
  });
  
  if (equips.includes(oldEqVal)) {
    simEq.value = oldEqVal;
  } else if (equips.includes("Weapon")) {
    simEq.value = "Weapon";
  } else if (equips.length > 0) {
    simEq.value = equips[0];
  }
  
  populateSimTiers();
}

function populateSimTiers() {
  if (!globalData) return;
  const simMode = document.getElementById('select-sim-mode').value;
  const eq = document.getElementById('sim-select-equipment').value;
  
  let source = null;
  if (simMode === 'potential') source = globalData.potentials[eq];
  else if (simMode === 'bonus_potential') source = globalData.bonus_potentials[eq];
  else if (simMode === 'flame') source = globalData.flames[eq];
  
  const simTier = document.getElementById('sim-select-tier');
  if (!source) {
    simTier.innerHTML = '';
    return;
  }
  
  const oldTierVal = simTier.value;
  const tiers = Object.keys(source);
  simTier.innerHTML = '';
  const tierOrder = ["Mythic", "Legendary", "Unique", "Epic", "Rare"];
  tierOrder.forEach(t => {
    if (tiers.includes(t)) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      simTier.appendChild(opt);
    }
  });
  
  if (tiers.includes(oldTierVal)) {
    simTier.value = oldTierVal;
  } else if (simTier.options.length > 0) {
    simTier.selectedIndex = 0;
  }
  
  // Populate Lines Selector based on mode
  const simLines = document.getElementById('sim-select-lines');
  const oldLinesVal = simLines.value;
  simLines.innerHTML = '';
  const linesLabel = document.getElementById('sim-lines-label');
  
  if (simMode === 'flame') {
    linesLabel.textContent = "Number of Flame Lines";
    simLines.innerHTML = `
      <option value="1">1 Line</option>
      <option value="2" selected>2 Lines</option>
    `;
    if (oldLinesVal === '1' || oldLinesVal === '2') {
      simLines.value = oldLinesVal;
    }
  } else {
    linesLabel.textContent = "Number of Potential Lines";
    simLines.innerHTML = `
      <option value="2">2 Lines</option>
      <option value="3" selected>3 Lines</option>
    `;
    if (oldLinesVal === '2' || oldLinesVal === '3') {
      simLines.value = oldLinesVal;
    }
  }
  
  // Re-render Simulator targets checklist
  renderSimStatsChecklist();
}

// Render Simulator targets Checklist
function renderSimStatsChecklist() {
  const container = document.getElementById('sim-stats-checklist-container');
  container.innerHTML = '';
  
  if (!globalData) return;
  
  const simMode = document.getElementById('select-sim-mode').value;
  const eq = document.getElementById('sim-select-equipment').value;
  const tier = document.getElementById('sim-select-tier').value;
  const lines = parseInt(document.getElementById('sim-select-lines').value);
  
  let sourceList = [];
  let firstPool = [];
  let secThirdPool = [];
  
  if (simMode === 'potential') {
    const eqData = globalData.potentials[eq];
    if (eqData && eqData[tier]) {
      firstPool = eqData[tier]["first"] || [];
      secThirdPool = eqData[tier]["second_third"] || [];
      sourceList = [...firstPool, ...secThirdPool];
    }
  } else if (simMode === 'bonus_potential') {
    const eqData = globalData.bonus_potentials[eq];
    if (eqData && eqData[tier]) {
      firstPool = eqData[tier]["first"] || [];
      secThirdPool = eqData[tier]["second_third"] || [];
      sourceList = [...firstPool, ...secThirdPool];
    }
  } else if (simMode === 'flame') {
    const eqData = globalData.flames[eq];
    if (eqData && eqData[tier]) {
      sourceList = eqData[tier] || [];
    }
  }
  
  // Blend checklist container (remove background/borders/padding)
  container.style.background = 'transparent';
  container.style.border = 'none';
  container.style.padding = '0';
  container.style.overflowY = 'visible';
  container.style.flex = 'initial';
  container.style.boxShadow = 'none';
  
  if (simMode === 'flame') {
    // Filter raw options to exclude trash stats, and include both discrete and consolidated options
    const rawOpts = Array.from(new Set(sourceList.map(o => o.raw_option)));
    const uniqueOptsSet = new Set();
    rawOpts.forEach(o => {
      const isTarget = o.startsWith("PHY ATK scales with") ||
                       o.startsWith("MAG ATK scales with") ||
                       o.startsWith("Crit DMG scales with") ||
                       o.startsWith("Final DMG Increase") ||
                       o.startsWith("DEF Ignore Rate");
      if (isTarget) {
        uniqueOptsSet.add(o);
        if (o.startsWith("PHY ATK scales with")) uniqueOptsSet.add("PHY ATK scales with X");
        else if (o.startsWith("MAG ATK scales with")) uniqueOptsSet.add("MAG ATK scales with X");
        else if (o.startsWith("Crit DMG scales with")) uniqueOptsSet.add("Crit DMG scales with X");
      }
    });
    const uniqueOpts = Array.from(uniqueOptsSet).sort();
    
    for (let i = 1; i <= lines; i++) {
      const row = document.createElement('div');
      row.className = 'flame-row flame-row-only';
      
      const leftDiv = document.createElement('div');
      leftDiv.className = 'flame-row-left';
      
      const select = document.createElement('select');
      select.className = 'sim-flame-stat-select';
      
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
      valueSelect.className = 'sim-flame-threshold-select';
      valueSelect.disabled = true;
      
      const optAnyVal = document.createElement('option');
      optAnyVal.value = '';
      optAnyVal.textContent = 'Min Value';
      valueSelect.appendChild(optAnyVal);
      
      rightDiv.appendChild(valueSelect);
      row.appendChild(rightDiv);
      
      select.addEventListener('change', () => {
        populateFlameThresholdSelect(select.value, valueSelect, sourceList);
      });
      
      container.appendChild(row);
    }
  } else {
    // Potentials & Bonus Potentials: List only allowed options in the checklist
    const uniqueOpts = Array.from(new Set(sourceList.map(o => o.option)))
      .filter(isAllowedPotential)
      .sort();
    
    if (uniqueOpts.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 1rem; text-align: center;">No stats found for this configuration.</div>';
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
      valInput.className = 'chk-input-val sim-potential-threshold-input';
      valInput.dataset.stat = opt;
      
      rightDiv.appendChild(valInput);
      row.appendChild(rightDiv);
      
      container.appendChild(row);
    });
  }
}

// Helper to fill flame min value dropdown options
function populateFlameThresholdSelect(selectedVal, valueSelect, sourceList, defaultValue) {
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
      
      const statVals = Array.from(new Set(sourceList.filter(o => o.raw_option === selectedVal).map(o => o.value)));
      const getNumeric = (s) => parseFloat((s || "0").replace('%', ''));
      statVals.sort((a, b) => getNumeric(a) - getNumeric(b));
      
      statVals.forEach(v => {
        const optEl = document.createElement('option');
        optEl.value = getNumeric(v);
        optEl.textContent = v;
        valueSelect.appendChild(optEl);
      });
      
      if (defaultValue !== undefined && defaultValue !== '') {
        valueSelect.value = defaultValue;
      }
    }
  } else {
    valueSelect.disabled = true;
    const optPlaceholder = document.createElement('option');
    optPlaceholder.value = '';
    optPlaceholder.textContent = 'Min Value';
    valueSelect.appendChild(optPlaceholder);
  }
}
