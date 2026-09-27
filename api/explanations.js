import { handleExplanationRequest } from '../server/explanations.mjs'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default handleExplanationRequest
