import { redirect } from 'next/navigation';

// This page is required for the locale redirect to work properly
export default function GlobalNotFound() {
  // Redirect to the default locale
  redirect('/en');
}