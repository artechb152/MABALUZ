import type { FeatureToggles } from '@/types'

export const defaultFeatureToggles: FeatureToggles = {
  requireAdminApprovalForSeniorCommanders: false,
  requireSeniorApprovalForTrainingCommanders: false,
  enableRealAuth: false,
  enableMongoDb: false,
  enableOutlookIntegration: false,
  enableAiAnalysis: false,
  enableSoldierNextWeekView: true
}
