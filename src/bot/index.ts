import cron from 'node-cron'
import axios from 'axios'
import { isSameDay, differenceInMinutes } from 'date-fns'
import quote from 'inspirational-quotes'
import { PersonalSheet } from '../'
import { config } from '../config'

const botToken = '' // @TODO
const baseUrl = `https://api.telegram.org/bot${botToken}`
const sendMessageUrl = `${baseUrl}/sendMessage`

const myChatId = undefined // @TODO

const notification = { sent: false, date: new Date() }
const checking = { time: new Date(), minutesReading: 0 }

const personalSheet = new PersonalSheet(
  config.PERSONAL_SHEET_ID,
  config.PERSONAL_PAGE_NAME,
)

cron.schedule('*/5 8-22 * * *', async () => {
  const currentDate = new Date()
  if (!isSameDay(currentDate, notification.date)) {
    notification.date = currentDate
    notification.sent = false
    checking.time = currentDate
    checking.minutesReading = 0
  }

  if (!notification.sent) {
    // to avoid lots of requests:
    // save time of checking and the amount of hours done
    // then the next time check if more then x (for example 7) hours
    // has elapsed, if so do the check, otherwise avoid calling getReport()
    const lastCheckMinutes = differenceInMinutes(currentDate, checking.time)
    const workHoursProjection = lastCheckMinutes + checking.minutesReading
    if (workHoursProjection < 450) {
      // Projection for worked time is less than 7h30m
      return
    }

    const { dailyMinutes, date } = await personalSheet.getReport()
    checking.time = currentDate
    checking.minutesReading = dailyMinutes

    if (isSameDay(date, currentDate) && dailyMinutes >= 480 - 5) {
      // @TODO prompt for:
      // - select commessa
      // - confirm directly using the first commessa available
      const dailyQuote = quote.getQuote()
      const text = `_${dailyQuote.text}_\n*${dailyQuote.author}*\n\nEnough 👨🏻‍💻 for today`
      const { status } = await axios.get(sendMessageUrl, {
        params: { chat_id: myChatId, text, parse_mode: 'Markdown' },
      })
      if (status === 200) {
        notification.sent = true
      }
    }
  }
})
