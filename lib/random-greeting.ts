export function getRandomGreeting(greetings: string[]): string {
  const randomIndex = Math.floor(Math.random() * greetings.length)
  return greetings[randomIndex]
}
