// Prevent the browser from restoring a previous in-page position on refresh.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const navigationEntry = performance.getEntriesByType('navigation')[0];
const resetReloadPosition = () => {
  if (navigationEntry?.type !== 'reload') return;
  if (window.location.hash) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
};
resetReloadPosition();
window.addEventListener('pageshow', resetReloadPosition);

const siteHeader = document.querySelector('.site-header');
const brandMark = document.querySelector('.brand-mark');
const updateHeader = () => {
  const scrolled = window.scrollY > 24;
  siteHeader?.classList.toggle('is-scrolled', scrolled);
  if (brandMark) {
    brandMark.src = scrolled
      ? './images/logos/nook-icon-lime-transparent.svg'
      : './images/logos/nook-icon-blue-paper.svg';
  }
};
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

// Let the radial furniture pop in with a shuffled, gentle stagger every time it enters view.
const intro = document.querySelector('.intro');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const backToTopLink = document.querySelector('.closing-footer nav a[href="#top"]');
backToTopLink?.addEventListener('click', (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  history.pushState(null, '', `${window.location.pathname}${window.location.search}#top`);
  window.scrollTo({ top: 0, left: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
});
if (intro && !reducedMotion) {
  const objects = Array.from(intro.querySelectorAll('.intro-furniture'));
  const randomizeIntroOrder = () => {
    const order = objects.slice();
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }

    order.forEach((object, index) => {
      const delay = index * 78 + Math.floor(Math.random() * 55);
      const tilt = (Math.random() * 14 - 7).toFixed(1);
      object.style.setProperty('--pop-delay', `${delay}ms`);
      object.style.setProperty('--pop-tilt', `${tilt}deg`);
    });
  };
  let introInView = false;
  const showIntro = () => {
    if (intro.classList.contains('is-visible')) return;
    randomizeIntroOrder();
    requestAnimationFrame(() => {
      if (introInView) intro.classList.add('is-visible');
    });
  };

  intro.classList.add('has-pop-in');
  if ('IntersectionObserver' in window) {
    const introObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio >= 0.08) {
          introInView = true;
          showIntro();
        } else {
          introInView = false;
          intro.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    introObserver.observe(intro);
  } else {
    intro.classList.add('is-visible');
  }
}

const exploreLink = document.querySelector('.site-header nav a[href="#explore"]');
const exploreSection = document.getElementById('explore');
exploreLink?.addEventListener('click', (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  if (!exploreSection) return;

  const sectionRect = exploreSection.getBoundingClientRect();
  const headerHeight = siteHeader?.getBoundingClientRect().height ?? 0;
  const sectionCenter = window.scrollY + sectionRect.top + sectionRect.height / 2;
  const visibleCenter = headerHeight + (window.innerHeight - headerHeight) / 2;
  history.pushState(null, '', '#explore');
  window.scrollTo({
    top: Math.max(0, sectionCenter - visibleCenter),
    behavior: reducedMotion ? 'instant' : 'smooth',
  });
});

const catalogueLink = document.querySelector('.site-header nav a[href="#catalogue"]');
const catalogueSection = document.getElementById('catalogue');
catalogueLink?.addEventListener('click', (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  if (!catalogueSection) return;

  const sectionTop = window.scrollY + catalogueSection.getBoundingClientRect().top;
  const headerHeight = siteHeader?.getBoundingClientRect().height ?? 0;
  history.pushState(null, '', '#catalogue');
  window.scrollTo({
    top: Math.max(0, sectionTop - headerHeight),
    behavior: reducedMotion ? 'instant' : 'smooth',
  });
});

const compatibilityLink = document.querySelector('.site-header nav a[href="#compatibility"]');
const compatibilitySection = document.getElementById('compatibility');
compatibilityLink?.addEventListener('click', (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  if (!compatibilitySection) return;

  const sectionTop = window.scrollY + compatibilitySection.getBoundingClientRect().top;
  const headerHeight = siteHeader?.getBoundingClientRect().height ?? 0;
  history.pushState(null, '', '#compatibility');
  window.scrollTo({
    top: Math.max(0, sectionTop - headerHeight),
    behavior: reducedMotion ? 'instant' : 'smooth',
  });
});

const aboutLink = document.querySelector('.site-header nav a[href="#closing"]');
const closingSection = document.getElementById('closing');
const closingFooter = document.querySelector('.closing-footer');
const syncClosingHeight = () => {
  if (!closingSection) return;
  const headerHeight = siteHeader?.getBoundingClientRect().height ?? 0;
  const footerHeight = closingFooter?.getBoundingClientRect().height ?? 0;
  closingSection.style.setProperty('--closing-height', `${Math.max(0, window.innerHeight - headerHeight - footerHeight)}px`);
};
// The 1920 × 1080 recording contains a room render at x320–1583, y300–780.
// Frame y380–778 to keep the curtain near the top and the floor at the bottom.
// Cover the panel with that render, excluding the surrounding recorded canvas.
const syncClosingCrop = () => {
  const video = closingSection?.querySelector('.closing-video');
  if (!video) return;
  const scale = Math.max(closingSection.clientWidth / 1200, closingSection.clientHeight / 398);
  video.style.width = `${1920 * scale}px`;
  video.style.height = `${1080 * scale}px`;
};
syncClosingHeight();
syncClosingCrop();
if (closingSection && 'ResizeObserver' in window) {
  new ResizeObserver(syncClosingCrop).observe(closingSection);
  const closingLayoutObserver = new ResizeObserver(syncClosingHeight);
  if (closingFooter) closingLayoutObserver.observe(closingFooter);
  if (siteHeader) closingLayoutObserver.observe(siteHeader);
}
window.addEventListener('resize', syncClosingHeight);
window.visualViewport?.addEventListener('resize', syncClosingHeight);
aboutLink?.addEventListener('click', (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  if (!closingSection) return;

  const sectionRect = closingSection.getBoundingClientRect();
  const headerHeight = siteHeader?.getBoundingClientRect().height ?? 0;
  const sectionTop = window.scrollY + sectionRect.top;
  history.pushState(null, '', '#closing');
  window.scrollTo({
    top: Math.max(0, sectionTop - headerHeight),
    behavior: reducedMotion ? 'instant' : 'smooth',
  });
});

const compatibility = document.querySelector('.compatibility');
if (compatibility) {
  const toggleButtons = Array.from(compatibility.querySelectorAll('[data-preview-view]'));
  const viewLabel = compatibility.querySelector('.compatibility-view-label');
  toggleButtons.forEach((button) => button.addEventListener('click', () => {
    const view = button.dataset.previewView;
    if (view !== '2d' && view !== '3d') return;
    compatibility.dataset.view = view;
    toggleButtons.forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
    viewLabel.textContent = view === '3d' ? '3D view' : '2D floor plan';
    const image3d = compatibility.querySelector('.compatibility-image-3d');
    const image2d = compatibility.querySelector('.compatibility-image-2d');
    image3d?.classList.toggle('is-active', view === '3d');
    image2d?.classList.toggle('is-active', view === '2d');
    image3d?.setAttribute('aria-hidden', String(view !== '3d'));
    image2d?.setAttribute('aria-hidden', String(view !== '2d'));
  }));
}

const closingVideo = document.querySelector('.closing-video');
if (closingVideo) {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let closingVisible = !('IntersectionObserver' in window);
  const syncClosingVideo = () => {
    if (closingVisible && !motionPreference.matches && !document.hidden) {
      closingVideo.play().catch(() => {});
    } else {
      closingVideo.pause();
    }
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      closingVisible = entries.some((entry) => entry.isIntersecting);
      syncClosingVideo();
    }, { threshold: 0.1 }).observe(closingVideo.closest('.closing'));
  }
  motionPreference.addEventListener('change', syncClosingVideo);
  document.addEventListener('visibilitychange', syncClosingVideo);
  syncClosingVideo();
}
