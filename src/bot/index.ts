import cron from 'node-cron'
import axios from 'axios'
import { isSameDay } from 'date-fns'
import { PersonalSheet } from '../'
import { config } from '../config'

const botToken = '' // @TODO
const baseUrl = `https://api.telegram.org/bot${botToken}`
const sendMessageUrl = `${baseUrl}/sendMessage`

const myChatId = undefined // @TODO

const notification = { sent: false, date: new Date() }

const personalSheet = new PersonalSheet(
  config.PERSONAL_SHEET_ID,
  config.PERSONAL_PAGE_NAME,
)

cron.schedule('*/5 8-22 * * *', async () => {
  const currentDate = new Date()
  if (!isSameDay(currentDate, notification.date)) {
    notification.date = currentDate
    notification.sent = false
  }

  if (!notification.sent) {
    // to avoid lots of requests:
    // save time of checking and the amount of hours done
    // then the next time check if more then x (for example 7) hours
    // has elapsed, if so do the check, otherwise avoid calling getReport()

    const { dailyMinutes, date } = await personalSheet.getReport()
    if (dailyMinutes >= 480 - 5) {
      // almost 8h
      await axios.get(sendMessageUrl, {
        params: { chat_id: myChatId, text: 'No more workyyy!!' },
      })
      notification.sent = true
    }
  }
})
