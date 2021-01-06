import dotEnv from 'dotenv'
import chalk from 'chalk'

dotEnv.config()

enum ExpectedEnvFields {
  PERSONAL_SHEET_ID = 'PERSONAL_SHEET_ID',
  PERSONAL_PAGE_NAME = 'PERSONAL_PAGE_NAME',
  WORK_SHEET_ID = 'WORK_SHEET_ID',
  WORK_PAGE_NAME = 'WORK_PAGE_NAME',
  WORK_SHEET_APPEND_RANGE = 'WORK_SHEET_APPEND_RANGE',
  WORK_SHEET_NAME_CELL = 'WORK_SHEET_NAME_CELL',
  WORK_SHEET_COMMESSA_CELL = 'WORK_SHEET_COMMESSA_CELL',
}

export const config: { [value in ExpectedEnvFields]: string } = Object.values(
  ExpectedEnvFields,
).reduce((cfg: any, field: string) => {
  if (!process.env[field]) {
    console.error(chalk.bold.red(field), chalk.red('env variable not set!'))
    process.exit(1)
  }
  cfg[field] = process.env[field] as string
  return cfg
}, {})
