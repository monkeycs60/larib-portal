type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
type DayType = 'monday' | 'friday' | 'weekend' | 'weekday'

interface GreetingContext {
  timeOfDay: TimeOfDay
  dayType: DayType
  userName: string
  locale: string
}

interface GreetingVariant {
  message: string
  emoji?: string
}

const GREETINGS_FR: Record<TimeOfDay, GreetingVariant[]> = {
  morning: [
    { message: 'Bonjour {name}, prêt(e) à démarrer la journée' },
    { message: '{name}, une nouvelle journée commence' },
    { message: 'Bon matin {name}' },
    { message: 'Belle journée à vous {name}' },
  ],
  afternoon: [
    { message: 'Bon après-midi {name}' },
    { message: 'Bonjour {name}, bonne continuation' },
    { message: '{name}, l\'après-midi commence bien' },
  ],
  evening: [
    { message: 'Bonsoir {name}' },
    { message: '{name}, bonne soirée' },
    { message: 'Bonsoir {name}, fin de journée en vue' },
  ],
  night: [
    { message: 'Bonsoir {name}' },
    { message: '{name}, il se fait tard' },
    { message: 'Bonne nuit {name}' },
  ],
}

const GREETINGS_EN: Record<TimeOfDay, GreetingVariant[]> = {
  morning: [
    { message: 'Good morning {name}, ready to start the day' },
    { message: '{name}, a new day begins' },
    { message: 'Good morning {name}' },
    { message: 'Have a great day {name}' },
  ],
  afternoon: [
    { message: 'Good afternoon {name}' },
    { message: 'Hello {name}, have a good one' },
    { message: '{name}, the afternoon is looking good' },
  ],
  evening: [
    { message: 'Good evening {name}' },
    { message: '{name}, have a good evening' },
    { message: 'Good evening {name}, end of day approaching' },
  ],
  night: [
    { message: 'Good evening {name}' },
    { message: '{name}, it\'s getting late' },
    { message: 'Good night {name}' },
  ],
}

const SPECIAL_GREETINGS_FR: Record<DayType, GreetingVariant[]> = {
  monday: [
    { message: 'Bon lundi {name}, bon courage pour cette semaine' },
    { message: '{name}, une nouvelle semaine démarre' },
  ],
  friday: [
    { message: 'Bon vendredi {name}, le week-end approche' },
    { message: '{name}, bientôt le week-end' },
  ],
  weekend: [
    { message: 'Bon week-end {name}' },
    { message: '{name}, profitez bien de votre week-end' },
  ],
  weekday: [],
}

const SPECIAL_GREETINGS_EN: Record<DayType, GreetingVariant[]> = {
  monday: [
    { message: 'Happy Monday {name}, have a great week ahead' },
    { message: '{name}, a new week begins' },
  ],
  friday: [
    { message: 'Happy Friday {name}, the weekend is near' },
    { message: '{name}, almost weekend time' },
  ],
  weekend: [
    { message: 'Happy weekend {name}' },
    { message: '{name}, enjoy your weekend' },
  ],
  weekday: [],
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

function getDayType(day: number): DayType {
  if (day === 1) return 'monday'
  if (day === 5) return 'friday'
  if (day === 0 || day === 6) return 'weekend'
  return 'weekday'
}

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function generatePersonalizedGreeting(userName: string, locale: string = 'fr'): string {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()

  const timeOfDay = getTimeOfDay(hour)
  const dayType = getDayType(day)

  const greetings = locale === 'en' ? GREETINGS_EN : GREETINGS_FR
  const specialGreetings = locale === 'en' ? SPECIAL_GREETINGS_EN : SPECIAL_GREETINGS_FR

  const specialOptions = specialGreetings[dayType]
  const useSpecialGreeting = specialOptions.length > 0 && Math.random() > 0.5

  let greeting: GreetingVariant

  if (useSpecialGreeting) {
    greeting = getRandomItem(specialOptions)
  } else {
    greeting = getRandomItem(greetings[timeOfDay])
  }

  return greeting.message.replace('{name}', userName)
}
