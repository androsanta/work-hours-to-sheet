import { Sheet } from './sheet'
import { format } from 'date-fns'
import { config } from '../config'

export class WorkSheet extends Sheet {
  async saveWorkingDay(
    dailyMinutes: number,
    date: Date,
    commessa: string,
    name: string,
  ) {
    const decimalTime = this.toDecimalValueRounded(dailyMinutes)
    const formattedDate = format(date, 'dd/MM/yyyy')

    const values = [[formattedDate, name, commessa, decimalTime]]

    const sheets = await this.getSheets()
    const page = config.WORK_PAGE_NAME
    const range = config.WORK_SHEET_APPEND_RANGE
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: `${page}!${range}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    })

    if (result.status !== 200) {
      throw new Error('Error inserting new entry!')
    }

    return decimalTime
  }

  getNameValues() {
    return this.getCellDropdownValues(config.WORK_SHEET_NAME_CELL)
  }

  async getCommessaValues() {
    const sheets = await this.getSheets()

    const page = config.WORK_SHEET_COMMESSA_PAGE
    const range = config.WORK_SHEET_COMMESSA_RANGE

    const {
      data: { values },
    } = await sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${page}!${range}`,
    })

    if (!values || values.length <= 0) {
      throw new Error('No value found for COMMESSA field!')
    }

    return values.flat().reverse()
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
      throw new Error('No value found on dropdown!')
    }

    return values
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
