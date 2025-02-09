import { expect, describe, it } from 'bun:test'

import { queryRoutes } from '.'

describe('queryRoutes', () => {
  it('fetches routes from the ser api', async () => {
    const routes = await queryRoutes(
      '0x325b8aB1BD08FbA28332796e6e4e979Fc3776BA9',
      'gno:0x8bbd876d534e6e00e61414f00576627e4466bbde'
    )
    expect(routes).toBeArray()
    expect(routes.length).toBeGreaterThan(0)
  })
})
