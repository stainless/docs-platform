export function getPropertyToggle(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  const toggle = target.closest<HTMLElement>('[data-stldocs-property-toggle-expanded]');
  return toggle instanceof HTMLElement ? toggle : null;
}
