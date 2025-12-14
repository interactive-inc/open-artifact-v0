import type { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import type { HTTPResponseError } from "hono/types"

export function onErrorJson(err: Error | HTTPResponseError, c: Context) {
  console.error(err)

  if (err instanceof HTTPException) {
    return c.json({ message: err.message }, err.status)
  }

  if (err instanceof Error) {
    return c.json({ message: err.message }, 500)
  }

  return c.json({ message: "" }, 500)
}
