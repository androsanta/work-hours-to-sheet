import dotEnv from 'dotenv'
import chalk from 'chalk'

const homePath = process.env['HOME']
if (!homePath) {
  console.log(chalk.red('Cannot find HOME variable!'))
  process.exit(1)
}
const configPath = `${homePath}/.config/work-hours-to-sheet`

const internalConfig = {
  CONFIG_PATH: `${homePath}/.config/work-hours-to-sheet`,
  TOKEN_PATH: `${configPath}/token.json`,
  CREDENTIALS_PATH: `${configPath}/credentials.json`,
}

enum ExpectedEnvFields {
  PERSONAL_SHEET_ID = 'PERSONAL_SHEET_ID',
  PERSONAL_PAGE_NAME = 'PERSONAL_PAGE_NAME',
  WORK_SHEET_ID = 'WORK_SHEET_ID',
  WORK_PAGE_NAME = 'WORK_PAGE_NAME',
  WORK_SHEET_APPEND_RANGE = 'WORK_SHEET_APPEND_RANGE',
  WORK_SHEET_NAME_CELL = 'WORK_SHEET_NAME_CELL',
  WORK_SHEET_COMMESSA_PAGE = 'WORK_SHEET_COMMESSA_PAGE',
  WORK_SHEET_COMMESSA_RANGE = 'WORK_SHEET_COMMESSA_RANGE',
}

dotEnv.config({ path: `${configPath}/user_config` })

const envConfig: { [value in ExpectedEnvFields]: string } = Object.values(
  ExpectedEnvFields,
).reduce((cfg: any, field: string) => {
  if (!process.env[field]) {
    console.error(chalk.bold.red(field), chalk.red('env variable not set!'))
    process.exit(1)
  }
  cfg[field] = process.env[field] as string
  return cfg
}, {})

export const config = {
  ...internalConfig,
  ...envConfig,
}
