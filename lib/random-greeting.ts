export function getRandomGreeting(greetings: string[], seed: string): string {
  const hash = seed.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)

  const index = Math.abs(hash) % greetings.length
  return greetings[index]
}
