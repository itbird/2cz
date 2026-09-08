import { spawn } from 'node:child_process'
import process from 'node:process'

const child = spawn(process.execPath, ['node_modules/decap-server/dist/index.js'], { stdio: 'inherit', env: { ...process.env, BIND_HOST: '127.0.0.1', ORIGIN: 'http://localhost:4321' } })
child.on('exit', code => process.exit(code ?? 1))
