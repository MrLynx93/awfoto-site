import Markdoc from '@markdoc/markdoc';

/**
 * Renders a `fields.markdoc.inline` value to HTML.
 *
 * That field stores its content as markdoc source in the data file, so what
 * comes out of the panel is a plain string — text typed before the field was
 * rich still reads as a paragraph, which is why the change needed no migration.
 *
 * Markdoc wraps a document in <article>; the children are rendered on their own
 * so the markup drops into whatever section calls this rather than nesting an
 * article inside it.
 */
export function renderRichText(source: string): string {
  if (!source?.trim()) return '';

  const tree = Markdoc.transform(Markdoc.parse(source));
  const nodes =
    tree && typeof tree === 'object' && 'children' in tree ? tree.children : [tree];

  return nodes.map((node) => Markdoc.renderers.html(node)).join('');
}
