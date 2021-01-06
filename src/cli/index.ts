import { ArgumentParser } from 'argparse'
import { PersonalSheet, WorkSheet, formatMinutes } from '../'
import chalk from 'chalk'
import { format } from 'date-fns'
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

const cli = async () => {
  const personalSheet = new PersonalSheet(
    config.PERSONAL_SHEET_ID,
    config.PERSONAL_PAGE_NAME,
  )
  const workSheet = new WorkSheet(config.WORK_SHEET_ID, config.WORK_PAGE_NAME)

  const args = parser.parse_args()

  switch (args.subcommand) {
    case 'info':
      const report = await personalSheet.getReport()
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
      await personalSheet.setStartTime(args.time)
      console.log(chalk.green('Start time set'))
      break
    case 'stop':
      await personalSheet.setStopTime(args.time)
      console.log(chalk.green('Stop time set'))
      break
    case 'end-day':
      if (await personalSheet.hasUncompletedEntries()) {
        await personalSheet.setStopTime()
      }
      const { dailyMinutes, date } = await personalSheet.getReport()
      const decimalHours = await workSheet.saveWorkingDay(dailyMinutes, date)
      console.log(
        chalk.green('Saved!'),
        chalk.bold.green(`${formatMinutes(dailyMinutes)} -> ${decimalHours}`),
        chalk.green('hours'),
        chalk.bold.green(':)'),
      )
      break
    default:
      parser.print_help()
  }
}

cli().catch((err) => console.error(chalk.red(err?.message || err)))
