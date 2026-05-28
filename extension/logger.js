// ExpireLinkX Logger
const PREFIX = "[ExpireLinkX]";

export const Logger = {
  info: (msg, ...args) => console.log(`${PREFIX} ℹ️  ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`${PREFIX} ⚠️  ${msg}`, ...args),
  error: (msg, ...args) => console.error(`${PREFIX} 🔴 ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`${PREFIX} 🔍 ${msg}`, ...args),
  success: (msg, ...args) => console.log(`${PREFIX} ✅ ${msg}`, ...args),
  step: (msg, ...args) => console.log(`${PREFIX} ▸ ${msg}`, ...args),
};
