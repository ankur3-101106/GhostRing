/**
 * GhostRing Documentation Client JavaScript
 * Interactive theme switcher, mobile navigation drawer, code copy buttons,
 * active TOC scroll spy, and real-time fuzzy search.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Theme Management
  // ---------------------------------------------------------------------------
  const themeToggle = document.getElementById('theme-toggle');

  function getActiveTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ghostring_docs_theme', theme);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = getActiveTheme();
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Mobile Sidebar Drawer
  // ---------------------------------------------------------------------------
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('docs-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  function openSidebar() {
    if (sidebar && backdrop) {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSidebar() {
    if (sidebar && backdrop) {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', openSidebar);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }

  // ---------------------------------------------------------------------------
  // 3. Code Block Copy Buttons
  // ---------------------------------------------------------------------------
  document.querySelectorAll('.copy-code-button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const container = btn.closest('.code-block-container');
      if (!container) return;
      const codeElem = container.querySelector('pre code');
      if (!codeElem) return;

      const codeText = codeElem.innerText;

      try {
        await navigator.clipboard.writeText(codeText);
        btn.classList.add('copied');
        setTimeout(() => {
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard', err);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. In-Page Table of Contents Scroll Spy
  // ---------------------------------------------------------------------------
  const tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length > 0) {
    const headings = Array.from(
      document.querySelectorAll('.markdown-body h2, .markdown-body h3')
    ).filter((h) => h.id);

    if (headings.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              tocLinks.forEach((link) => {
                if (link.getAttribute('href') === `#${id}`) {
                  link.classList.add('active');
                } else {
                  link.classList.remove('active');
                }
              });
            }
          });
        },
        {
          rootMargin: '-80px 0px -70% 0px',
          threshold: 0,
        }
      );

      headings.forEach((h) => observer.observe(h));
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Real-Time Search Modal
  // ---------------------------------------------------------------------------
  const searchModal = document.getElementById('search-modal');
  const searchTrigger = document.getElementById('search-trigger-btn');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear-btn');
  const searchResults = document.getElementById('search-results');
  let selectedIndex = -1;

  function openSearch() {
    if (!searchModal) return;
    searchModal.classList.add('active');
    searchModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (searchInput) {
      searchInput.value = '';
      renderSearchResults('');
      setTimeout(() => searchInput.focus(), 50);
    }
  }

  function closeSearch() {
    if (!searchModal) return;
    searchModal.classList.remove('active');
    searchModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (searchTrigger) {
    searchTrigger.addEventListener('click', openSearch);
  }

  if (searchModal) {
    searchModal.querySelector('.search-modal-backdrop')?.addEventListener('click', closeSearch);
  }

  // Keyboard shortcut: Ctrl+K or Cmd+K or "/"
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchModal && searchModal.classList.contains('active')) {
        closeSearch();
      } else {
        openSearch();
      }
    } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && searchModal && searchModal.classList.contains('active')) {
      closeSearch();
    }
  });

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        renderSearchResults('');
      }
    });
  }

  function highlightMatches(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark style="background:rgba(0,242,254,0.3); color:inherit; border-radius:2px; padding:0 2px;">$1</mark>');
  }

  function searchInIndex(query) {
    if (!window.GHOSTRING_SEARCH_INDEX) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches = [];

    window.GHOSTRING_SEARCH_INDEX.forEach((doc) => {
      let score = 0;
      let matchedHeading = null;

      // Title match (high score)
      if (doc.title.toLowerCase().includes(q)) {
        score += 50;
      }

      // Category match
      if (doc.category.toLowerCase().includes(q)) {
        score += 20;
      }

      // Heading match
      if (doc.headings) {
        for (const h of doc.headings) {
          if (h.title.toLowerCase().includes(q)) {
            score += 30;
            if (!matchedHeading) matchedHeading = h;
          }
        }
      }

      // Excerpt match
      if (doc.excerpt && doc.excerpt.toLowerCase().includes(q)) {
        score += 10;
      }

      if (score > 0) {
        matches.push({
          doc,
          score,
          matchedHeading,
        });
      }
    });

    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  function renderSearchResults(query) {
    if (!searchResults) return;
    selectedIndex = -1;

    if (!query.trim()) {
      if (searchClear) searchClear.classList.remove('visible');
      searchResults.innerHTML = '<div class="search-initial-state">Type a keyword to search documentation...</div>';
      return;
    }

    if (searchClear) searchClear.classList.add('visible');

    const matches = searchInIndex(query);

    if (matches.length === 0) {
      searchResults.innerHTML = `<div class="search-no-results">No documentation matching "<strong>${query}</strong>"</div>`;
      return;
    }

    let html = '';
    matches.slice(0, 15).forEach((m, idx) => {
      const doc = m.doc;
      const targetUrl = m.matchedHeading
        ? `${doc.url}#${m.matchedHeading.id}`
        : doc.url;
      const titleHighlighted = highlightMatches(doc.title, query);
      const headingText = m.matchedHeading
        ? `<div class="search-result-heading">Section: ${highlightMatches(m.matchedHeading.title, query)}</div>`
        : '';
      const excerptHighlighted = highlightMatches(doc.excerpt || '', query);

      html += `
        <a href="${targetUrl}" class="search-result-item" data-index="${idx}">
          <div class="search-result-header">
            <span class="search-result-title">${titleHighlighted}</span>
            <span class="search-result-cat">${doc.category}</span>
          </div>
          ${headingText}
          <div class="search-result-excerpt">${excerptHighlighted}</div>
        </a>
      `;
    });

    searchResults.innerHTML = html;
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      const items = searchResults ? searchResults.querySelectorAll('.search-result-item') : [];
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelectedResult(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelectedResult(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          items[selectedIndex].click();
        } else if (items[0]) {
          items[0].click();
        }
      }
    });
  }

  function updateSelectedResult(items) {
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }
})();
