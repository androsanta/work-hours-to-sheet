import { Sheet } from './sheet'
import { format } from 'date-fns'
import prompts from 'prompts'
import { config } from '../config'

export class WorkSheet extends Sheet {
  async saveWorkingDay(dailyMinutes: number, date: Date) {
    const name = await this.promptForValue(
      config.WORK_SHEET_NAME_CELL,
      'Who are you?',
    )
    const commessa = await this.promptForValue(
      config.WORK_SHEET_COMMESSA_CELL,
      'On what you worked today?',
    )
    const decimalTime = this.toDecimalValueRounded(dailyMinutes)
    const formattedDate = format(date, 'dd/MM/yyyy')

    const values = [[formattedDate, name, commessa, decimalTime]]
    console.log(values)

    const sheets = await this.getSheets()
    const appendV = config.WORK_SHEET_APPEND_RANGE
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: `${config.WORK_PAGE_NAME}!${appendV}:${appendV}`,
    })

    console.log(result)

    return decimalTime
  }

  private async promptForValue(cellName: string, message: string) {
    const values = await this.getCellDropdownValues(cellName)
    if (values.length === 1) {
      return values[0]
    }
    return this.promptSelector(message, values)
  }

  private async getCellDropdownValues(cell: string) {
    const sheets = await this.getSheets()

    const result = await sheets.spreadsheets.get({
      includeGridData: true,
      spreadsheetId: this.sheetId,
      ranges: [`${this.pageName}!${cell}:${cell}`],
    })

    const dataValidation =
      result.data.sheets?.[0].data?.[0].rowData?.[0].values?.[0].dataValidation

    let values: string[] | undefined
    if (dataValidation?.condition?.type === 'ONE_OF_LIST') {
      values = dataValidation.condition.values
        ?.map((value) => value.userEnteredValue)
        .filter((v) => !!v) as string[]
    }

    if (!values || values.length <= 0) {
      throw new Error('No value found for COMMESSA field!')
    }

    return values
  }

  private async promptSelector(message: string, values: string[]) {
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

  private toDecimalValueRounded(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    // round minutes to 15 minutes uncertainty (25 in decimal)
    const STEP = 25
    // 15 minutes gets converted to 0.25
    const decimalMinutes = (minutes * 100) / 60
    // 0.20 becomes 0.25, 0.10 becomes 0
    const triggerPoint = Math.floor(STEP / 2)
    const roundUp =
      Math.max(decimalMinutes % STEP, triggerPoint - 1) >= triggerPoint

    const decimalMinutesRounded =
      Math.floor(decimalMinutes / STEP) * STEP + (roundUp ? STEP : 0)
    return hours + decimalMinutesRounded / 100
  }
}
