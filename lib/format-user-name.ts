type User = {
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  email: string
}

export function formatUserName(user: User): string {
  const firstName = user.firstName?.trim()
  const lastName = user.lastName?.trim()

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  if (firstName) {
    return firstName
  }

  if (lastName) {
    return lastName
  }

  if (user.name?.trim()) {
    return user.name.trim()
  }

  return user.email
}
