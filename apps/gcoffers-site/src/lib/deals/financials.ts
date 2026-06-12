export type DealFinancialInputs = {
  arv?: number | null
  askingPrice?: number | null
  estimatedClosingCosts?: number | null
  estimatedRehab?: number | null
}

export type DealFinancialSummary = {
  potentialProfit: number | null
  potentialROI: number | null
  totalInvestment: number | null
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export type CapRateInputs = {
  askingPrice?: number | null
  estCapRate?: number | null
  marketRent?: number | null
}

// Prefer the editor-provided cap rate. Otherwise estimate a gross yield from
// annualized market rent and asking price. Returns null when inputs are missing.
export const estimateCapRate = (inputs: CapRateInputs): number | null => {
  if (isFiniteNumber(inputs.estCapRate)) {
    return inputs.estCapRate
  }

  if (isFiniteNumber(inputs.marketRent) && isFiniteNumber(inputs.askingPrice) && inputs.askingPrice > 0) {
    return Number((((inputs.marketRent * 12) / inputs.askingPrice) * 100).toFixed(1))
  }

  return null
}

export const calculateDealFinancials = (inputs: DealFinancialInputs): DealFinancialSummary => {
  const { arv, askingPrice, estimatedClosingCosts, estimatedRehab } = inputs

  if (!isFiniteNumber(askingPrice) || !isFiniteNumber(estimatedRehab) || !isFiniteNumber(estimatedClosingCosts)) {
    return {
      potentialProfit: null,
      potentialROI: null,
      totalInvestment: null,
    }
  }

  const totalInvestment = askingPrice + estimatedRehab + estimatedClosingCosts

  if (!isFiniteNumber(arv)) {
    return {
      potentialProfit: null,
      potentialROI: null,
      totalInvestment,
    }
  }

  const potentialProfit = arv - totalInvestment
  const potentialROI = totalInvestment > 0 ? Number(((potentialProfit / totalInvestment) * 100).toFixed(1)) : null

  return {
    potentialProfit,
    potentialROI,
    totalInvestment,
  }
}
