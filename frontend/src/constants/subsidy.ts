// Mirrors backend SubsidyStatus / SUBSIDY_STEPS (app/models/finance.py); each step may only advance to the next
export const SUBSIDY_STEPS: { key: string; label: string }[] = [
  { key: 'NOT_APPLIED', label: 'Not applied' },
  { key: 'ELIGIBILITY_CHECKED', label: 'Eligibility checked' },
  { key: 'REGISTERED', label: 'Registered' },
  { key: 'FEASIBILITY_APPROVED', label: 'Feasibility approval' },
  { key: 'INSTALLATION_DONE', label: 'Installation done' },
  { key: 'INSPECTION_COMMISSIONING', label: 'Inspection & commissioning' },
  { key: 'CLAIM_SUBMITTED', label: 'Claim submitted' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'DISBURSED', label: 'Disbursed' },
];

export const subsidyStepIndex = (status: string) => SUBSIDY_STEPS.findIndex((s) => s.key === status);
export const nextSubsidyStep = (status: string) => SUBSIDY_STEPS[subsidyStepIndex(status) + 1];
