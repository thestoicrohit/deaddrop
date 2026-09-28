// Message shown when a contract address isn't configured. Developers running
// `npm run dev` get the actionable hint; public visitors get a plain notice.
export function notDeployedMsg(what = 'This feature') {
  return import.meta.env.DEV
    ? `${what} contract not deployed yet — run: npm run deploy:sepolia`
    : 'Saving on the blockchain is coming soon. You can explore everything with sample data for now.'
}
