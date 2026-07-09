import { db } from '@/app/dbStore'
import type { ImportedTrainingTemplate } from '@/types'

export async function saveImportedTemplate(
  template: ImportedTrainingTemplate
): Promise<ImportedTrainingTemplate> {
  const others = db.get().importedTemplates.filter((t) => t.trainingId !== template.trainingId)
  db.patch({ importedTemplates: [...others, template] })
  return template
}

export async function getTemplateForTraining(
  trainingId: string
): Promise<ImportedTrainingTemplate | null> {
  return db.get().importedTemplates.find((t) => t.trainingId === trainingId) ?? null
}
