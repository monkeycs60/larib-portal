import type { SubmissionStatusValue } from './status-display'

export function isRejected(status: SubmissionStatusValue): boolean {
  return status === 'REJECTED'
}

// A paper is under review at only one journal at a time: when one submission
// becomes active (non-rejected), every other still-active submission is rejected.
export function siblingsToReject(
  submissions: Array<{ id: string; status: SubmissionStatusValue }>,
  keepId: string,
): string[] {
  return submissions
    .filter((submission) => submission.id !== keepId && !isRejected(submission.status))
    .map((submission) => submission.id)
}
