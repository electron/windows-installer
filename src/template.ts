// A minimal, dependency-free stand-in for `lodash.template`, supporting the
// ERB-style delimiters used by `.nuspectemplate` files:
//
//   <%- value %>  interpolate, HTML/XML-escaped
//   <%= value %>  interpolate, raw
//   <%  code   %> evaluate

const token = /<%-([\s\S]+?)%>|<%=([\s\S]+?)%>|<%([\s\S]+?)%>/g;

const escapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;'
};

const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const reserved = new Set([
  'arguments', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'enum', 'eval', 'export',
  'extends', 'false', 'finally', 'for', 'function', 'if', 'implements',
  'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package',
  'private', 'protected', 'public', 'return', 'static', 'super', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with',
  'yield'
]);


function stringify(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}


/**
 * Renders an ERB-style template.
 *
 * Each own enumerable property of `data` whose name is a valid identifier is
 * available to the template as a variable.
 *
 * @param text The template source
 * @param data The values to render the template with
 * @returns The rendered template
 */
export function renderTemplate(text: string, data: object): string {
  const values = data as Record<string, unknown>;
  let source = 'let __p = \'\';\n';
  let index = 0;

  const appendLiteral = (literal: string): void => {
    if (literal.length > 0) {
      // U+2028/U+2029 are escaped so that they cannot terminate the literal.
      source += `__p += ${JSON.stringify(literal).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')};\n`;
    }
  };

  let match: RegExpExecArray | null;
  token.lastIndex = 0;
  while ((match = token.exec(text)) !== null) {
    const [token, escaped, interpolated, evaluated] = match;
    appendLiteral(text.slice(index, match.index));
    index = match.index + token.length;

    if (escaped !== undefined) {
      source += `__p += __e(${escaped});\n`;
    } else if (interpolated !== undefined) {
      source += `__p += __s(${interpolated});\n`;
    } else {
      source += `${evaluated}\n`;
    }
  }

  appendLiteral(text.slice(index));
  source += 'return __p;\n';

  const names = Object.keys(values).filter((name) => identifier.test(name) && !reserved.has(name));

  try {
    const render = new Function('__e', '__s', ...names, source);
    return render((value: unknown) =>  stringify(value).replace(/[&<>"']/g, (char) => escapes[char]), stringify, ...names.map((name) => values[name]));
  } catch (error) {
    throw new Error(`Failed to render template: ${(error as Error).message}`);
  }
}
