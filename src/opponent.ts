import { HttpRankedApi } from './api';
import { parseConfig } from './config';
import { OverlayController } from './live';
import { OpponentRenderer } from './render';
import './styles/overlay.css';

const root = document.querySelector<HTMLElement>('#opponent')!;
try {
  const config = parseConfig(window.location.search);
  const renderer = new OpponentRenderer(root);
  const controller = new OverlayController(config, new HttpRankedApi(), view => renderer.render(view, config));
  controller.start();
  window.addEventListener('pagehide', () => controller.stop());
  window.addEventListener('pageshow', event => { if (event.persisted) controller.start(); });
} catch (error) {
  // Invalid pasted links stay invisible in-game. The setup page validates new links.
  console.warn('Opponent overlay configuration:', error instanceof Error ? error.message : 'Invalid URL');
}
