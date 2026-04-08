const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escape(value: unknown): string {
  return value == null ? '' : String(value).replace(/[&<>"']/g, (c) => htmlEscapes[c]);
}

const stringEscapes: Record<string, string> = {
  '\\': '\\\\',
  "'": "\\'",
  '\n': '\\n',
  '\r': '\\r',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
};

const reDelimiters = /<%-([\s\S]+?)%>|<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g;
const reUnescapedString = /['\n\r\u2028\u2029\\]/g;

/**
 * Minimal implementation of lodash's `template`, supporting the default
 * `<% %>` (evaluate), `<%= %>` (interpolate) and `<%- %>` (escape) delimiters.
 */
export function template(text: string) {
  let index = 0;
  let source = "__p += '";

  text.replace(reDelimiters, (match, escapeValue, interpolateValue, evaluateValue, offset: number) => {
    source += text.slice(index, offset).replace(reUnescapedString, (c) => stringEscapes[c]);
    index = offset + match.length;

    if (escapeValue) {
      source += "' +\n__e(" + escapeValue + ") +\n'";
    } else if (interpolateValue) {
      source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
    } else if (evaluateValue) {
      source += "';\n" + evaluateValue + ";\n__p += '";
    }
    return match;
  });

  source += "';\n";
  source = "var __t, __p = '';\n" +
    'with (obj) {\n' + source + '}\n' +
    'return __p;\n';

  const render = Function('obj', '__e', source);
  return (data: object): string => render(data, escape);
}
