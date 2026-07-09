export const adminCopy = {
  tabs: {
    users: 'משתמשים',
    trainings: 'הכשרות',
    toggles: 'הגדרות תכונות',
    approvals: 'בקשות הרשאה',
    faq: 'עריכת שאלות נפוצות',
    logs: 'יומני מערכת',
    settings: 'הגדרות'
  },
  toggleLabels: {
    requireAdminApprovalForSeniorCommanders: 'אישור מנהל למפקדים בכירים',
    requireSeniorApprovalForTrainingCommanders: 'אישור מפקד בכיר למפקדי הכשרה',
    enableRealAuth: 'התחברות אמיתית (בפיתוח)',
    enableMongoDb: 'חיבור MongoDB (בפיתוח)',
    enableOutlookIntegration: 'חיבור Outlook (בפיתוח)',
    enableAiAnalysis: 'ניתוח AI (בפיתוח)',
    enableSoldierNextWeekView: 'תצוגת שבוע הבא לחיילים'
  },
  futureToggleNote: 'יופעל בגרסה עתידית.',
  noApprovals: 'אין בקשות הרשאה ממתינות. מנגנון האישורים כבוי כרגע (ראו הגדרות תכונות).',
  approvalExampleTitle: 'דוגמה להודעת המתנה עתידית:',
  faqQuestion: 'שאלה',
  faqAnswer: 'תשובה',
  faqOrder: 'סדר',
  addFaq: 'הוסף שאלה',
  notificationsLog: 'יומן התראות',
  messagesLog: 'יומן הודעות',
  appEnv: 'סביבת הרצה',
  supportPhone: 'טלפון תמיכה',
  profileStatus: 'סטטוס',
  roleColumn: 'תפקיד',
  previewLogin: 'PREVIEW — מסך התחברות'
} as const
