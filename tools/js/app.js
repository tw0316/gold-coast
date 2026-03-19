/**
 * app.js
 * UI controller for Gold Coast Home Buyers Offer Calculator
 * 
 * Wires together calc-engine.js (calculations) with index.html (DOM)
 * Handles state management, view switching, persistence, and real-time updates
 * 
 * @module app
 */

import {
  calcCompSummary,
  calcRehab,
  calcSellerClosingCosts,
  calcBuyerClosingCosts,
  calcHoldingCosts,
  calcOfferRange,
  calcSellerNetComparison,
  calcAllInBasis,
  calcInvestorProfit,
  getDefaultSellerCosts,
  getDefaultBuyerCosts
} from './calc-engine.js';

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format number as currency ($XXX,XXX)
 */
function formatCurrency(value) {
  if (value === null || value === undefined || value === '' || isNaN(value)) return '';
  if (value === 0) return '$0';
  return '$' + Math.round(value).toLocaleString();
}

/**
 * Parse currency string to number (removes $, commas)
 */
function parseCurrency(str) {
  if (!str) return 0;
  const cleaned = str.toString().replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Format number with commas and " sqft" suffix
 */
function formatSqft(value) {
  if (value === null || value === undefined || value === '' || isNaN(value) || value === 0) return '';
  return Math.round(value).toLocaleString() + ' sqft';
}

/**
 * Parse sqft string to number (removes commas and "sqft")
 */
function parseSqft(str) {
  if (!str) return 0;
  const cleaned = str.toString().replace(/[,sqft\s]/gi, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Format percentage with % suffix
 */
function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value) || value === 0) return '';
  return value.toString() + '%';
}

/**
 * Parse percentage string to number (removes %)
 */
function parsePercent(str) {
  if (!str) return 0;
  const cleaned = str.toString().replace(/%/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Prevent non-numeric input (allows digits, decimal, minus)
 */
function filterNumericInput(e, allowDecimal = false) {
  const char = e.key;
  const currentValue = e.target.value;
  
  // Allow control keys
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(char)) {
    return true;
  }
  
  // Allow Ctrl/Cmd shortcuts
  if (e.ctrlKey || e.metaKey) {
    return true;
  }
  
  // Allow digits
  if (/^\d$/.test(char)) {
    return true;
  }
  
  // Allow decimal point if enabled and not already present
  if (allowDecimal && char === '.' && !currentValue.includes('.')) {
    return true;
  }
  
  // Block everything else
  e.preventDefault();
  return false;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Single source of truth for all calculator data
 */
let state = {
  // Property info
  property: {
    address: '',
    city: '',
    county: 'broward',
    zip: '',
    beds: 3,
    baths: 2,
    sqft: 0,
    lotSize: '',
    yearBuilt: null,
    propertyType: ''
  },
  
  // Seller context
  seller: {
    zestimate: 0,
    originalPurchasePrice: 0,
    originalPurchaseDate: '',
    lastListedPrice: 0,
    lastListedDate: '',
    notes: ''
  },
  
  // Market data (Broward County defaults per PRD)
  market: {
    listToSaleRatio: 97,
    avgDOM: 60
  },
  
  // Comps
  comps: [],
  
  // Rehab
  rehab: {
    scope: 'light',
    customPerSqft: 0,
    contingency: 3
  },
  
  // Deal structure
  deal: {
    assignmentFee: 10000,
    minProfitMargin: 20
  },
  
  // Closing costs (editable tables)
  sellerCosts: [],
  buyerCosts: [],
  
  // Selected offer
  selectedOffer: 0,
  
  // Calculated outputs (cached for performance)
  outputs: {
    compSummary: null,
    rehabBreakdown: null,
    sellerClosingTotal: 0,
    buyerClosingTotal: 0,
    holdingCosts: null,
    offerRange: null,
    sellerNetComparison: null,
    allInBasis: 0
  }
};

// Debounce timer for text inputs
let recalcDebounceTimer = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🏠 Gold Coast Offer Calculator initializing...');
  
  // Load saved state from localStorage or use defaults
  loadState();
  
  // Bind all event listeners
  bindEventListeners();
  
  // Initial render
  renderAll();
  
  console.log('✅ Calculator ready');
});

/**
 * Load state from localStorage or initialize with defaults
 */
function loadState() {
  const saved = localStorage.getItem('gc-calculator-state');
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge saved state with defaults (in case structure changed)
      state = { ...state, ...parsed };
      console.log('📂 Loaded saved state');
    } catch (err) {
      console.error('Failed to parse saved state:', err);
      initializeDefaults();
    }
  } else {
    initializeDefaults();
  }
}

/**
 * Initialize default closing costs
 */
function initializeDefaults() {
  state.sellerCosts = getDefaultSellerCosts();
  state.buyerCosts = getDefaultBuyerCosts();
  console.log('🔧 Initialized default costs');
}

/**
 * Save current state to localStorage
 */
function saveState() {
  try {
    localStorage.setItem('gc-calculator-state', JSON.stringify(state));
    console.log('💾 State saved');
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function bindEventListeners() {
  // View tabs
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', handleViewSwitch);
  });
  
  // Property inputs
  bindInput('input-address', 'property.address');
  bindInput('input-city', 'property.city');
  bindInput('input-county', 'property.county');
  bindInput('input-zip', 'property.zip');
  bindInput('input-beds', 'property.beds', 'number');
  bindInput('input-baths', 'property.baths', 'number');
  bindFormattedInput('input-sqft', 'property.sqft', 'sqft');
  bindFormattedInput('input-lot-size', 'property.lotSize', 'sqft');
  bindInput('input-year-built', 'property.yearBuilt', 'number');
  bindInput('input-property-type', 'property.propertyType');
  
  // Seller inputs
  bindFormattedInput('input-zestimate', 'seller.zestimate', 'currency');
  bindFormattedInput('input-original-purchase-price', 'seller.originalPurchasePrice', 'currency');
  bindInput('input-original-purchase-date', 'seller.originalPurchaseDate');
  bindFormattedInput('input-last-listed-price', 'seller.lastListedPrice', 'currency');
  bindInput('input-last-listed-date', 'seller.lastListedDate');
  bindInput('input-notes', 'seller.notes');
  
  // Market inputs
  bindFormattedInput('input-list-sale-ratio', 'market.listToSaleRatio', 'percent');
  bindFormattedInput('input-avg-dom', 'market.avgDOM', 'number');
  
  // Rehab inputs
  document.getElementById('input-rehab-scope').addEventListener('change', handleRehabScopeChange);
  bindInput('input-custom-sqft', 'rehab.customPerSqft', 'number');
  bindInput('input-contingency', 'rehab.contingency', 'number');
  
  // Deal structure
  bindFormattedInput('input-assignment-fee', 'deal.assignmentFee', 'currency');
  bindInput('input-min-profit-margin', 'deal.minProfitMargin', 'number');
  
  // Comp table
  document.getElementById('btn-add-comp').addEventListener('click', handleAddComp);
  
  // Closing cost tables
  document.getElementById('btn-add-seller-cost').addEventListener('click', () => handleAddCost('seller'));
  document.getElementById('btn-add-buyer-cost').addEventListener('click', () => handleAddCost('buyer'));
  
  // Offer slider and manual input
  const offerSlider = document.getElementById('offer-slider');
  const manualOfferInput = document.getElementById('input-manual-offer');
  
  offerSlider.addEventListener('input', (e) => {
    state.selectedOffer = Number(e.target.value);
    manualOfferInput.value = formatCurrency(state.selectedOffer);
    recalculate();
  });
  
  // Manual offer with formatting
  manualOfferInput.addEventListener('focus', (e) => {
    // Strip formatting on focus
    e.target.value = state.selectedOffer || '';
  });
  
  manualOfferInput.addEventListener('blur', (e) => {
    const value = parseCurrency(e.target.value);
    state.selectedOffer = value;
    e.target.value = value > 0 ? formatCurrency(value) : '';
    offerSlider.value = value;
    recalculate();
  });
  
  manualOfferInput.addEventListener('keydown', (e) => filterNumericInput(e, false));
  
  // Footer actions
  document.getElementById('btn-save').addEventListener('click', handleSave);
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('btn-import-trigger').addEventListener('click', () => {
    document.getElementById('btn-import').click();
  });
  document.getElementById('btn-import').addEventListener('change', handleImport);
  document.getElementById('btn-clear').addEventListener('click', handleClear);
}

/**
 * Bind a formatted input element to a state path
 * @param {string} elementId - DOM element ID
 * @param {string} statePath - Dot-notation path in state object
 * @param {string} format - 'currency', 'sqft', 'percent', 'number'
 */
function bindFormattedInput(elementId, statePath, format) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element not found: ${elementId}`);
    return;
  }
  
  // Set initial value from state
  const value = getStateValue(statePath);
  if (value !== null && value !== undefined && value !== 0 && value !== '') {
    if (format === 'currency') {
      element.value = formatCurrency(value);
    } else if (format === 'sqft') {
      element.value = formatSqft(value);
    } else if (format === 'percent') {
      element.value = formatPercent(value);
    } else {
      element.value = value;
    }
  }
  
  // On focus: strip formatting
  element.addEventListener('focus', (e) => {
    const rawValue = getStateValue(statePath);
    e.target.value = rawValue || '';
  });
  
  // On blur: apply formatting and update state
  element.addEventListener('blur', (e) => {
    let parsedValue;
    
    if (format === 'currency') {
      parsedValue = parseCurrency(e.target.value);
      e.target.value = parsedValue > 0 ? formatCurrency(parsedValue) : '';
    } else if (format === 'sqft') {
      parsedValue = parseSqft(e.target.value);
      e.target.value = parsedValue > 0 ? formatSqft(parsedValue) : '';
    } else if (format === 'percent') {
      parsedValue = parsePercent(e.target.value);
      e.target.value = parsedValue > 0 ? formatPercent(parsedValue) : '';
    } else if (format === 'number') {
      parsedValue = parseFloat(e.target.value) || 0;
      e.target.value = parsedValue > 0 ? parsedValue : '';
    }
    
    setStateValue(statePath, parsedValue);
    scheduleRecalc();
  });
  
  // Prevent non-numeric input
  element.addEventListener('keydown', (e) => filterNumericInput(e, format === 'number' || format === 'percent'));
}

/**
 * Bind an input element to a state path (simple, unformatted)
 * @param {string} elementId - DOM element ID
 * @param {string} statePath - Dot-notation path in state object (e.g., 'property.beds')
 * @param {string} type - 'text', 'number', or 'date'
 */
function bindInput(elementId, statePath, type = 'text') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element not found: ${elementId}`);
    return;
  }
  
  // Set initial value from state
  const value = getStateValue(statePath);
  if (value !== null && value !== undefined && value !== 0) {
    element.value = value;
  }
  
  // Listen for changes
  element.addEventListener('input', (e) => {
    let newValue = e.target.value;
    
    if (type === 'number') {
      newValue = newValue === '' ? 0 : Number(newValue);
    }
    
    setStateValue(statePath, newValue);
    scheduleRecalc();
  });
}

/**
 * Get value from state using dot notation
 */
function getStateValue(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], state);
}

/**
 * Set value in state using dot notation
 */
function setStateValue(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((obj, key) => obj[key], state);
  target[lastKey] = value;
}

/**
 * Schedule recalculation with debouncing for text inputs
 */
function scheduleRecalc() {
  clearTimeout(recalcDebounceTimer);
  recalcDebounceTimer = setTimeout(() => {
    recalculate();
  }, 300);
}

// ============================================================================
// VIEW SWITCHING
// ============================================================================

function handleViewSwitch(e) {
  const targetView = e.target.dataset.view;
  
  // Update tab active states
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === targetView);
  });
  
  // Show/hide view containers
  document.querySelectorAll('.view-container').forEach(container => {
    const isTarget = container.dataset.view === targetView;
    container.style.display = isTarget ? 'block' : 'none';
  });
  
  // If switching to presentation view, update it
  if (targetView === 'presentation') {
    renderPresentationView();
  }
  
  console.log(`📄 Switched to ${targetView} view`);
}

// ============================================================================
// COMP TABLE
// ============================================================================

function handleAddComp() {
  state.comps.push({
    address: '',
    salePrice: 0,
    sqft: 0,
    condition: 'as-is',
    saleDate: ''
  });
  
  renderCompTable();
  recalculate();
}

function handleRemoveComp(index) {
  state.comps.splice(index, 1);
  renderCompTable();
  recalculate();
}

function handleCompInput(index, field, value) {
  if (field === 'salePrice' || field === 'sqft') {
    value = Number(value);
  }
  
  state.comps[index][field] = value;
  recalculate();
}

function renderCompTable() {
  const tbody = document.getElementById('comp-table-body');
  tbody.innerHTML = '';
  
  state.comps.forEach((comp, index) => {
    const row = document.createElement('tr');
    
    const pricePerSqft = comp.sqft > 0 ? (comp.salePrice / comp.sqft).toFixed(2) : '—';
    
    row.innerHTML = `
      <td><input type="text" class="comp-address" value="${comp.address}" placeholder="123 Main St" /></td>
      <td><input type="text" class="comp-price" value="${comp.salePrice > 0 ? formatCurrency(comp.salePrice) : ''}" placeholder="$300,000" /></td>
      <td><input type="text" class="comp-sqft" value="${comp.sqft > 0 ? formatSqft(comp.sqft) : ''}" placeholder="1,500 sqft" /></td>
      <td class="comp-calculated">${comp.salePrice > 0 && comp.sqft > 0 ? formatCurrency(pricePerSqft) : '—'}</td>
      <td>
        <select class="comp-condition">
          <option value="as-is" ${comp.condition === 'as-is' ? 'selected' : ''}>As-Is</option>
          <option value="flipped" ${comp.condition === 'flipped' ? 'selected' : ''}>Flipped</option>
        </select>
      </td>
      <td><input type="text" class="comp-date" value="${comp.saleDate}" placeholder="MM/YYYY" /></td>
      <td><button class="btn-remove" data-index="${index}">×</button></td>
    `;
    
    // Bind inputs with formatting
    const addressInput = row.querySelector('.comp-address');
    const priceInput = row.querySelector('.comp-price');
    const sqftInput = row.querySelector('.comp-sqft');
    const conditionSelect = row.querySelector('.comp-condition');
    const dateInput = row.querySelector('.comp-date');
    const removeBtn = row.querySelector('.btn-remove');
    
    addressInput.addEventListener('input', (e) => {
      handleCompInput(index, 'address', e.target.value);
    });
    
    // Price input with currency formatting
    priceInput.addEventListener('focus', (e) => {
      e.target.value = comp.salePrice || '';
    });
    priceInput.addEventListener('blur', (e) => {
      const value = parseCurrency(e.target.value);
      handleCompInput(index, 'salePrice', value);
      e.target.value = value > 0 ? formatCurrency(value) : '';
      renderCompTable(); // Re-render to update $/sqft
    });
    priceInput.addEventListener('keydown', (e) => filterNumericInput(e, false));
    
    // Sqft input with sqft formatting
    sqftInput.addEventListener('focus', (e) => {
      e.target.value = comp.sqft || '';
    });
    sqftInput.addEventListener('blur', (e) => {
      const value = parseSqft(e.target.value);
      handleCompInput(index, 'sqft', value);
      e.target.value = value > 0 ? formatSqft(value) : '';
      renderCompTable(); // Re-render to update $/sqft
    });
    sqftInput.addEventListener('keydown', (e) => filterNumericInput(e, false));
    
    conditionSelect.addEventListener('change', (e) => {
      handleCompInput(index, 'condition', e.target.value);
    });
    
    dateInput.addEventListener('input', (e) => {
      handleCompInput(index, 'saleDate', e.target.value);
    });
    
    removeBtn.addEventListener('click', () => handleRemoveComp(index));
    
    tbody.appendChild(row);
  });
}

// ============================================================================
// CLOSING COST TABLES
// ============================================================================

function handleAddCost(type) {
  const costs = type === 'seller' ? state.sellerCosts : state.buyerCosts;
  
  costs.push({
    category: 'Custom Item',
    type: '$',
    value: 0,
    enabled: true
  });
  
  renderClosingCostTables();
  recalculate();
}

function handleRemoveCost(type, index) {
  const costs = type === 'seller' ? state.sellerCosts : state.buyerCosts;
  costs.splice(index, 1);
  renderClosingCostTables();
  recalculate();
}

function handleCostInput(type, index, field, value) {
  const costs = type === 'seller' ? state.sellerCosts : state.buyerCosts;
  
  if (field === 'value') {
    value = Number(value);
  } else if (field === 'enabled') {
    value = Boolean(value);
  }
  
  costs[index][field] = value;
  recalculate();
}

function renderClosingCostTables() {
  try {
    renderCostTable('seller', state.sellerCosts, 'seller-costs-table-body');
  } catch (err) {
    console.error('Seller cost table render error:', err.message);
  }
  try {
    renderCostTable('buyer', state.buyerCosts, 'buyer-costs-table-body');
  } catch (err) {
    console.error('Buyer cost table render error:', err.message);
  }
}

function renderCostTable(type, costs, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  
  // For seller costs, anchor on zestimate. For buyer costs, anchor on selected offer.
  // Use fallback of 0 (% items will show $0, flat $ items still display correctly)
  const anchor = type === 'seller' ? (state.seller.zestimate || 0) : (state.selectedOffer || 0);
  
  costs.forEach((cost, index) => {
    const row = document.createElement('tr');
    
    let amount = 0;
    if (cost.enabled !== false) {
      if (cost.type === '%') {
        amount = Math.round(anchor * (cost.value / 100));
      } else {
        amount = Math.round(cost.value);
      }
    }
    
    // Special case: holding costs calculation
    let displayValue = cost.value;
    if (cost.category === 'Holding Costs' && type === 'seller') {
      // Calculate holding costs dynamically
      const annualTax = getAnnualTax();
      const monthlyInsurance = getMonthlyInsurance();
      const avgDOM = state.market.avgDOM;
      
      if (annualTax > 0 && monthlyInsurance > 0 && avgDOM > 0) {
        const holding = calcHoldingCosts(annualTax, monthlyInsurance, avgDOM);
        amount = holding.totalHolding;
        displayValue = `Auto (${avgDOM} days)`;
      }
    }
    
    row.innerHTML = `
      <td><input type="text" value="${cost.category}" /></td>
      <td>
        <button class="type-toggle" data-type="${cost.type}">
          ${cost.type === '%' ? '%' : '$'}
        </button>
      </td>
      <td>
        <input type="${cost.category === 'Holding Costs' && type === 'seller' ? 'text' : 'number'}" value="${displayValue}" step="0.1" 
               ${cost.category === 'Holding Costs' && type === 'seller' ? 'disabled' : ''} />
      </td>
      <td class="cost-amount">${formatCurrency(amount)}</td>
      <td><button class="btn-remove" data-index="${index}">×</button></td>
    `;
    
    // Bind inputs
    row.querySelector('input[type="text"]').addEventListener('input', (e) => {
      handleCostInput(type, index, 'category', e.target.value);
    });
    
    row.querySelector('.type-toggle').addEventListener('click', (e) => {
      const newType = cost.type === '%' ? '$' : '%';
      handleCostInput(type, index, 'type', newType);
      renderClosingCostTables();
    });
    
    // Value input may be type="number" or type="text" (for auto-calculated holding costs)
    const valueInput = row.querySelector('td:nth-child(3) input');
    if (valueInput && !valueInput.disabled) {
      valueInput.addEventListener('input', (e) => {
        handleCostInput(type, index, 'value', e.target.value);
      });
    }
    
    row.querySelector('.btn-remove').addEventListener('click', () => handleRemoveCost(type, index));
    
    tbody.appendChild(row);
  });
}

/**
 * Extract annual tax from seller costs or default
 */
function getAnnualTax() {
  const taxItem = state.sellerCosts.find(c => c.category.toLowerCase().includes('property tax'));
  if (taxItem && taxItem.type === '$') {
    return taxItem.value;
  }
  return 4800; // Default estimate
}

/**
 * Extract monthly insurance from seller costs or default
 */
function getMonthlyInsurance() {
  const insItem = state.sellerCosts.find(c => c.category.toLowerCase().includes('insurance'));
  if (insItem && insItem.type === '$') {
    return insItem.value;
  }
  return 400; // Default from PRD
}

// ============================================================================
// REHAB SCOPE
// ============================================================================

function handleRehabScopeChange(e) {
  const scope = e.target.value;
  state.rehab.scope = scope;
  
  // Show/hide custom input
  const customGroup = document.getElementById('custom-sqft-group');
  customGroup.style.display = scope === 'custom' ? 'block' : 'none';
  
  recalculate();
}

// ============================================================================
// CALCULATION ENGINE
// ============================================================================

function recalculate() {
  try {
    // 1. Comp summary
    if (state.property.sqft > 0 && state.comps.length > 0) {
      state.outputs.compSummary = calcCompSummary(state.comps, state.property.sqft);
    } else {
      state.outputs.compSummary = {
        avgAsIsSqft: 0,
        avgFlippedSqft: 0,
        estimatedAsIsValue: 0,
        estimatedARV: 0,
        asIsCount: 0,
        flippedCount: 0
      };
    }
    
    // 2. Rehab breakdown
    if (state.property.sqft > 0) {
      const scope = state.rehab.scope === 'custom' ? 'custom' : state.rehab.scope;
      const customPerSqft = state.rehab.scope === 'custom' ? state.rehab.customPerSqft : null;
      
      state.outputs.rehabBreakdown = calcRehab(
        state.property.sqft,
        scope,
        customPerSqft,
        state.rehab.contingency
      );
    } else {
      state.outputs.rehabBreakdown = { baseRehab: 0, contingencyAmount: 0, totalRehab: 0 };
    }
    
    // 3. Seller closing costs (including holding costs)
    if (state.seller.zestimate > 0) {
      // Add holding costs dynamically if not already present
      ensureHoldingCostsRow();
      
      const sellerCalc = calcSellerClosingCosts(state.sellerCosts, state.seller.zestimate);
      state.outputs.sellerClosingTotal = sellerCalc.total;
    } else {
      state.outputs.sellerClosingTotal = 0;
    }
    
    // 4. Offer range
    if (state.seller.zestimate > 0 && state.outputs.compSummary.estimatedARV > 0) {
      state.outputs.offerRange = calcOfferRange(
        state.seller.zestimate,
        state.outputs.sellerClosingTotal,
        state.deal.assignmentFee,
        state.outputs.compSummary.estimatedARV,
        state.outputs.rehabBreakdown.totalRehab,
        0, // Buyer closing total calculated separately
        state.deal.minProfitMargin
      );
      
      // Update slider range
      const slider = document.getElementById('offer-slider');
      slider.min = state.outputs.offerRange.openingOffer;
      slider.max = state.outputs.offerRange.maxOffer;
      
      // Set default selected offer to midpoint if not set
      if (state.selectedOffer === 0) {
        state.selectedOffer = Math.round(
          (state.outputs.offerRange.openingOffer + state.outputs.offerRange.maxOffer) / 2
        );
        slider.value = state.selectedOffer;
        document.getElementById('input-manual-offer').value = formatCurrency(state.selectedOffer);
      }
    } else {
      state.outputs.offerRange = { openingOffer: 0, maxOffer: 0, spread: 0 };
      state.selectedOffer = 0;
    }
    
    // 5. Buyer closing costs (based on selected offer)
    // Use selectedOffer as anchor for % items; if no offer yet, still calc flat $ items
    if (state.selectedOffer > 0) {
      const buyerCalc = calcBuyerClosingCosts(state.buyerCosts, state.selectedOffer);
      state.outputs.buyerClosingTotal = buyerCalc.total;
    } else {
      // Calculate flat $ items even without an offer
      const flatTotal = state.buyerCosts
        .filter(c => c.enabled !== false && c.type === '$')
        .reduce((sum, c) => sum + Math.round(c.value), 0);
      state.outputs.buyerClosingTotal = flatTotal;
    }
    
    // 6. Seller net comparison
    if (state.seller.zestimate > 0 && state.selectedOffer > 0 && state.market.listToSaleRatio > 0) {
      state.outputs.sellerNetComparison = calcSellerNetComparison(
        state.seller.zestimate,
        state.market.listToSaleRatio / 100,
        state.outputs.sellerClosingTotal,
        state.selectedOffer
      );
    } else {
      state.outputs.sellerNetComparison = {
        traditionalNet: 0,
        ourOfferNet: 0,
        delta: 0,
        deltaPercent: 0
      };
    }
    
    // 7. All-in basis
    if (state.selectedOffer > 0) {
      state.outputs.allInBasis = calcAllInBasis(
        state.selectedOffer,
        state.outputs.buyerClosingTotal,
        state.deal.assignmentFee
      );
    } else {
      state.outputs.allInBasis = 0;
    }
    
    // Update UI — re-render cost tables so individual row amounts reflect current anchor values
    renderClosingCostTables();
    renderOutputs();
    
  } catch (err) {
    console.error('Calculation error:', err);
  }
}

/**
 * Ensure holding costs row exists in seller costs
 */
function ensureHoldingCostsRow() {
  const hasHoldingCosts = state.sellerCosts.some(c => 
    c.category.toLowerCase().includes('holding')
  );
  
  if (!hasHoldingCosts) {
    state.sellerCosts.push({
      category: 'Holding Costs',
      type: '$',
      value: 0,
      enabled: true
    });
  }
}

// ============================================================================
// RENDERING
// ============================================================================

function renderAll() {
  renderCompTable();
  renderClosingCostTables();
  renderOutputs();
  recalculate();
}

function renderOutputs() {
  // Comp summary
  const cs = state.outputs.compSummary || {};
  setText('output-avg-asis-sqft', cs.avgAsIsSqft > 0 ? `$${cs.avgAsIsSqft.toFixed(2)}` : '—');
  setText('output-avg-flipped-sqft', cs.avgFlippedSqft > 0 ? `$${cs.avgFlippedSqft.toFixed(2)}` : '—');
  setText('output-est-asis-value', formatCurrency(cs.estimatedAsIsValue || 0));
  setText('output-est-arv', formatCurrency(cs.estimatedARV || 0));
  
  // Rehab breakdown
  const rb = state.outputs.rehabBreakdown || {};
  setText('output-base-rehab', formatCurrency(rb.baseRehab || 0));
  setText('output-contingency-amount', formatCurrency(rb.contingencyAmount || 0));
  setText('output-total-rehab', formatCurrency(rb.totalRehab || 0));
  
  // Closing cost totals
  setText('output-seller-total-costs', formatCurrency(state.outputs.sellerClosingTotal));
  setText('output-buyer-total-costs', formatCurrency(state.outputs.buyerClosingTotal));
  
  // Offer range
  const or = state.outputs.offerRange || {};
  setText('output-opening-offer', formatCurrency(or.openingOffer || 0));
  setText('output-max-offer', formatCurrency(or.maxOffer || 0));
  setText('output-offer-spread', formatCurrency(or.spread || 0));
  setText('output-selected-offer', formatCurrency(state.selectedOffer));
  
  // Net comparison
  const nc = state.outputs.sellerNetComparison || {};
  setText('output-traditional-net', formatCurrency(nc.traditionalNet || 0));
  setText('output-our-offer-net', formatCurrency(nc.ourOfferNet || 0));
  
  // All-in basis
  setText('output-all-in-basis', formatCurrency(state.outputs.allInBasis));
}

function renderPresentationView() {
  // Section 1: Your Home's Value
  setText('pres-zestimate', formatCurrency(state.seller.zestimate));
  setText('pres-beds', state.property.beds || '—');
  setText('pres-baths', state.property.baths || '—');
  setText('pres-sqft', state.property.sqft ? state.property.sqft.toLocaleString() : '—');
  
  // Section 2: Waterfall
  setText('pres-waterfall-zestimate', formatCurrency(state.seller.zestimate));
  
  // Extract individual cost categories
  const commissions = state.sellerCosts.find(c => c.category.toLowerCase().includes('commission'));
  const transfer = state.sellerCosts.find(c => c.category.toLowerCase().includes('transfer') || c.category.toLowerCase().includes('doc stamp'));
  const title = state.sellerCosts.find(c => c.category.toLowerCase().includes('title'));
  const makeReady = state.sellerCosts.find(c => c.category.toLowerCase().includes('make-ready'));
  const holding = state.sellerCosts.find(c => c.category.toLowerCase().includes('holding'));
  
  const calcCostAmount = (cost) => {
    if (!cost || cost.enabled === false) return 0;
    if (cost.type === '%') {
      return Math.round(state.seller.zestimate * (cost.value / 100));
    }
    return Math.round(cost.value);
  };
  
  const commissionAmt = calcCostAmount(commissions);
  const transferAmt = calcCostAmount(transfer);
  const titleAmt = calcCostAmount(title);
  const makeReadyAmt = calcCostAmount(makeReady);
  const holdingAmt = calcCostAmount(holding);
  
  setText('pres-deduct-commission', '-' + formatCurrency(commissionAmt));
  setText('pres-deduct-transfer', '-' + formatCurrency(transferAmt));
  setText('pres-deduct-title', '-' + formatCurrency(titleAmt));
  setText('pres-deduct-makeready', '-' + formatCurrency(makeReadyAmt));
  setText('pres-deduct-holding', '-' + formatCurrency(holdingAmt));
  
  // Calculate waterfall net directly from Zestimate minus visible cost items
  // This works even without comps/ARV (independent of offer range engine)
  const waterfallNet = state.seller.zestimate - commissionAmt - transferAmt - titleAmt - makeReadyAmt - holdingAmt;
  setText('pres-traditional-net', formatCurrency(Math.max(0, waterfallNet)));
  
  const nc = state.outputs.sellerNetComparison || {};
  
  // Section 3: Market Reality
  setText('pres-list-sale-ratio', `${state.market.listToSaleRatio}%`);
  setText('pres-avg-dom', `${state.market.avgDOM} days`);
  
  // Traditional net already includes list-to-sale ratio (from calcSellerNetComparison)
  // Do NOT re-apply the ratio here
  const adjustedNet = nc.traditionalNet || 0;
  setText('pres-adjusted-net', formatCurrency(adjustedNet));
  
  // Section 4: Our Offer
  setText('pres-our-offer-value', formatCurrency(state.selectedOffer));
  
  // Section 5: Comparison Table
  setText('comp-traditional-net', formatCurrency(adjustedNet));
  setText('comp-our-net', formatCurrency(state.selectedOffer));
  setText('comp-commissions', '(' + formatCurrency(calcCostAmount(commissions)) + ')');
  
  const closingCostsTotal = calcCostAmount(transfer) + calcCostAmount(title);
  setText('comp-closing-costs', '(' + formatCurrency(closingCostsTotal) + ')');
  setText('comp-repairs', '(' + formatCurrency(calcCostAmount(makeReady)) + ')');
  setText('comp-holding', '(' + formatCurrency(calcCostAmount(holding)) + ')');
  setText('comp-timeline', `~${state.market.avgDOM}-${state.market.avgDOM + 30} days`);
}

// ============================================================================
// PERSISTENCE & ACTIONS
// ============================================================================

function handleSave() {
  saveState();
  alert('💾 Analysis saved!');
}

function handleExport() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `gc-offer-${state.property.address.replace(/\s+/g, '-') || 'analysis'}-${Date.now()}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  console.log('📤 Exported analysis');
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      state = { ...state, ...imported };
      
      // Re-render everything
      renderAll();
      
      // Restore input values with formatting
      document.getElementById('input-address').value = state.property.address || '';
      document.getElementById('input-city').value = state.property.city || '';
      document.getElementById('input-county').value = state.property.county || 'broward';
      document.getElementById('input-zip').value = state.property.zip || '';
      document.getElementById('input-beds').value = state.property.beds || 3;
      document.getElementById('input-baths').value = state.property.baths || 2;
      document.getElementById('input-sqft').value = state.property.sqft > 0 ? formatSqft(state.property.sqft) : '';
      document.getElementById('input-lot-size').value = state.property.lotSize || '';
      document.getElementById('input-year-built').value = state.property.yearBuilt || '';
      document.getElementById('input-property-type').value = state.property.propertyType || '';
      
      document.getElementById('input-zestimate').value = state.seller.zestimate > 0 ? formatCurrency(state.seller.zestimate) : '';
      document.getElementById('input-original-purchase-price').value = state.seller.originalPurchasePrice > 0 ? formatCurrency(state.seller.originalPurchasePrice) : '';
      document.getElementById('input-original-purchase-date').value = state.seller.originalPurchaseDate || '';
      document.getElementById('input-last-listed-price').value = state.seller.lastListedPrice > 0 ? formatCurrency(state.seller.lastListedPrice) : '';
      document.getElementById('input-last-listed-date').value = state.seller.lastListedDate || '';
      document.getElementById('input-notes').value = state.seller.notes || '';
      
      document.getElementById('input-list-sale-ratio').value = state.market.listToSaleRatio > 0 ? formatPercent(state.market.listToSaleRatio) : '';
      document.getElementById('input-avg-dom').value = state.market.avgDOM > 0 ? state.market.avgDOM : '';
      
      document.getElementById('input-rehab-scope').value = state.rehab.scope || 'light';
      document.getElementById('input-custom-sqft').value = state.rehab.customPerSqft || 0;
      document.getElementById('input-contingency').value = state.rehab.contingency || 3;
      
      document.getElementById('input-assignment-fee').value = formatCurrency(state.deal.assignmentFee || 10000);
      document.getElementById('input-min-profit-margin').value = state.deal.minProfitMargin || 20;
      
      document.getElementById('input-manual-offer').value = state.selectedOffer > 0 ? formatCurrency(state.selectedOffer) : '';
      
      alert('📥 Analysis imported successfully!');
      console.log('📥 Imported state');
    } catch (err) {
      alert('❌ Failed to import: Invalid JSON file');
      console.error('Import error:', err);
    }
  };
  
  reader.readAsText(file);
  
  // Reset file input so same file can be imported again
  e.target.value = '';
}

function handleClear() {
  if (!confirm('⚠️ Clear all data? This cannot be undone.')) {
    return;
  }
  
  // Reset to defaults
  state = {
    property: {
      address: '',
      city: '',
      county: 'broward',
      zip: '',
      beds: 3,
      baths: 2,
      sqft: 0,
      lotSize: '',
      yearBuilt: null,
      propertyType: ''
    },
    seller: {
      zestimate: 0,
      originalPurchasePrice: 0,
      originalPurchaseDate: '',
      lastListedPrice: 0,
      lastListedDate: '',
      notes: ''
    },
    market: {
      listToSaleRatio: 97,
      avgDOM: 60
    },
    comps: [],
    rehab: {
      scope: 'light',
      customPerSqft: 0,
      contingency: 3
    },
    deal: {
      assignmentFee: 10000,
      minProfitMargin: 20
    },
    sellerCosts: getDefaultSellerCosts(),
    buyerCosts: getDefaultBuyerCosts(),
    selectedOffer: 0,
    outputs: {
      compSummary: null,
      rehabBreakdown: null,
      sellerClosingTotal: 0,
      buyerClosingTotal: 0,
      holdingCosts: null,
      offerRange: null,
      sellerNetComparison: null,
      allInBasis: 0
    }
  };
  
  localStorage.removeItem('gc-calculator-state');
  
  // Reset all inputs
  document.getElementById('input-address').value = '';
  document.getElementById('input-city').value = '';
  document.getElementById('input-county').value = 'broward';
  document.getElementById('input-zip').value = '';
  document.getElementById('input-beds').value = 3;
  document.getElementById('input-baths').value = 2;
  document.getElementById('input-sqft').value = '';
  document.getElementById('input-lot-size').value = '';
  document.getElementById('input-year-built').value = '';
  document.getElementById('input-property-type').value = '';
  
  document.getElementById('input-zestimate').value = '';
  document.getElementById('input-original-purchase-price').value = '';
  document.getElementById('input-original-purchase-date').value = '';
  document.getElementById('input-last-listed-price').value = '';
  document.getElementById('input-last-listed-date').value = '';
  document.getElementById('input-notes').value = '';
  
  document.getElementById('input-list-sale-ratio').value = formatPercent(97);
  document.getElementById('input-avg-dom').value = 60;
  
  document.getElementById('input-rehab-scope').value = '30';
  document.getElementById('input-custom-sqft').value = 0;
  document.getElementById('input-contingency').value = 3;
  
  document.getElementById('input-assignment-fee').value = formatCurrency(10000);
  document.getElementById('input-min-profit-margin').value = 20;
  
  document.getElementById('input-manual-offer').value = '';
  
  renderAll();
  
  alert('🗑️ All data cleared');
  console.log('🗑️ State reset to defaults');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function setText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}
