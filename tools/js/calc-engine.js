/**
 * calc-engine.js
 * Pure JavaScript calculation module for Gold Coast Home Buyers Offer Calculator
 * 
 * ZERO DOM INTERACTION - exports functions only
 * All currency internally in cents, exposed as dollars
 * 
 * @module calc-engine
 */

// ============================================================================
// 1. COMP ANALYSIS
// ============================================================================

/**
 * Calculate comparable sales summary
 * @param {Array} comps - Array of comparable sales
 * @param {number} comps[].salePrice - Sale price in dollars
 * @param {number} comps[].sqft - Square footage
 * @param {string} comps[].condition - 'as-is' or 'flipped'
 * @param {string} [comps[].address] - Property address
 * @param {string} [comps[].saleDate] - Sale date
 * @param {number} subjectSqft - Subject property square footage
 * @returns {Object} Summary with avg price per sqft and estimated values
 */
export function calcCompSummary(comps, subjectSqft) {
  if (!Array.isArray(comps) || comps.length === 0) {
    return {
      avgAsIsSqft: 0,
      avgFlippedSqft: 0,
      estimatedAsIsValue: 0,
      estimatedARV: 0,
      asIsCount: 0,
      flippedCount: 0
    };
  }

  if (!subjectSqft || subjectSqft <= 0) {
    throw new Error('subjectSqft must be greater than 0');
  }

  const asIsComps = comps.filter(c => 
    c.condition === 'as-is' && c.salePrice > 0 && c.sqft > 0
  );
  const flippedComps = comps.filter(c => 
    c.condition === 'flipped' && c.salePrice > 0 && c.sqft > 0
  );

  const avgAsIsSqft = asIsComps.length > 0
    ? asIsComps.reduce((sum, c) => sum + (c.salePrice / c.sqft), 0) / asIsComps.length
    : 0;

  const avgFlippedSqft = flippedComps.length > 0
    ? flippedComps.reduce((sum, c) => sum + (c.salePrice / c.sqft), 0) / flippedComps.length
    : 0;

  return {
    avgAsIsSqft: Math.round(avgAsIsSqft * 100) / 100,
    avgFlippedSqft: Math.round(avgFlippedSqft * 100) / 100,
    estimatedAsIsValue: Math.round(avgAsIsSqft * subjectSqft),
    estimatedARV: Math.round(avgFlippedSqft * subjectSqft),
    asIsCount: asIsComps.length,
    flippedCount: flippedComps.length
  };
}

// ============================================================================
// 2. REHAB ESTIMATION
// ============================================================================

const REHAB_SCOPES = {
  none: 0,
  light: 30,
  medium: 60,
  heavy: 90
};

/**
 * Calculate rehab estimate
 * @param {number} sqft - Property square footage
 * @param {string} scope - 'none', 'light', 'medium', 'heavy', or 'custom'
 * @param {number} [customPerSqft] - Custom $/sqft (required if scope is 'custom')
 * @param {number} [contingencyPct=3] - Contingency percentage (default 3%)
 * @returns {Object} Rehab breakdown
 */
export function calcRehab(sqft, scope, customPerSqft = null, contingencyPct = 3) {
  if (!sqft || sqft <= 0) {
    throw new Error('sqft must be greater than 0');
  }

  let perSqft;
  
  // Handle numeric string values from dropdown
  if (scope === '0' || scope === 'none') {
    perSqft = 0;
  } else if (scope === 'custom') {
    if (customPerSqft === null || customPerSqft === undefined) {
      throw new Error('customPerSqft required when scope is "custom"');
    }
    perSqft = customPerSqft;
  } else if (REHAB_SCOPES[scope] !== undefined) {
    perSqft = REHAB_SCOPES[scope];
  } else {
    throw new Error(`Invalid scope: ${scope}. Must be 'none', 'light', 'medium', 'heavy', or 'custom'`);
  }

  const baseRehab = Math.round(sqft * perSqft);
  const contingencyAmount = Math.round(baseRehab * (contingencyPct / 100));
  const totalRehab = baseRehab + contingencyAmount;

  return {
    baseRehab,
    contingencyAmount,
    totalRehab,
    perSqft: Math.round(perSqft * 100) / 100
  };
}

// ============================================================================
// 3. CLOSING COSTS
// ============================================================================

/**
 * Calculate seller closing costs
 * @param {Array} items - Cost line items
 * @param {string} items[].category - Cost category name
 * @param {string} items[].type - '%' or '$'
 * @param {number} items[].value - Percentage (0-100) or dollar amount
 * @param {boolean} [items[].enabled=true] - Whether item is included
 * @param {number} anchor - Anchor value (Zestimate or sale price) for percentage calculations
 * @returns {Object} Breakdown with items and total
 */
export function calcSellerClosingCosts(items, anchor) {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }
  if (!anchor || anchor <= 0) {
    throw new Error('anchor must be greater than 0');
  }

  const processedItems = items
    .filter(item => item.enabled !== false)
    .map(item => {
      let amount;
      if (item.type === '%') {
        amount = Math.round(anchor * (item.value / 100));
      } else if (item.type === '$') {
        amount = Math.round(item.value);
      } else {
        throw new Error(`Invalid type for ${item.category}: ${item.type}. Must be '%' or '$'`);
      }

      return {
        category: item.category,
        amount
      };
    });

  const total = processedItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    items: processedItems,
    total
  };
}

/**
 * Calculate buyer closing costs
 * @param {Array} items - Cost line items (same structure as seller costs)
 * @param {number} purchasePrice - Purchase price for percentage calculations
 * @returns {Object} Breakdown with items and total
 */
export function calcBuyerClosingCosts(items, purchasePrice) {
  // Reuse seller closing cost logic with different anchor
  return calcSellerClosingCosts(items, purchasePrice);
}

// ============================================================================
// 4. HOLDING COSTS
// ============================================================================

/**
 * Calculate holding costs based on taxes, insurance, and days on market
 * @param {number} annualTax - Annual property tax in dollars
 * @param {number} monthlyInsurance - Monthly insurance premium in dollars
 * @param {number} avgDOM - Average days on market
 * @returns {Object} Monthly holding cost and total for DOM period
 */
export function calcHoldingCosts(annualTax, monthlyInsurance, avgDOM) {
  if (annualTax < 0) throw new Error('annualTax cannot be negative');
  if (monthlyInsurance < 0) throw new Error('monthlyInsurance cannot be negative');
  if (avgDOM < 0) throw new Error('avgDOM cannot be negative');

  const monthlyTax = annualTax / 12;
  const monthlyHolding = monthlyTax + monthlyInsurance;
  const months = avgDOM / 30;
  const totalHolding = Math.round(monthlyHolding * months);

  return {
    monthlyTax: Math.round(monthlyTax * 100) / 100,
    monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
    monthlyHolding: Math.round(monthlyHolding * 100) / 100,
    totalHolding
  };
}

// ============================================================================
// 5. OFFER RANGE CALCULATION
// ============================================================================

/**
 * Calculate offer range (opening and max offer)
 * @param {number} zestimate - Zillow Zestimate
 * @param {number} sellerClosingTotal - Total seller closing costs
 * @param {number} assignmentFee - Wholesaler assignment fee
 * @param {number} arv - After repair value
 * @param {number} totalRehab - Total rehab estimate
 * @param {number} buyerClosingTotal - Total buyer closing costs
 * @param {number} minProfitMarginPct - Minimum investor profit margin percentage
 * @returns {Object} Opening offer, max offer, and spread
 */
export function calcOfferRange(
  zestimate,
  sellerClosingTotal,
  assignmentFee,
  arv,
  totalRehab,
  buyerClosingTotal,
  minProfitMarginPct
) {
  if (zestimate <= 0) throw new Error('zestimate must be greater than 0');
  if (sellerClosingTotal < 0) throw new Error('sellerClosingTotal cannot be negative');
  if (assignmentFee < 0) throw new Error('assignmentFee cannot be negative');
  if (arv <= 0) throw new Error('arv must be greater than 0');
  if (totalRehab < 0) throw new Error('totalRehab cannot be negative');
  if (buyerClosingTotal < 0) throw new Error('buyerClosingTotal cannot be negative');
  if (minProfitMarginPct < 0 || minProfitMarginPct > 100) {
    throw new Error('minProfitMarginPct must be between 0 and 100');
  }

  // Opening Offer = Zestimate - Seller Closing Costs - Assignment Fee
  const openingOffer = Math.round(zestimate - sellerClosingTotal - assignmentFee);

  // Max Offer = ARV - Total Rehab - Buyer Closing Costs - (ARV × Min Profit Margin %)
  const minProfit = arv * (minProfitMarginPct / 100);
  const maxOffer = Math.round(arv - totalRehab - buyerClosingTotal - minProfit);

  const spread = maxOffer - openingOffer;

  return {
    openingOffer: Math.max(0, openingOffer),
    maxOffer: Math.max(0, maxOffer),
    spread
  };
}

// ============================================================================
// 6. SELLER NET COMPARISON
// ============================================================================

/**
 * Calculate seller net proceeds: traditional sale vs our offer
 * @param {number} zestimate - Zillow Zestimate
 * @param {number} listToSaleRatio - List-to-sale ratio (e.g., 0.97 for 97%)
 * @param {number} sellerClosingTotal - Total seller closing costs
 * @param {number} ourOfferPrice - Our offer price
 * @returns {Object} Traditional net, our net, delta, and delta percentage
 */
export function calcSellerNetComparison(
  zestimate,
  listToSaleRatio,
  sellerClosingTotal,
  ourOfferPrice
) {
  if (zestimate <= 0) throw new Error('zestimate must be greater than 0');
  if (listToSaleRatio <= 0 || listToSaleRatio > 1) {
    throw new Error('listToSaleRatio must be between 0 and 1');
  }
  if (sellerClosingTotal < 0) throw new Error('sellerClosingTotal cannot be negative');
  if (ourOfferPrice < 0) throw new Error('ourOfferPrice cannot be negative');

  // Traditional = Zestimate × List-to-Sale Ratio - Seller Closing Costs
  const traditionalNet = Math.round(zestimate * listToSaleRatio - sellerClosingTotal);

  // Our Offer = Our Offer Price (no costs to seller)
  const ourOfferNet = Math.round(ourOfferPrice);

  const delta = ourOfferNet - traditionalNet;
  const deltaPercent = traditionalNet > 0
    ? Math.round((delta / traditionalNet) * 10000) / 100  // 2 decimal places
    : 0;

  return {
    traditionalNet: Math.max(0, traditionalNet),
    ourOfferNet,
    delta,
    deltaPercent
  };
}

// ============================================================================
// 7. ALL-IN BASIS
// ============================================================================

/**
 * Calculate wholesaler's all-in basis
 * @param {number} contractPrice - Contract purchase price
 * @param {number} buyerClosingTotal - Total buyer closing costs
 * @param {number} assignmentFee - Assignment fee
 * @returns {number} Total all-in basis
 */
export function calcAllInBasis(contractPrice, buyerClosingTotal, assignmentFee) {
  if (contractPrice < 0) throw new Error('contractPrice cannot be negative');
  if (buyerClosingTotal < 0) throw new Error('buyerClosingTotal cannot be negative');
  if (assignmentFee < 0) throw new Error('assignmentFee cannot be negative');

  return Math.round(contractPrice + buyerClosingTotal + assignmentFee);
}

// ============================================================================
// 8. INVESTOR PROFIT & ROI
// ============================================================================

/**
 * Calculate investor profit and ROI
 * @param {number} arv - After repair value
 * @param {number} contractPrice - Contract purchase price
 * @param {number} totalRehab - Total rehab costs
 * @param {number} buyerClosingTotal - Total buyer closing costs (buy + sell)
 * @returns {Object} Profit and ROI percentage
 */
export function calcInvestorProfit(arv, contractPrice, totalRehab, buyerClosingTotal) {
  if (arv <= 0) throw new Error('arv must be greater than 0');
  if (contractPrice < 0) throw new Error('contractPrice cannot be negative');
  if (totalRehab < 0) throw new Error('totalRehab cannot be negative');
  if (buyerClosingTotal < 0) throw new Error('buyerClosingTotal cannot be negative');

  const totalInvestment = contractPrice + totalRehab + buyerClosingTotal;
  const profit = Math.round(arv - totalInvestment);
  const roiPercent = totalInvestment > 0
    ? Math.round((profit / totalInvestment) * 10000) / 100  // 2 decimal places
    : 0;

  return {
    profit,
    roiPercent,
    totalInvestment
  };
}

// ============================================================================
// 9. DEFAULT COST ITEMS
// ============================================================================

/**
 * Get default seller closing cost line items (Broward County, FL)
 * @returns {Array} Default seller cost items
 */
export function getDefaultSellerCosts() {
  return [
    { category: 'Agent Commissions', type: '%', value: 6, enabled: true },
    { category: 'Transfer Taxes (Doc Stamps)', type: '%', value: 0.70, enabled: true },
    { category: 'Title & Escrow Fees', type: '%', value: 1.5, enabled: true },
    { category: 'Attorney Fees', type: '$', value: 500, enabled: true },
    { category: 'Make-Ready Costs', type: '%', value: 2, enabled: true }
  ];
}

/**
 * Get default buyer closing cost line items (Broward County, FL - Cash Buyer)
 * @returns {Array} Default buyer cost items
 */
export function getDefaultBuyerCosts() {
  return [
    { category: 'Transfer Taxes', type: '%', value: 0.70, enabled: true },
    { category: 'Title & Escrow Fees', type: '%', value: 1.5, enabled: true },
    { category: 'Inspection & Due Diligence', type: '$', value: 1500, enabled: true }
  ];
}

// ============================================================================
// INLINE TESTS (Node.js only)
// ============================================================================

if (typeof window === 'undefined') {
  console.log('\n🧪 Running calc-engine.js tests...\n');

  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`✅ ${description}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${description}`);
      console.log(`   ${err.message}`);
      failed++;
    }
  }

  function assertEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}\n   Expected: ${JSON.stringify(expected)}\n   Actual: ${JSON.stringify(actual)}`);
    }
  }

  function assertThrows(fn, message = '') {
    try {
      fn();
      throw new Error(`${message} - Expected function to throw but it didn't`);
    } catch (err) {
      if (err.message.includes('Expected function to throw')) {
        throw err;
      }
      // Expected throw
    }
  }

  // ========================================
  // Comp Summary Tests
  // ========================================
  
  test('calcCompSummary: basic calculation with mixed comps', () => {
    const comps = [
      { salePrice: 200000, sqft: 1000, condition: 'as-is' },
      { salePrice: 210000, sqft: 1050, condition: 'as-is' },
      { salePrice: 300000, sqft: 1000, condition: 'flipped' },
      { salePrice: 330000, sqft: 1100, condition: 'flipped' }
    ];
    const result = calcCompSummary(comps, 1200);
    
    // Avg as-is: (200 + 200) / 2 = 200/sqft
    // Avg flipped: (300 + 300) / 2 = 300/sqft
    assertEqual(result.avgAsIsSqft, 200);
    assertEqual(result.avgFlippedSqft, 300);
    assertEqual(result.estimatedAsIsValue, 240000);
    assertEqual(result.estimatedARV, 360000);
    assertEqual(result.asIsCount, 2);
    assertEqual(result.flippedCount, 2);
  });

  test('calcCompSummary: empty comps array', () => {
    const result = calcCompSummary([], 1200);
    assertEqual(result.avgAsIsSqft, 0);
    assertEqual(result.estimatedARV, 0);
  });

  test('calcCompSummary: no flipped comps', () => {
    const comps = [
      { salePrice: 200000, sqft: 1000, condition: 'as-is' }
    ];
    const result = calcCompSummary(comps, 1200);
    assertEqual(result.avgAsIsSqft, 200);
    assertEqual(result.avgFlippedSqft, 0);
    assertEqual(result.estimatedARV, 0);
  });

  test('calcCompSummary: throws on zero sqft', () => {
    assertThrows(() => calcCompSummary([{ salePrice: 200000, sqft: 1000, condition: 'as-is' }], 0));
  });

  // ========================================
  // Rehab Tests
  // ========================================

  test('calcRehab: light scope', () => {
    const result = calcRehab(1500, 'light');
    assertEqual(result.perSqft, 30);
    assertEqual(result.baseRehab, 45000);
    assertEqual(result.contingencyAmount, 1350);  // 3%
    assertEqual(result.totalRehab, 46350);
  });

  test('calcRehab: medium scope with custom contingency', () => {
    const result = calcRehab(2000, 'medium', null, 5);
    assertEqual(result.perSqft, 60);
    assertEqual(result.baseRehab, 120000);
    assertEqual(result.contingencyAmount, 6000);  // 5%
    assertEqual(result.totalRehab, 126000);
  });

  test('calcRehab: custom scope', () => {
    const result = calcRehab(1200, 'custom', 75, 3);
    assertEqual(result.perSqft, 75);
    assertEqual(result.baseRehab, 90000);
    assertEqual(result.totalRehab, 92700);
  });

  test('calcRehab: throws on custom without perSqft', () => {
    assertThrows(() => calcRehab(1200, 'custom'));
  });

  test('calcRehab: throws on invalid scope', () => {
    assertThrows(() => calcRehab(1200, 'extreme'));
  });

  // ========================================
  // Closing Costs Tests
  // ========================================

  test('calcSellerClosingCosts: mixed types', () => {
    const items = [
      { category: 'Commission', type: '%', value: 6 },
      { category: 'Doc Stamps', type: '%', value: 0.70 },
      { category: 'Attorney', type: '$', value: 500 }
    ];
    const result = calcSellerClosingCosts(items, 300000);
    
    assertEqual(result.items.length, 3);
    assertEqual(result.items[0].amount, 18000);  // 6%
    assertEqual(result.items[1].amount, 2100);   // 0.7%
    assertEqual(result.items[2].amount, 500);
    assertEqual(result.total, 20600);
  });

  test('calcSellerClosingCosts: disabled items excluded', () => {
    const items = [
      { category: 'Commission', type: '%', value: 6, enabled: true },
      { category: 'Repairs', type: '$', value: 5000, enabled: false }
    ];
    const result = calcSellerClosingCosts(items, 300000);
    
    assertEqual(result.items.length, 1);
    assertEqual(result.total, 18000);
  });

  test('calcBuyerClosingCosts: same logic as seller', () => {
    const items = [
      { category: 'Title', type: '%', value: 1.5 },
      { category: 'Inspection', type: '$', value: 1500 }
    ];
    const result = calcBuyerClosingCosts(items, 200000);
    
    assertEqual(result.total, 4500);  // 3000 + 1500
  });

  // ========================================
  // Holding Costs Tests
  // ========================================

  test('calcHoldingCosts: standard calculation', () => {
    const result = calcHoldingCosts(4800, 400, 60);  // $4800/yr tax, $400/mo ins, 60 days
    
    assertEqual(result.monthlyTax, 400);
    assertEqual(result.monthlyInsurance, 400);
    assertEqual(result.monthlyHolding, 800);
    assertEqual(result.totalHolding, 1600);  // 2 months
  });

  test('calcHoldingCosts: zero values', () => {
    const result = calcHoldingCosts(0, 0, 0);
    assertEqual(result.totalHolding, 0);
  });

  // ========================================
  // Offer Range Tests
  // ========================================

  test('calcOfferRange: realistic scenario', () => {
    const result = calcOfferRange(
      300000,  // zestimate
      20000,   // seller closing
      10000,   // assignment fee
      350000,  // ARV
      50000,   // rehab
      5000,    // buyer closing
      20       // 20% min profit
    );
    
    // Opening = 300000 - 20000 - 10000 = 270000
    assertEqual(result.openingOffer, 270000);
    
    // Max = 350000 - 50000 - 5000 - (350000 * 0.20) = 350000 - 50000 - 5000 - 70000 = 225000
    assertEqual(result.maxOffer, 225000);
    
    assertEqual(result.spread, -45000);  // Inverted range - realistic with high seller costs
  });

  test('calcOfferRange: positive spread', () => {
    const result = calcOfferRange(
      250000,  // zestimate
      15000,   // seller closing
      5000,    // assignment fee
      400000,  // ARV
      60000,   // rehab
      6000,    // buyer closing
      20       // 20% min profit
    );
    
    // Opening = 250000 - 15000 - 5000 = 230000
    assertEqual(result.openingOffer, 230000);
    
    // Max = 400000 - 60000 - 6000 - 80000 = 254000
    assertEqual(result.maxOffer, 254000);
    
    assertEqual(result.spread, 24000);  // Positive spread
  });

  // ========================================
  // Seller Net Comparison Tests
  // ========================================

  test('calcSellerNetComparison: traditional vs our offer', () => {
    const result = calcSellerNetComparison(
      300000,  // zestimate
      0.97,    // 97% list-to-sale
      25000,   // seller closing costs
      250000   // our offer
    );
    
    // Traditional = 300000 * 0.97 - 25000 = 291000 - 25000 = 266000
    assertEqual(result.traditionalNet, 266000);
    assertEqual(result.ourOfferNet, 250000);
    assertEqual(result.delta, -16000);
    assertEqual(result.deltaPercent, -6.02);  // (250000 - 266000) / 266000
  });

  test('calcSellerNetComparison: our offer better', () => {
    const result = calcSellerNetComparison(
      300000,
      0.97,
      25000,
      280000
    );
    
    assertEqual(result.traditionalNet, 266000);
    assertEqual(result.ourOfferNet, 280000);
    assertEqual(result.delta, 14000);
    assertEqual(result.deltaPercent, 5.26);
  });

  // ========================================
  // All-In Basis Tests
  // ========================================

  test('calcAllInBasis: standard calculation', () => {
    const result = calcAllInBasis(200000, 5000, 10000);
    assertEqual(result, 215000);
  });

  test('calcAllInBasis: zero values', () => {
    const result = calcAllInBasis(0, 0, 0);
    assertEqual(result, 0);
  });

  // ========================================
  // Investor Profit Tests
  // ========================================

  test('calcInvestorProfit: profitable deal', () => {
    const result = calcInvestorProfit(
      400000,  // ARV
      220000,  // contract price
      60000,   // rehab
      10000    // closing costs
    );
    
    // Total investment = 220000 + 60000 + 10000 = 290000
    assertEqual(result.totalInvestment, 290000);
    assertEqual(result.profit, 110000);  // 400000 - 290000
    assertEqual(result.roiPercent, 37.93);  // 110000 / 290000
  });

  test('calcInvestorProfit: break-even', () => {
    const result = calcInvestorProfit(300000, 200000, 80000, 20000);
    assertEqual(result.profit, 0);
    assertEqual(result.roiPercent, 0);
  });

  test('calcInvestorProfit: losing deal', () => {
    const result = calcInvestorProfit(250000, 200000, 80000, 20000);
    assertEqual(result.profit, -50000);
    assertEqual(result.roiPercent, -16.67);
  });

  // ========================================
  // Default Costs Tests
  // ========================================

  test('getDefaultSellerCosts: returns Broward defaults', () => {
    const defaults = getDefaultSellerCosts();
    assertEqual(defaults.length, 5);
    assertEqual(defaults[0].category, 'Agent Commissions');
    assertEqual(defaults[0].value, 6);
    assertEqual(defaults[1].value, 0.70);  // Doc stamps
  });

  test('getDefaultBuyerCosts: returns cash buyer defaults', () => {
    const defaults = getDefaultBuyerCosts();
    assertEqual(defaults.length, 3);
    assertEqual(defaults[2].category, 'Inspection & Due Diligence');
    assertEqual(defaults[2].value, 1500);
  });

  // ========================================
  // Edge Cases
  // ========================================

  test('Edge case: comps with zero sqft filtered out', () => {
    const comps = [
      { salePrice: 200000, sqft: 0, condition: 'as-is' },  // Invalid
      { salePrice: 300000, sqft: 1000, condition: 'flipped' }
    ];
    const result = calcCompSummary(comps, 1200);
    assertEqual(result.asIsCount, 0);
    assertEqual(result.flippedCount, 1);
  });

  test('Edge case: negative values throw errors', () => {
    assertThrows(() => calcHoldingCosts(-1000, 400, 60));
    assertThrows(() => calcOfferRange(-1, 20000, 10000, 350000, 50000, 5000, 20));
  });

  test('Edge case: rounding precision', () => {
    const result = calcRehab(1333, 'light', null, 3.33);
    // Base = 1333 * 30 = 39990
    // Contingency = 39990 * 0.0333 = 1331.667 → rounds to 1332
    assertEqual(result.baseRehab, 39990);
    assertEqual(result.contingencyAmount, 1332);
    assertEqual(result.totalRehab, 41322);
  });

  // ========================================
  // Results Summary
  // ========================================

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (failed > 0) {
    process.exit(1);
  }
}
