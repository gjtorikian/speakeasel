import type { ActivityEntry } from '../webmcp/tools';

// ---------------------------------------------------------------------------
// Tool-call activity feed: fixed panel listing the last 50 tool calls,
// newest first — agent actions become legible on camera. Unlike the other
// panels this one is push-driven (registerAll's dispatch wrapper calls
// `push`), not scene-subscribed. Entries are built with textContent (never
// innerHTML interpolation) because args come from the agent.
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 50;

export interface ActivityFeed {
  push(entry: ActivityEntry): void;
}

function compactArgs(args: unknown): string {
  let json: string;
  try {
    json = JSON.stringify(args) ?? '';
  } catch {
    json = String(args);
  }
  if (json === '{}' || json === '') return '';
  return json.length > 80 ? `${json.slice(0, 77)}…` : json;
}

export function mountActivity(mount: HTMLElement): ActivityFeed {
  mount.innerHTML = `
    <div class="activity">
      <h2 class="activity-title">Agent activity</h2>
      <p class="activity-empty">No tool calls yet.</p>
      <ol class="activity-list" aria-live="polite"></ol>
    </div>`;

  const list = mount.querySelector<HTMLOListElement>('.activity-list')!;
  const empty = mount.querySelector<HTMLParagraphElement>('.activity-empty')!;

  function push(entry: ActivityEntry): void {
    const item = document.createElement('li');
    item.className = `activity-entry ${entry.ok ? 'ok' : 'failed'}`;

    const status = document.createElement('span');
    status.className = 'activity-status';
    status.textContent = entry.ok ? '✓' : '✗';

    const tool = document.createElement('span');
    tool.className = 'activity-tool';
    tool.textContent = entry.tool;

    const args = document.createElement('span');
    args.className = 'activity-args';
    args.textContent = compactArgs(entry.args);

    const time = document.createElement('time');
    time.className = 'activity-time';
    time.dateTime = entry.at.toISOString();
    time.textContent = entry.at.toLocaleTimeString();

    item.title = entry.summary;
    item.append(status, tool, args, time);

    list.prepend(item);
    while (list.children.length > MAX_ENTRIES) list.lastElementChild!.remove();
    empty.hidden = true;
  }

  return { push };
}
