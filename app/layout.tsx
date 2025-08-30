// This layout file is required when using a root `not-found.tsx` page.
// It simply passes children through.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}