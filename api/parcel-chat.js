import { handleParcelChatRequest } from '../server/parcelChat.mjs'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default handleParcelChatRequest
