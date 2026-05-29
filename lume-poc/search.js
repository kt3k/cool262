// Custom search UI built on Pagefind core (pagefind.js) — replaces the
// pre-built PagefindUI bundle so the dropdown can match the look of
// Nextra's <Search> (custom Combobox over pagefind core in
// nextra/dist/client/components/search.js).
//
// Pagefind indexes the built HTML (run via `deno task pagefind` which
// emits `_site/pagefind/`) and exposes a JS API for queries:
//   debouncedSearch(query) → { results: [{ data() → { url, meta, sub_results } }] }
// We render those grouped by page (one section header per page, then
// each sub_result as a clickable card) with keyboard navigation and a
// backdrop-blur dropdown panel.

const root = document.getElementById("search");
const basePath = root.dataset.base ?? "";
const input = root.querySelector(".search-input");
const panel = root.querySelector(".search-panel");

// Lazy-load pagefind on first interaction so the bundle isn't pulled
// in until the user actually opens the search. import() returns the
// pagefind.js module object; options() configures bundlePath (where
// the index lives) and baseUrl (prefix added to result URLs).
let pagefindPromise = null;
function loadPagefind() {
  if (pagefindPromise) return pagefindPromise;
  pagefindPromise = (async () => {
    const pf = await import(`${basePath}/pagefind/pagefind.js`);
    await pf.options({
      bundlePath: `${basePath}/pagefind/`,
      baseUrl: `${basePath}/`,
    });
    return pf;
  })();
  return pagefindPromise;
}

let activeIdx = -1;
let lastQuery = "";

function setOpen(open) {
  panel.classList.toggle("open", open);
}

async function doSearch(q) {
  lastQuery = q;
  if (!q.trim()) {
    panel.innerHTML = "";
    setOpen(false);
    return;
  }
  setOpen(true);
  // tabler loader-2 (3/4 arc) — CSS spins it via @keyframes spin.
  panel.innerHTML = `<div class="search-status">
    <svg class="search-spinner" viewBox="0 0 24 24" width="18" height="18"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9"></path>
    </svg>
    <span>Searching…</span>
  </div>`;
  let pf;
  try {
    pf = await loadPagefind();
  } catch (_err) {
    panel.innerHTML =
      `<div class="search-status search-error">Failed to load search index</div>`;
    return;
  }
  const res = await pf.debouncedSearch(q);
  // debouncedSearch returns null if a newer search superseded this one.
  if (res === null) return;
  // Also bail if the user has typed more characters since we kicked off.
  if (q !== lastQuery) return;
  const data = await Promise.all(
    res.results.slice(0, 8).map((r) => r.data()),
  );
  if (!data.length) {
    panel.innerHTML = `<div class="search-status">No results for &ldquo;${
      escapeHtml(q)
    }&rdquo;</div>`;
    return;
  }
  panel.innerHTML = renderResults(data);
  activeIdx = -1;
}

function renderResults(data) {
  return data.map((d) => {
    const pageTitle = d.meta?.title ?? d.url;
    const subs = d.sub_results.slice(0, 5).map((s) => `
      <a class="search-result" href="${cleanUrl(s.url)}">
        <div class="search-result-title">${escapeHtml(s.title ?? "")}</div>
        <div class="search-result-excerpt">${s.excerpt}</div>
      </a>
    `).join("");
    return `
      <div class="search-page">
        <div class="search-page-title">${escapeHtml(pageTitle)}</div>
        ${subs}
      </div>
    `;
  }).join("");
}

// Pagefind result URLs come with .html (e.g. /foo.html or /foo.html#bar)
// but our pages are served from directory-index URLs without the suffix.
// Strip it the same way Nextra does in _temp2.
function cleanUrl(url) {
  return url.replace(/\.html$/, "").replace(/\.html#/, "#");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

input.addEventListener("input", (e) => doSearch(e.target.value));

// Re-open on focus if there are stale results to show.
input.addEventListener("focus", () => {
  if (input.value.trim() && panel.innerHTML) setOpen(true);
});

document.addEventListener("keydown", (e) => {
  // Cmd/Ctrl+K from anywhere focuses the search input — matches
  // Nextra's global shortcut. Avoid hijacking the shortcut if the user
  // is typing in another text field.
  if (
    (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" &&
    !["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(
      document.activeElement?.tagName,
    )
  ) {
    e.preventDefault();
    input.focus();
    input.select();
    return;
  }
  // Cmd/Ctrl+K also works when the search input itself has focus
  // (Nextra parity).
  if (
    (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" &&
    document.activeElement === input
  ) {
    e.preventDefault();
    input.select();
    return;
  }
  if (e.key === "Escape" && panel.classList.contains("open")) {
    setOpen(false);
    input.blur();
    return;
  }
  if (!panel.classList.contains("open")) return;
  const items = panel.querySelectorAll(".search-result");
  if (!items.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIdx = (activeIdx + 1) % items.length;
    setActive(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIdx = (activeIdx - 1 + items.length) % items.length;
    setActive(items);
  } else if (e.key === "Enter" && activeIdx >= 0) {
    e.preventDefault();
    items[activeIdx].click();
  }
});

function setActive(items) {
  items.forEach((item, i) => {
    item.classList.toggle("active", i === activeIdx);
    if (i === activeIdx) item.scrollIntoView({ block: "nearest" });
  });
}

// Click outside the search box closes the panel.
document.addEventListener("mousedown", (e) => {
  if (!e.target.closest("#search")) setOpen(false);
});
