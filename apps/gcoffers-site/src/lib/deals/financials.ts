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
