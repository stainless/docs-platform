import { afterEach, describe, expect, it } from 'vitest';
import { getPropertyToggle } from './property-toggle';

class TestElement {
  constructor(private readonly closestElement: TestElement | null = null) {}

  closest(selector: string) {
    return selector === '[data-stldocs-property-toggle-expanded]' ? this.closestElement : null;
  }
}

class TestHTMLElement extends TestElement {}

class TestSVGElement extends TestElement {}

const originalElement = globalThis.Element;
const originalHTMLElement = globalThis.HTMLElement;

afterEach(() => {
  Object.defineProperty(globalThis, 'Element', { configurable: true, value: originalElement });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: originalHTMLElement });
});

describe('getPropertyToggle', () => {
  it('finds the toggle when the SVG icon is the event target', () => {
    Object.defineProperty(globalThis, 'Element', { configurable: true, value: TestElement });
    Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: TestHTMLElement });

    const toggle = new TestHTMLElement();
    const icon = new TestSVGElement(toggle);

    expect(getPropertyToggle(icon as unknown as EventTarget)).toBe(toggle);
  });

  it('ignores non-element event targets', () => {
    Object.defineProperty(globalThis, 'Element', { configurable: true, value: TestElement });
    Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: TestHTMLElement });

    expect(getPropertyToggle({} as EventTarget)).toBeNull();
  });
});
