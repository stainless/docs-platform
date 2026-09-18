import { parseRoute, scrollToPath } from '@stainless-api/docs-ui/routing';
import { RESOLVED_API_REFERENCE_PATH } from 'virtual:stl-starlight-virtual-module';
import { updateSelectedLanguage } from '../languages';
import { navigate } from 'astro:transitions/client';
import { getPageLoadEvent } from '../helpers/getPageLoadEvent.ts';
import { getPropertyToggle } from './property-toggle';

import { initDropdown } from '@stainless-api/docs/components/scripts';

history.scrollRestoration = 'auto';

function getStainlessPathForLocation() {
  return document.location.hash
    ? decodeURI(document.location.hash)
    : parseRoute(RESOLVED_API_REFERENCE_PATH, document.location.href)?.stainlessPath;
}

window.addEventListener('popstate', (ev: PopStateEvent) => {
  const path = getStainlessPathForLocation();
  if (!path) return;
  ev.preventDefault();
  setTimeout(() => scrollToPath(path.slice(1)), 10);
});

document.addEventListener(getPageLoadEvent(), () => {
  document.querySelectorAll<HTMLElement>('[data-stldocs-snippet-select]').forEach((rootElement) => {
    initDropdown({
      root: rootElement,
      onSelect: (value) => {
        const originalLanguage = rootElement.dataset.currentValue;
        navigate(updateSelectedLanguage(RESOLVED_API_REFERENCE_PATH, originalLanguage, value)).catch((e) => {
          console.error('Failed to navigate to selected language', e);
        });
      },
    });
  });

  const path = getStainlessPathForLocation();
  if (path) setTimeout(() => scrollToPath(path.slice(1)), 10);
});

document.addEventListener('click', (event) => {
  const toggle = getPropertyToggle(event.target);
  if (!toggle || !(toggle instanceof HTMLElement)) return;

  // Toggle the “expanded” state of the toggle
  const toggleIsExpanded = toggle.dataset.stldocsPropertyToggleExpanded === 'true';
  toggle.dataset.stldocsPropertyToggleExpanded = (!toggleIsExpanded).toString();

  // Find the described “property group”
  const targetGroup = toggle.dataset.stldocsPropertyToggleTarget;
  if (!targetGroup) return;
  const target = document.querySelector(`[data-stldocs-property-group=${targetGroup}]`);
  if (!target) return;

  // Expand or collapse all <details> elements within the target group
  [...target.getElementsByTagName('details')].forEach((el) => {
    el.open = el.dataset.stldocsExpanderInitialState === 'true' ? true : !toggleIsExpanded;
  });
});
