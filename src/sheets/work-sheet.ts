import { Sheet } from './sheet'
import { format } from 'date-fns'
import { config } from '../config'
import { toDecimalValueRounded } from '../utils'

export class WorkSheet extends Sheet {
  async saveWorkingDay(
    dailyMinutes: number,
    date: Date,
    commessa: string,
    name: string,
  ) {
    const decimalTime = toDecimalValueRounded(dailyMinutes)
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

  async getCommessaValues(): Promise<string[]> {
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
}
