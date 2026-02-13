# Rejseplanen Local Dev Commands

Use these in the Firefox console on `https://learn.inside.dtu.dk/...`.

These only affect this extension's local browser state.
They do **not** bypass Rejseplanen server-side limits (HTTP `429`/`403`).

## Check current local state

```js
JSON.parse(localStorage.getItem('dtuDarkModeBusApiCalls') || '{}');
localStorage.getItem('dtuDarkModeBusQuotaExhausted');
localStorage.getItem('dtuDarkModeBusEnabled');
localStorage.getItem('dtuDarkModeBusConfig');
localStorage.getItem('dtuDarkModeBusSetupDone');
```

## Reset local usage + re-enable bus widget

```js
const today = new Date();
const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

localStorage.setItem('dtuDarkModeBusApiCalls', JSON.stringify({ date, count: 0 }));
localStorage.removeItem('dtuDarkModeBusQuotaExhausted');
localStorage.setItem('dtuDarkModeBusEnabled', 'true');
localStorage.setItem('dtuDarkModeBusSetupDone', 'configured');
```

## Full reset of bus feature state

```js
[
  'dtuDarkModeBusApiCalls',
  'dtuDarkModeBusQuotaExhausted',
  'dtuDarkModeBusEnabled',
  'dtuDarkModeBusConfig',
  'dtuDarkModeBusSetupDone'
].forEach(k => localStorage.removeItem(k));
```

## Force local daily lockout (test UI)

```js
const today = new Date();
const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
localStorage.setItem('dtuDarkModeBusApiCalls', JSON.stringify({ date, count: 200 }));
```

## Force local monthly lockout banner (test UI)

```js
localStorage.setItem('dtuDarkModeBusQuotaExhausted', new Date().toISOString());
localStorage.setItem('dtuDarkModeBusEnabled', 'false');
```

After running any command, reload the page.
