import { createFactory } from 'hono/factory'
import type { AuthContext } from './middleware/auth'

export const factory = createFactory<AuthContext>()
