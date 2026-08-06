#!/usr/bin/env node
// Generates the value to store in the EMPLOYEE_PASSWORD_HASH environment
// variable. The plaintext password is never written anywhere by this script
// — only the salted hash is printed, on stdout, once.
//
// Usage: node scripts/hash-password.mjs "the-new-password"

import { randomBytes, scryptSync } from 'node:crypto'

const password = process.argv[2]

if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "the-new-password"')
  process.exit(1)
}

// Must match api/_auth.ts's hashPassword()/verifyPassword() format exactly:
// "<saltHex>:<hashHex>", scrypt with a 16-byte salt and 64-byte derived key.
const salt = randomBytes(16)
const hash = scryptSync(password, salt, 64)
const stored = `${salt.toString('hex')}:${hash.toString('hex')}`

console.log('EMPLOYEE_PASSWORD_HASH value (set this in Vercel, do not commit it):')
console.log(stored)
