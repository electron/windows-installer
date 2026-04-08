import { Eta } from 'eta';

const eta = new Eta({
  autoTrim: false,
  useWith: true,
});

export function template(text: string, data: object): string {
  return eta.renderString(text, data);
}
