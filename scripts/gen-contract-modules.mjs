import fs from 'node:fs'
import path from 'node:path'

const CONTRACTS = [
  { sol: 'DeadDropVault',       file: 'vault.js',       prefix: 'VAULT',       envVar: 'VITE_VAULT_ADDRESS',         title: 'DeadDropVault' },
  { sol: 'DeadDropKeyRegistry', file: 'keyRegistry.js',  prefix: 'KEY_REGISTRY', envVar: 'VITE_KEY_REGISTRY_ADDRESS',  title: 'DeadDropKeyRegistry' },
  { sol: 'DeadDropCircles',     file: 'circles.js',      prefix: 'CIRCLES',      envVar: 'VITE_CIRCLES_ADDRESS',       title: 'DeadDropCircles' },
  { sol: 'DeadDropCapsules',    file: 'capsules.js',     prefix: 'CAPSULES',     envVar: 'VITE_CAPSULES_ADDRESS',      title: 'DeadDropCapsules' },
  { sol: 'DeadDropSafe',        file: 'safe.js',         prefix: 'SAFE',         envVar: 'VITE_SAFE_ADDRESS',          title: 'DeadDropSafe' },
  { sol: 'DeadDropCredentials', file: 'credentials.js',  prefix: 'CREDENTIALS',  envVar: 'VITE_CREDENTIALS_ADDRESS',   title: 'DeadDropCredentials' },
]

const root = process.cwd()

for (const c of CONTRACTS) {
  const artifactPath = path.join(root, 'artifacts', 'contracts', `${c.sol}.sol`, `${c.sol}.json`)
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
  const abi = artifact.abi

  const fnCount = abi.filter(e => e.type === 'function').length
  const evCount = abi.filter(e => e.type === 'event').length

  // The vault module needs a dual-env-var lookup for backward compat.
  const addressLine = c.sol === 'DeadDropVault'
    ? `// Accept VITE_VAULT_ADDRESS (current) or VITE_CONTRACT_ADDRESS (legacy .env files).\nexport const ${c.prefix}_ADDRESS =\n  import.meta.env.${c.envVar} ||\n  import.meta.env.VITE_CONTRACT_ADDRESS ||\n  null`
    : `export const ${c.prefix}_ADDRESS = import.meta.env.${c.envVar} || null`

  const out = `// ─────────────────────────────────────────────────────────────────────────────
// ${c.title} — contract address + ABI
//
// ABI is pulled verbatim from the compiled artifact
// (artifacts/contracts/${c.sol}.sol/${c.sol}.json) so it can never drift from
// the actual deployed bytecode. Regenerate with:
//   node scripts/gen-contract-modules.mjs   (after \`npm run compile\`)
//
// After deploying, set ${c.envVar} in your .env file.
// Run:  npm run deploy:sepolia   (or deploy:local for a local Hardhat node)
// ─────────────────────────────────────────────────────────────────────────────

${addressLine}

// ${c.sol}.sol ABI — ${fnCount} functions, ${evCount} events
export const ${c.prefix}_ABI = ${JSON.stringify(abi, null, 2)}
`

  fs.writeFileSync(path.join(root, 'src', 'lib', 'contracts', c.file), out)
  console.log(`wrote src/lib/contracts/${c.file}  (${fnCount} fns, ${evCount} events)`)
}
