(() => {
  'use strict';

  // ---- Elements ----
  const progressBar = document.getElementById('progressBar');
  const backToTop = document.getElementById('backToTop');
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const searchStatus = document.getElementById('searchStatus');
  const emptySearch = document.getElementById('emptySearch');

  const sections = Array.from(document.querySelectorAll('.study-section'));
  const tocLinks = Array.from(document.querySelectorAll('.toc-link, .toc-sublink'));

  // ---- Mobile Sidebar Drawer ----
  function setSidebarOpen(open) {
    sidebar.classList.toggle('open', open);
    sidebarBackdrop.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  menuBtn.addEventListener('click', () => {
    setSidebarOpen(!sidebar.classList.contains('open'));
  });

  sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));

  tocLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        setSidebarOpen(false);
      }
    });
  });

  // ---- Reading Progress & Scroll-Spy ----
  const spyTargets = Array.from(
    document.querySelectorAll('.study-section[id], .period-card[id]')
  );

  function onScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
    progressBar.style.width = `${pct}%`;

    backToTop.classList.toggle('visible', scrollTop > 400);

    // Determine active section/period
    let currentId = spyTargets[0]?.id || '';
    const offset = 130;
    for (const el of spyTargets) {
      if (el.classList.contains('hidden-by-search')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= offset) {
        currentId = el.id;
      }
    }

    tocLinks.forEach((link) => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === `#${currentId}`);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- Search & Highlight ----
  function clearHighlights(root) {
    const marks = root.querySelectorAll('mark.search-hit');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
  }

  function highlightTextNodes(root, regex) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement?.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      regex.lastIndex = 0;
      if (!regex.test(text)) return;

      regex.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = match[0];
        frag.appendChild(mark);
        lastIdx = regex.lastIndex;
      }

      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }

      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function runSearch() {
    const query = searchInput.value.trim();
    searchClear.classList.toggle('visible', query.length > 0);

    sections.forEach((sec) => {
      clearHighlights(sec);
      sec.classList.remove('hidden-by-search');
      sec.querySelectorAll('.period-card').forEach((c) => c.classList.remove('hidden-by-search'));
    });

    if (!query) {
      searchStatus.textContent = '';
      emptySearch.classList.remove('visible');
      onScroll();
      return;
    }

    const qLower = query.toLowerCase();
    const regex = new RegExp(escapeRegex(query), 'gi');
    let visibleSections = 0;

    sections.forEach((sec) => {
      const periodCards = Array.from(sec.querySelectorAll('.period-card'));
      if (periodCards.length > 1) {
        // Filter individual period cards inside multi-period eras
        const headerText = sec.querySelector('.section-header')?.textContent.toLowerCase() || '';
        const headerMatches = headerText.includes(qLower);
        let anyCardVisible = false;

        periodCards.forEach((card) => {
          const matches = headerMatches || card.textContent.toLowerCase().includes(qLower);
          card.classList.toggle('hidden-by-search', !matches);
          if (matches) anyCardVisible = true;
        });

        sec.classList.toggle('hidden-by-search', !anyCardVisible);
        if (anyCardVisible) {
          visibleSections++;
          highlightTextNodes(sec, regex);
        }
      } else {
        const matches = sec.textContent.toLowerCase().includes(qLower);
        sec.classList.toggle('hidden-by-search', !matches);
        if (matches) {
          visibleSections++;
          highlightTextNodes(sec, regex);
        }
      }
    });

    searchStatus.textContent =
      visibleSections === 1 ? '1 unit matches' : `${visibleSections} units match`;
    emptySearch.classList.toggle('visible', visibleSections === 0);
    onScroll();
  }

  searchInput.addEventListener('input', runSearch);
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    runSearch();
    searchInput.focus();
  });

  // Press '/' to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // ---- Image Zoom Box (Lightbox) ----
  const lightbox = document.getElementById('lightbox');
  const lbStage = document.getElementById('lbStage');
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  const lbCloseBtn = document.getElementById('lbCloseBtn');
  const lbZoomBtn = document.getElementById('lbZoomBtn');
  const lbPrevBtn = document.getElementById('lbPrevBtn');
  const lbNextBtn = document.getElementById('lbNextBtn');

  const zoomTriggers = Array.from(document.querySelectorAll('[data-zoom]'));
  const gallery = zoomTriggers.map((wrap) => {
    const img = wrap.querySelector('img');
    const fig = wrap.closest('figure');
    const caption = fig?.querySelector('figcaption')?.textContent.trim() || img.alt || '';
    return { src: img.getAttribute('src'), alt: img.alt, caption };
  });

  let activeIndex = 0;

  function setZoomed(zoomed) {
    lbStage.classList.toggle('zoomed', zoomed);
    lbZoomBtn.textContent = zoomed ? 'Reset Zoom' : 'Zoom';
  }

  function showLightbox(index) {
    activeIndex = (index + gallery.length) % gallery.length;
    const item = gallery[activeIndex];
    lbImg.src = item.src;
    lbImg.alt = item.alt;
    lbCaption.textContent = `${item.caption} (${activeIndex + 1} / ${gallery.length})`;
    setZoomed(false);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    setZoomed(false);
  }

  zoomTriggers.forEach((wrap, idx) => {
    wrap.addEventListener('click', () => showLightbox(idx));
  });

  lbCloseBtn.addEventListener('click', closeLightbox);
  lbPrevBtn.addEventListener('click', () => showLightbox(activeIndex - 1));
  lbNextBtn.addEventListener('click', () => showLightbox(activeIndex + 1));

  lbZoomBtn.addEventListener('click', () => {
    setZoomed(!lbStage.classList.contains('zoomed'));
  });

  lbImg.addEventListener('click', () => {
    setZoomed(!lbStage.classList.contains('zoomed'));
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === lbStage) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightbox(activeIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(activeIndex + 1);
  });
})();
