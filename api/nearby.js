import { searchPlaces } from '../server/places.mjs'

export default {
  fetch(request) {
    return searchPlaces(request, process.env)
  },
}
