import ora from 'ora'
import chalk from 'chalk'
import { format, addMinutes } from 'date-fns'
import { personalSheet, workSheet } from '../sheets'
import { promptSelector, formatMinutes } from '../utils'

type ConstructorArgs = Partial<{
  useConsole: boolean
  spinner: ora.Ora
}>

export class Commands {
  private useConsole: boolean
  private spinner?: ora.Ora

  constructor(args?: ConstructorArgs) {
    this.spinner = args?.spinner
    this.useConsole = !!args?.useConsole
  }

  async info() {
    this.spinner?.start('Fetching data')
    const report = await personalSheet.getReport()
    this.spinner?.stop()
    if (this.useConsole) {
      console.log(chalk.italic.grey(format(report.date, 'EEEE, d LLLL yyyy')))
      console.log(
        chalk.bold.green(formatMinutes(report.dailyMinutes)),
        chalk.green('worked so far'),
        chalk.grey(
          `(${report.lastRow?.[1]} -> ${report.lastRow?.[2] || 'now'})`,
        ),
      )
    }
  }

  async start(time?: string) {
    this.spinner?.start('Setting start time')
    await personalSheet.setStartTime(time)
    this.spinner?.succeed(chalk.italic.green('Start time set'))
  }

  async stop(time?: string) {
    this.spinner?.start('Setting stop time')
    await personalSheet.setStopTime(time)
    this.spinner?.succeed(chalk.italic.green('Stop time set'))
    this.spinner?.start('Getting report')
    const { dailyMinutes: minutes } = await personalSheet.getReport()
    this.spinner?.stop()
    if (this.useConsole) {
      console.log(
        chalk.bold.green(formatMinutes(minutes)),
        chalk.green('worked so far'),
      )
    }
  }

  async endDay(args?: { full8h?: boolean; commessa?: string }) {
    this.spinner?.start('Checking for uncompleted entries')
    const hasUncompletedEntries = await personalSheet.hasUncompletedEntries()

    if (hasUncompletedEntries) {
      if (!args?.full8h) {
        this.spinner?.start('There is an uncompleted entry, setting stop time')
        await personalSheet.setStopTime()
      } else {
        this.spinner?.start(
          'There is an uncompleted entry, setting stop time to match 8 hours',
        )
        const { dailyMinutes } = await personalSheet.getReport()
        // daily minutes may be > or < than 480 (8h), this handle both cases
        const difference = 480 - dailyMinutes
        const stopDate = format(addMinutes(new Date(), difference), 'HH.mm')
        this.spinner?.start(`Setting stop time to ${stopDate}`)
        await personalSheet.setStopTime(stopDate)
      }
    }

    this.spinner?.start('Getting daily report')
    const { dailyMinutes, date } = await personalSheet.getReport()

    this.spinner?.start('Getting name values')
    const names = await workSheet.getNameValues()

    this.spinner?.start('Getting commessa values')
    const commesse = await workSheet.getCommessaValues()
    this.spinner?.stop()

    let selectedCommessa = ''
    if (args?.commessa) {
      selectedCommessa = args.commessa
      if (!commesse.includes(selectedCommessa)) {
        throw new Error(
          `Invalid commessa value. ${selectedCommessa} not present among: ${commesse.toString()}`,
        )
      }
    } else if (this.useConsole) {
      selectedCommessa = await promptSelector(
        'On what you worked today?',
        commesse,
      )
    }
    if (!selectedCommessa) {
      throw new Error('Missing commessa value!')
    }

    this.spinner?.start('Saving working day')
    const decimalHours = await workSheet.saveWorkingDay(
      dailyMinutes,
      date,
      selectedCommessa,
      names[0],
    )
    this.spinner?.stop()

    if (this.useConsole) {
      console.log(
        chalk.green('🤓'),
        chalk.bold.green(`${formatMinutes(dailyMinutes)} -> ${decimalHours}`),
        chalk.green('hours'),
        chalk.bold.green(':)'),
      )
    }
  }
}
