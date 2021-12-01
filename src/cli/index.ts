import { ArgumentParser } from 'argparse'
import chalk from 'chalk'
import { format } from 'date-fns'
import ora from 'ora'
import prompts from 'prompts'
import { PersonalSheet, WorkSheet, formatMinutes } from '../'
import { config } from '../config'

const parser = new ArgumentParser({
  description: 'Set work hours to a google spreadsheet',
})
const subparsers = parser.add_subparsers({ dest: 'subcommand' })
subparsers.add_parser('info')
const startParser = subparsers.add_parser('start')
startParser.add_argument('-t', '--time', {
  help: 'Override starting time, with format HH.MM',
})
const stopParser = subparsers.add_parser('stop')
stopParser.add_argument('-t', '--time', {
  help: 'Override stopping time, with format HH.MM',
})
subparsers.add_parser('end-day')

let spinner: ora.Ora

const cli = async () => {
  const personalSheet = new PersonalSheet(
    config.PERSONAL_SHEET_ID,
    config.PERSONAL_PAGE_NAME,
  )
  const workSheet = new WorkSheet(config.WORK_SHEET_ID, config.WORK_PAGE_NAME)

  const args = parser.parse_args()

  switch (args.subcommand) {
    case 'info':
      spinner = ora('Fetching data').start()
      const report = await personalSheet.getReport()
      spinner.stop()
      console.log(chalk.italic.grey(format(report.date, 'EEEE, d LLLL yyyy')))
      console.log(
        chalk.bold.green(formatMinutes(report.dailyMinutes)),
        chalk.green('worked so far'),
        chalk.grey(
          `(${report.lastRow?.[1]} -> ${report.lastRow?.[2] || 'now'})`,
        ),
      )
      break
    case 'start':
      spinner = ora('Setting start time').start()
      await personalSheet.setStartTime(args.time)
      spinner.succeed(chalk.italic.green('Start time set'))
      break
    case 'stop':
      spinner = ora('Setting stop time').start()
      await personalSheet.setStopTime(args.time)
      spinner.succeed(chalk.italic.green('Stop time set'))
      spinner.start('Getting report')
      const { dailyMinutes: minutes } = await personalSheet.getReport()
      console.log(
        chalk.bold.green(formatMinutes(minutes)),
        chalk.green('worked so far'),
      )
      spinner.stop()
      break
    case 'end-day':
      spinner = ora('Checking for uncompleted entries').start()
      if (await personalSheet.hasUncompletedEntries()) {
        spinner.text = 'There is an uncompleted entry, setting stop time'
        await personalSheet.setStopTime()
      }

      spinner.text = 'Getting daily report'
      const { dailyMinutes, date } = await personalSheet.getReport()

      spinner.text = 'Getting name values'
      const names = await workSheet.getNameValues()

      spinner.text = 'Getting commessa values'
      const commesse = await workSheet.getCommessaValues()
      spinner.stop()

      const commessa = await promptSelector(
        'On what you worked today?',
        commesse,
      )

      spinner.start('Saving working day')
      const decimalHours = await workSheet.saveWorkingDay(
        dailyMinutes,
        date,
        commessa,
        names[0],
      )
      spinner.stop()

      console.log(
        chalk.green('🤓'),
        chalk.bold.green(`${formatMinutes(dailyMinutes)} -> ${decimalHours}`),
        chalk.green('hours'),
        chalk.bold.green(':)'),
      )
      break
    default:
      parser.print_help()
  }
}

const promptSelector = async (message: string, values: string[]) => {
  const { value } = await prompts({
    type: 'select',
    name: 'value',
    message,
    choices: values.map((v) => ({ title: v, value: v })),
  })

  if (!value) {
    throw new Error('No value selected!')
  }

  return value as string
}

cli().catch((err) => {
  const msg = chalk.italic.red(err?.message || err)
  if (spinner?.isSpinning) {
    spinner.fail(msg)
  } else {
    console.error(msg)
  }
})
