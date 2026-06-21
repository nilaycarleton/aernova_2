export const defaultPricingTemplate = {
  shingleBundleCost: 42,
  underlaymentRollCost: 95,
  ridgeCapBundleCost: 65,
  starterBundleCost: 52,
  dripEdgeCostPerFt: 3.5,
  valleyLinerCostPerFt: 4.25,
  laborRateSimple: 3.2,
  laborRateNormal: 3.85,
  laborRateComplex: 4.5,
  disposalFee: 650,
  markupPercent: 12,
  taxRatePercent: 13,
};

export type PricingTemplate = typeof defaultPricingTemplate;
