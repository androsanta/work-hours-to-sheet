import { Sheet } from './sheet'
import {
  isBefore,
  isSameDay,
  parse,
  format,
  differenceInMinutes,
} from 'date-fns'

export class PersonalSheet extends Sheet {
  private async getNumberOfEntries() {
    const sheets = await this.getSheets()
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${this.pageName}!D1:D1`,
    })

    const cellValue = result.data.values?.[0]?.[0]
    if (!cellValue) {
      throw new Error('Cannot read Cell for number of entries')
    }

    return Number.parseInt(cellValue)
  }

  private async getLastRow() {
    const nEntries = await this.getNumberOfEntries()
    const sheets = await this.getSheets()
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${this.pageName}!A${nEntries}:C${nEntries}`,
    })

    const lastRow = result.data.values?.[0]
    if (!lastRow) {
      throw new Error('Cannot get last row')
    }

    return lastRow as string[]
  }

  async hasUncompletedEntries() {
    return !(await this.getLastRow())?.[2]
  }

  async setStartTime(time?: string) {
    const lastRow = await this.getLastRow()
    const [, , endTime] = lastRow

    if (!endTime) {
      throw new Error('There is an uncompleted entry')
    }

    const now = new Date()
    if (time) {
      const [hours, minutes] = time.split('.')
      now.setHours(+hours)
      now.setMinutes(+minutes)

      if (isNaN(now.getTime())) {
        throw new Error('Invalid time provided')
      }
    }

    const dayFormatted = format(now, 'dd/MM/yyyy')
    const startTimeFormatted = format(now, 'HH.mm')
    const values = [[dayFormatted, startTimeFormatted]]

    const sheets = await this.getSheets()
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: `${this.pageName}!A1:C`,
      valueInputOption: 'RAW',
      requestBody: { values },
    })

    if (result.status !== 200) {
      throw new Error('Error adding new entry to the sheet')
    }
  }

  async setStopTime(time?: string) {
    const lastRow = await this.getLastRow()
    const [date, startTime, endTime] = lastRow

    if (endTime) {
      throw new Error('Last entry is already completed')
    }
    if (!startTime) {
      throw new Error('Last entry does not contain a starting time')
    }

    const startDate = parse(date, 'dd/MM/yyyy', new Date())
    const [hours, minutes] = startTime.split('.')
    startDate.setHours(+hours)
    startDate.setMinutes(+minutes)

    const now = new Date()
    if (time) {
      const [hours, minutes] = time.split('.')
      now.setHours(+hours)
      now.setMinutes(+minutes)

      if (isNaN(now.getTime())) {
        throw new Error('Invalid time provided')
      }
    }

    if (!isSameDay(startDate, now) || !isBefore(startDate, now)) {
      throw new Error(
        'Cannot set stop time. Not the same day, or start/stop times are not sequential',
      )
    }

    const endTimeFormatted = format(now, 'HH.mm')
    const values = [[date, startTime, endTimeFormatted]]

    const nEntries = await this.getNumberOfEntries()

    const sheets = await this.getSheets()
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: `${this.pageName}!A${nEntries}:C`,
      valueInputOption: 'RAW',
      requestBody: { values },
    })

    if (result.status !== 200) {
      throw new Error('Error setting stop time')
    }
  }

  async getReport() {
    const totalEntries = await this.getNumberOfEntries()
    const now = new Date()

    const startEntryIndex = Math.max(totalEntries - 50, 2)
    const sheets = await this.getSheets()
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${this.pageName}!A${startEntryIndex}:C`,
    })

    const dailyMinutes = (result.data.values || [])
      .filter((row) => {
        const [dateFormatted] = row
        const date = parse(dateFormatted, 'dd/MM/yyyy', new Date())
        return isSameDay(date, now)
      })
      .map((row) => {
        const [, startTimeFormatted, stopTimeFormatted] = row
        const startTime = parse(startTimeFormatted, 'HH.mm', new Date())
        const stopTime = stopTimeFormatted
          ? parse(stopTimeFormatted, 'HH.mm', new Date())
          : new Date()
        return differenceInMinutes(stopTime, startTime)
      })
      .reduce((a, b) => a + b, 0)

    return {
      date: now,
      dailyMinutes,
      totalEntries,
      lastRow: result.data.values?.[result.data.values?.length - 1],
    }
  }
}
