import { ArgumentParser } from 'argparse'
import chalk from 'chalk'
import ora from 'ora'
import { Commands } from './commands'

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
const endDayParser = subparsers.add_parser('end-day')
endDayParser.add_argument('-f', '--full8h', {
  action: 'store_true',
  default: false,
  help: 'End the day setting a total of 8 hours',
})

const spinner = ora()

const cli = async () => {
  const commands = new Commands({
    useConsole: true,
    spinner,
  })
  const args = parser.parse_args()

  switch (args.subcommand) {
    case 'info':
      await commands.info()
      break
    case 'start':
      await commands.start(args.time)
      break
    case 'stop':
      await commands.stop(args.time)
      break
    case 'end-day':
      await commands.endDay({ full8h: args.full8h })
      break
    default:
      parser.print_help()
  }
}

cli().catch((err) => {
  const msg = chalk.italic.red(err?.message || err)
  if (spinner.isSpinning) {
    spinner.fail(msg)
  } else {
    console.error(msg)
  }
})
