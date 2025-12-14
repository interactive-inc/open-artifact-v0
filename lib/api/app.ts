import { factory } from './factory'
import { signInHandlers, signUpHandlers, signOutHandlers } from './routes/auth'
import {
  authMiddleware,
  listChatsHandlers,
  createChatHandlers,
  createOwnershipHandlers,
  getChatHandlers,
  sendMessageHandlers,
  deleteChatHandlers,
  forkChatHandlers,
  updateVisibilityHandlers,
} from './routes/chats'
import { onErrorJson } from './utils/on-error-json'

const app = factory
  .createApp()
  .basePath('/api')
  .post('/auth/signin', ...signInHandlers)
  .post('/auth/signup', ...signUpHandlers)
  .post('/auth/signout', ...signOutHandlers)
  .use('/chats/*', authMiddleware)
  .get('/chats', ...listChatsHandlers)
  .post('/chats', ...createChatHandlers)
  .post('/chats/ownership', ...createOwnershipHandlers)
  .get('/chats/:id', ...getChatHandlers)
  .post('/chats/:id/message', ...sendMessageHandlers)
  .delete('/chats/:id', ...deleteChatHandlers)
  .post('/chats/:id/fork', ...forkChatHandlers)
  .patch('/chats/:id/visibility', ...updateVisibilityHandlers)
  .onError(onErrorJson)

export type AppType = typeof app

export default app
