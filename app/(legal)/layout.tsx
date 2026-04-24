// Layout passthrough — chaque page legal utilise désormais ContentPageShell
// directement pour porter sa propre charte V2 (Navigation solid + FooterV2).
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
