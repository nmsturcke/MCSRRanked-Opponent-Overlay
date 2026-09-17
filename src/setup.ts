import { ApiError, HttpRankedApi } from './api';
import { createOverlayUrl, DEFAULT_OPTIONS, isTheme, recommendedSize, TOGGLES, validUsername } from './config';
import { OpponentRenderer } from './render';
import { SetupGuide } from './setup-guide';
import type { DisplayOptions, OpponentView, Profile } from './types';
import './styles/overlay.css';
import './styles/setup.css';

const select = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
const form = select<HTMLFormElement>('#setup-form');
const username = select<HTMLInputElement>('#username');
const status = select<HTMLElement>('#form-status');
const generate = select<HTMLButtonElement>('#generate');
const result = select<HTMLElement>('#link-result');
const empty = select<HTMLElement>('#link-empty');
const output = select<HTMLInputElement>('#overlay-url');
const open = select<HTMLAnchorElement>('#open-overlay');
const copyStatus = select<HTMLElement>('#copy-status');
const matchButton = select<HTMLButtonElement>('#preview-match');
const idleButton = select<HTMLButtonElement>('#preview-idle');
const renderer = new OpponentRenderer(select('#overlay-preview'), true);
const api = new HttpRankedApi();
const guide = new SetupGuide({
  username: select('.username-input'), generate,
  copy: select('#copy-link'), toolscreen: select('#toolscreen-settings'),
});
let resolved: Profile | null = null;
let validatedInput = '';
let request: AbortController | null = null;
let requestId = 0;
let idle = false;

const sample: OpponentView = {
  player: { uuid: '00000000000000000000000000000001', nickname: 'Speedrunner', eloRate: 1842, eloRank: 128 },
  record: { wins: 4, draws: 1, losses: 3 }, winRate: 62.5, twitch: 'speedrunner',
};

function options(): DisplayOptions {
  const value = { ...DEFAULT_OPTIONS };
  for (const key of TOGGLES) value[key] = (form.elements.namedItem(key) as HTMLInputElement).checked;
  const theme = (form.elements.namedItem('theme') as RadioNodeList).value;
  if (isTheme(theme)) value.theme = theme;
  return value;
}

function preview(): void {
  const selected = options();
  renderer.render(idle ? null : sample, selected);
  select('#transparent-help').hidden = selected.theme !== 'transparent';
  const size = recommendedSize(selected);
  select('#recommended-size').textContent = `${size.width} × ${size.height}`;
  select('#idle-hint').hidden = !idle;
  matchButton.setAttribute('aria-pressed', String(!idle));
  idleButton.setAttribute('aria-pressed', String(idle));
}

function updateLink(): void {
  if (!resolved) return;
  const url = createOverlayUrl(window.location.href, { ...options(), user: resolved.nickname, uuid: resolved.uuid });
  const changed = output.value !== url;
  output.value = url;
  open.href = url;
  result.hidden = false;
  empty.hidden = true;
  select('#resolved-account').textContent = `Following ${resolved.nickname}`;
  if (changed) {
    copyStatus.textContent = '';
    guide.show('copy');
  }
}

function setBusy(busy: boolean): void {
  generate.disabled = busy;
  select('#generate-label').textContent = busy ? 'Finding your account…' : 'Generate overlay link';
  form.setAttribute('aria-busy', String(busy));
}

username.addEventListener('focus', () => { if (!resolved) guide.show('generate'); });
username.addEventListener('invalid', () => guide.show('username'));
username.addEventListener('input', () => {
  requestId++;
  request?.abort();
  setBusy(false);
  status.textContent = '';
  username.removeAttribute('aria-invalid');
  if (username.value.trim().toLowerCase() !== validatedInput) {
    resolved = null;
    result.hidden = true;
    empty.hidden = false;
    output.value = '';
    open.removeAttribute('href');
    copyStatus.textContent = '';
    guide.show('generate');
  }
});

form.addEventListener('change', () => { preview(); updateLink(); });
matchButton.addEventListener('click', () => { idle = false; preview(); });
idleButton.addEventListener('click', () => { idle = true; preview(); });

form.addEventListener('submit', async event => {
  event.preventDefault();
  const input = username.value.trim();
  if (!validUsername(input)) {
    status.textContent = 'Use a Minecraft username: 3–16 letters, numbers, or underscores.';
    username.setAttribute('aria-invalid', 'true');
    guide.show('username');
    return;
  }
  request?.abort();
  request = new AbortController();
  const id = ++requestId;
  status.textContent = 'Looking up your MCSR Ranked account…';
  setBusy(true);
  try {
    const profile = await api.profile(input, request.signal);
    if (id !== requestId) return;
    resolved = profile;
    validatedInput = input.toLowerCase();
    username.removeAttribute('aria-invalid');
    status.textContent = `Found ${profile.nickname}. Your link is ready.`;
    updateLink();
    guide.show('copy');
  } catch (error) {
    if (id !== requestId) return;
    status.textContent = error instanceof ApiError && error.notFound
      ? 'No Ranked profile found. Check the username and try again.'
      : error instanceof ApiError && error.status === 429
        ? 'Ranked is limiting requests. Wait a minute, then try again.'
        : 'Could not reach MCSR Ranked. Please try again in a moment.';
  } finally {
    if (id === requestId) setBusy(false);
  }
});

select<HTMLButtonElement>('#copy-link').addEventListener('click', async () => {
  const link = output.value;
  if (!link || !resolved) return;
  try {
    await navigator.clipboard.writeText(link);
    if (output.value !== link || !resolved) return;
    copyStatus.textContent = 'Copied. Paste this URL into Toolscreen.';
    guide.show('toolscreen');
  } catch {
    if (output.value !== link || !resolved) return;
    output.focus();
    output.select();
    copyStatus.textContent = 'Select and copy the link above (Ctrl+C or Cmd+C).';
  }
});

output.addEventListener('copy', () => {
  if (resolved && output.selectionStart === 0 && output.selectionEnd === output.value.length) {
    guide.show('toolscreen');
  }
});

preview();
guide.show(username.value ? 'generate' : 'username');
