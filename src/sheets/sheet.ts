import { createAuth } from './authorizer'
import { google, sheets_v4 } from 'googleapis'

export class Sheet {
  protected sheets?: sheets_v4.Sheets

  constructor(protected sheetId: string, protected pageName: string) {}

  protected async getSheets() {
    if (!this.sheets) {
      const auth = await createAuth()
      this.sheets = google.sheets({ version: 'v4', auth })
    }

    return this.sheets
  }
}
