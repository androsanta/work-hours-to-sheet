export * from './sheets/sheet'
export * from './sheets/personal-sheet'
export * from './sheets/work-sheet'

export const formatMinutes = (minutes: number) =>
  `${Math.floor(minutes / 60)} h ${minutes % 60} m`
