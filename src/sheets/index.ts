import { config } from '../config'
import { PersonalSheet } from './personal-sheet'
import { WorkSheet } from './work-sheet'

export const personalSheet = new PersonalSheet(
  config.PERSONAL_SHEET_ID,
  config.PERSONAL_PAGE_NAME,
)
export const workSheet = new WorkSheet(
  config.WORK_SHEET_ID,
  config.WORK_PAGE_NAME,
)
