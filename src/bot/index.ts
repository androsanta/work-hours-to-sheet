import cron from 'node-cron'
import axios from 'axios'
import { isSameDay, differenceInMinutes } from 'date-fns'
import quote from 'inspirational-quotes'
import { personalSheet, workSheet } from '../sheets'
import { formatMinutes, Commands as CliCommands } from '../'
import { config } from '../config'

const botToken = config.BOT_TOKEN
const myChatId = config.PERSONAL_CHAT_ID

const baseUrl = `https://api.telegram.org/bot${botToken}`
const urls = {
  sendMessage: `${baseUrl}/sendMessage`,
  getUpdates: `${baseUrl}/getUpdates`,
  setCommands: `${baseUrl}/setMyCommands`,
}

enum Commands {
  INFO = '/info',
  START = '/start',
  STOP = '/stop',
  END_DAY = '/end_day',
}

// enum BoolCommand {
//   YES = 'YES',
//   NO = 'NO',
// }

const replyMarkupWithCommands = JSON.stringify({
  keyboard: [
    [Commands.INFO, Commands.START],
    [Commands.END_DAY, Commands.STOP],
  ],
  resize_keyboard: true,
})

const getReplyMarkupList = (list: string[]) =>
  JSON.stringify({
    keyboard: list.map((el) => [el]),
    resize_keyboard: true,
  })

// Global state variables
const state = {
  notificationSent: false,
  lastSheetCheck: new Date(),
  lastBotMessageCheck: new Date(),
  lastWorkMinutes: 0,
  isWaitingForEndDayConfirm: false,
}
let processedUpdates: number[] = []
const cliCommands = new CliCommands()

async function setBotCommands() {
  try {
    const commands = [
      { command: Commands.INFO, description: 'Get info' },
      { command: Commands.START, description: 'Start time' },
      { command: Commands.STOP, description: 'Stop time' },
      { command: Commands.END_DAY, description: 'Complete working day' },
    ]
    await axios.get(urls.setCommands, {
      params: { commands: JSON.stringify(commands) },
    })
    console.log('Bot commands set')
    await axios.get(urls.sendMessage, {
      params: {
        chat_id: myChatId,
        text: '*Work Hours Bot* has just started!🚀',
        parse_mode: 'Markdown',
        reply_markup: replyMarkupWithCommands,
      },
    })
    console.log('Starting message sent')
  } catch (e) {
    console.error('Error setting commands', e)
    process.exit(0)
  }
}

async function consumeUpdates() {
  const { data, status } = await axios.get(urls.getUpdates)
  console.log('update', data, status)
  if (status !== 200 || !data.ok) {
    throw new Error('Error getting updates!')
  }

  const promises = data.result
    ?.filter((update: any) => {
      console.log(update)
      const { update_id, message } = update
      if (processedUpdates.includes(update_id)) {
        return false
      }
      processedUpdates.push(update_id)
      return message?.chat.id === myChatId
    })
    .map(async (update: any) => {
      const chat_id = myChatId
      const { message } = update
      let text: string

      if (state.isWaitingForEndDayConfirm) {
        const commesse = await workSheet.getCommessaValues()
        if (commesse.includes(message.text.trim())) {
          await cliCommands.endDay({
            commessa: message.text.trim(),
            full8h: true,
          })
        }
        // todo if waiting for response increase polling time
        // but also check if the sheet is already completed
        // or else it will make lots of requests indefinitely
        state.isWaitingForEndDayConfirm = false
        return
      }

      switch (message.text) {
        // case BoolCommand.YES:
        //   // call end-day with -f option
        //   state.isWaitingForEndDayConfirm = false
        //   break
        // case BoolCommand.NO:
        //   // do nothing, or send a message to confirm
        //   state.isWaitingForEndDayConfirm = false
        //   break
        case Commands.INFO:
          const { dailyMinutes } = await personalSheet.getReport()
          state.lastWorkMinutes = dailyMinutes
          state.lastSheetCheck = new Date()
          text = `*${formatMinutes(dailyMinutes)}* worked so far 👨🏻‍💻\n`
          await axios.get(urls.sendMessage, {
            params: { chat_id, text, parse_mode: 'Markdown' },
          })
          break
        case Commands.START:
        case Commands.STOP:
        case Commands.END_DAY:
        default:
          await axios.get(urls.sendMessage, {
            params: { chat_id, text: 'Unknown or not implemented command' },
          })
      }
    })

  try {
    await Promise.all(promises)
  } catch {
    state.isWaitingForEndDayConfirm = false
    const text = 'Sorry, an error occurred :('
    await axios.get(urls.sendMessage, {
      params: { chat_id: myChatId, text },
    })
  }

  const len = processedUpdates.length
  processedUpdates = processedUpdates.slice(len - 1000, len)
}

async function main() {
  const now = new Date()

  if (!isSameDay(now, state.lastSheetCheck)) {
    // New day, reset state
    state.notificationSent = false
    state.lastWorkMinutes = 0
    state.isWaitingForEndDayConfirm = false
    console.log('New day, resetting global state')
  }

  // If waiting for end day confirm then
  // check every minute (because of the cron job)
  if (
    differenceInMinutes(now, state.lastBotMessageCheck) >= 10 ||
    state.isWaitingForEndDayConfirm
  ) {
    await consumeUpdates()
  }

  if (!state.notificationSent) {
    // to avoid lots of requests:
    // save time of checking and the amount of hours done
    // then the next time check if more then x (for example 7) hours
    // has elapsed, if so do the check, otherwise avoid calling getReport()
    const lastCheckMinutes = differenceInMinutes(now, state.lastSheetCheck)
    const workHoursProjection = lastCheckMinutes + state.lastWorkMinutes

    console.log('Last check on google sheet in minutes: ', lastCheckMinutes)
    console.log('Projection for minutes worked is: ', workHoursProjection)

    if (workHoursProjection < 465) {
      // Projection for worked time is less than 7h45m
      console.log('Projection less than 7h45m, skipping sheet check')
      return
    }

    const { dailyMinutes, date } = await personalSheet.getReport()
    state.lastWorkMinutes = dailyMinutes
    state.lastSheetCheck = now
    console.log('Daily minutes from sheet: ', dailyMinutes)

    if (isSameDay(date, now) && dailyMinutes >= 480 - 10) {
      console.log('Time to send the notification')

      const dailyQuote = quote.getQuote()
      let text = `_${dailyQuote.text}_\n*${dailyQuote.author}*\n\nEnough 👨🏻‍💻 for today`
      text += '\n\nSelect the commessa to confirm the working day'
      const commesse = await workSheet.getCommessaValues()

      const { status } = await axios.get(urls.sendMessage, {
        params: {
          chat_id: myChatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: getReplyMarkupList(commesse),
        },
      })
      if (status === 200) {
        state.notificationSent = true
        state.isWaitingForEndDayConfirm = true
        console.log('Notification sent')
      }
    }
  }
}

setBotCommands().then(() => {
  // cron.schedule('*/5 8-22 * * 1-5', async () => {
  cron.schedule('* * * * *', async () => {
    // todo try catch
    try {
      await main()
    } catch (e) {
      console.log('Error executing main function')
    }
  })
})
