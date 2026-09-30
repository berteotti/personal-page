import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { Blog } from './site'

test('the notebook shows the empty message or only post titles in content order', () => {
  const render = (posts: { id: string; title: string }[]) => renderToStaticMarkup(<MemoryRouter><Blog posts={posts} /></MemoryRouter>)
  expect(render([])).toContain('there are no personal takes, for now')
  const populated = render([{ id: 'first', title: 'A first thought' }, { id: 'second', title: 'Another & different thought' }])
  expect(populated).not.toContain('there are no personal takes, for now')
  expect(populated).toContain('<ol class="notebook-takes"><li>A first thought</li><li>Another &amp; different thought</li></ol>')
})
