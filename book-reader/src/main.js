import { marked } from 'marked';

const BASE_PATH = '/phoenix-project';
const STORAGE_KEYS = {
  state: 'phoenix-reader-state-v2',
  preferences: 'phoenix-reader-preferences-v1',
};
const DEFAULT_STATE = {
  lastChapterId: null,
  positions: {},
};
const DEFAULT_PREFERENCES = {
  theme: 'night',
  fontSize: 'comfortable',
  lineWidth: 'focused',
  desktopSidebarHidden: false,
};
const PARTS = [
  { id: 'part-1', label: 'Part 1', start: 1, end: 16 },
  { id: 'part-2', label: 'Part 2', start: 17, end: 29 },
  { id: 'part-3', label: 'Part 3', start: 30, end: 35 },
];

let chapters = [];
let storyChapters = [];
let referenceChapters = [];
let currentChapter = null;
let currentChapterIndex = 0;
let currentNavigation = { previous: null, next: null };
let readerState = loadReaderState();
let readerPreferences = loadReaderPreferences();
let saveTimer = null;
let activeLoadToken = 0;
let isRestoringScroll = false;

const desktopQuery = window.matchMedia('(min-width: 1180px)');
const topMeta = document.getElementById('top-meta');
const chapterKicker = document.getElementById('chapter-kicker');
const chapterHeading = document.getElementById('chapter-heading');
const chapterDescription = document.getElementById('chapter-description');
const bookProgressLabel = document.getElementById('book-progress-label');
const chapterProgressLabel = document.getElementById('chapter-progress-label');
const progressBar = document.getElementById('progress-bar');
const tocSections = document.getElementById('toc-sections');
const contentArea = document.getElementById('content-area');
const readerContainer = document.getElementById('reader-container');
const menuToggle = document.getElementById('menu-toggle');
const menuToggleLabel = document.getElementById('menu-toggle-label');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeBtn = document.getElementById('close-menu');
const resumeCard = document.getElementById('resume-card');
const resumeButton = document.getElementById('resume-button');
const resumeTitle = document.getElementById('resume-title');
const resumeMeta = document.getElementById('resume-meta');
const prevBtn = document.getElementById('prev-chapter');
const nextBtn = document.getElementById('next-chapter');
const prevLabel = document.getElementById('prev-label');
const nextLabel = document.getElementById('next-label');
const segmentedControls = document.querySelectorAll('.segmented-control');

marked.setOptions({
  headerIds: false,
  mangle: false,
});

async function init() {
  applyPreferences();
  attachEventListeners();

  try {
    const response = await fetch(`${BASE_PATH}/chapters.json`);
    if (!response.ok) {
      throw new Error('Failed to load chapters');
    }

    chapters = normalizeChapters(await response.json());
    storyChapters = chapters.filter((chapter) => chapter.type === 'story');
    referenceChapters = chapters.filter((chapter) => chapter.type === 'reference');

    renderSidebar();
    updateResumeCard();

    const initialRoute = resolveInitialRoute();
    if (initialRoute.syncHash) {
      updateHash(initialRoute.chapter.id, true);
    }

    await loadChapterById(initialRoute.chapter.id, { restoreScroll: initialRoute.restoreScroll });
  } catch (error) {
    renderError('Unable to load the reader right now.');
    console.error(error);
  }
}

function attachEventListeners() {
  menuToggle.addEventListener('click', () => {
    if (desktopQuery.matches) {
      setDesktopSidebarHidden(!readerPreferences.desktopSidebarHidden);
      return;
    }

    toggleMenu(true);
  });

  closeBtn.addEventListener('click', () => {
    if (desktopQuery.matches) {
      setDesktopSidebarHidden(true);
      return;
    }

    toggleMenu(false);
  });

  overlay.addEventListener('click', () => toggleMenu(false));

  window.addEventListener('hashchange', () => {
    const chapterId = getHashChapterId();
    if (!chapterId) {
      return;
    }

    loadChapterById(chapterId, { restoreScroll: true });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggleMenu(false);
    }
  });

  readerContainer.addEventListener(
    'scroll',
    () => {
      if (!currentChapter || isRestoringScroll) {
        return;
      }

      updateProgressDisplay();
      queuePositionSave();
    },
    { passive: true }
  );

  prevBtn.addEventListener('click', () => {
    if (currentNavigation.previous) {
      navigateToChapter(currentNavigation.previous.id);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentNavigation.next) {
      navigateToChapter(currentNavigation.next.id);
    }
  });

  resumeButton.addEventListener('click', () => {
    if (readerState.lastChapterId) {
      navigateToChapter(readerState.lastChapterId, { closeMenu: true, restoreScroll: true });
    }
  });

  segmentedControls.forEach((control) => {
    control.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-value]');
      if (!button) {
        return;
      }

      const setting = control.dataset.setting;
      const nextValue = button.dataset.value;

      if (!setting || readerPreferences[setting] === nextValue) {
        return;
      }

      saveCurrentPosition(true);
      readerPreferences = {
        ...readerPreferences,
        [setting]: nextValue,
      };
      applyPreferences();
      persistPreferences();

      if (currentChapter && setting !== 'theme') {
        restoreChapterScroll(currentChapter.id, true);
      } else {
        updateProgressDisplay();
      }
    });
  });

  window.addEventListener('beforeunload', () => saveCurrentPosition(true));
  desktopQuery.addEventListener('change', () => {
    toggleMenu(false);
    applyPreferences();
  });
}

function normalizeChapters(rawChapters) {
  let storyIndex = 0;

  return rawChapters.map((chapter) => {
    const number = getChapterNumber(chapter);
    const isStory = number !== null;
    const part = isStory ? getPartMeta(number) : null;

    if (isStory) {
      storyIndex += 1;
    }

    return {
      ...chapter,
      number,
      type: isStory ? 'story' : 'reference',
      partId: part ? part.id : 'reference',
      partLabel: part ? part.label : 'Reference Guide',
      storyIndex: isStory ? storyIndex : null,
    };
  });
}

function getChapterNumber(chapter) {
  const match = chapter.id.match(/^chapter(\d+)_mm$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function getPartMeta(chapterNumber) {
  return PARTS.find((part) => chapterNumber >= part.start && chapterNumber <= part.end) ?? PARTS[PARTS.length - 1];
}

function resolveInitialRoute() {
  const hashChapter = getChapterById(getHashChapterId());
  if (hashChapter) {
    return {
      chapter: hashChapter,
      restoreScroll: true,
      syncHash: false,
    };
  }

  const savedChapter = getChapterById(readerState.lastChapterId);
  if (savedChapter) {
    return {
      chapter: savedChapter,
      restoreScroll: true,
      syncHash: true,
    };
  }

  return {
    chapter: chapters[0],
    restoreScroll: false,
    syncHash: true,
  };
}

function renderSidebar() {
  tocSections.innerHTML = '';

  const groups = [
    ...PARTS.map((part) => ({
      title: part.label,
      eyebrow: 'Story',
      meta: `Chapters ${part.start}-${part.end}`,
      items: chapters.filter((chapter) => chapter.partId === part.id),
    })).filter((group) => group.items.length > 0),
  ];

  if (referenceChapters.length > 0) {
    groups.push({
      title: 'Reference Guide',
      eyebrow: 'Reference',
      meta: `${referenceChapters.length} item${referenceChapters.length === 1 ? '' : 's'}`,
      items: referenceChapters,
    });
  }

  groups.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'toc-group';

    const header = document.createElement('div');
    header.className = 'toc-group__header';

    const headingWrap = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'toc-group__eyebrow';
    eyebrow.textContent = group.eyebrow;

    const heading = document.createElement('h3');
    heading.textContent = group.title;

    headingWrap.append(eyebrow, heading);

    const meta = document.createElement('p');
    meta.className = 'toc-group__meta';
    meta.textContent = group.meta;

    header.append(headingWrap, meta);

    const list = document.createElement('ul');
    list.className = 'chapter-list';

    group.items.forEach((chapter) => {
      const listItem = document.createElement('li');
      const button = document.createElement('button');
      const itemEyebrow = document.createElement('span');
      const itemTitle = document.createElement('span');
      const itemMeta = document.createElement('span');

      button.type = 'button';
      button.className = 'chapter-item';
      button.dataset.chapterId = chapter.id;
      button.addEventListener('click', () => navigateToChapter(chapter.id, { closeMenu: true, restoreScroll: true }));

      itemEyebrow.className = 'chapter-item__eyebrow';
      itemEyebrow.textContent = chapter.type === 'story' ? `Chapter ${chapter.number}` : 'Reference';

      itemTitle.className = 'chapter-item__title';
      itemTitle.textContent = chapter.title;

      itemMeta.className = 'chapter-item__meta';
      itemMeta.textContent =
        chapter.type === 'story'
          ? `${chapter.partLabel} - ${chapter.storyIndex} of ${storyChapters.length}`
          : 'Outside the main story lane';

      button.append(itemEyebrow, itemTitle, itemMeta);
      listItem.appendChild(button);
      list.appendChild(listItem);
    });

    section.append(header, list);
    tocSections.appendChild(section);
  });

  updateChapterActiveState();
}

function navigateToChapter(chapterId, options = {}) {
  const chapter = getChapterById(chapterId);
  if (!chapter) {
    return;
  }

  const { closeMenu = false, replace = false, restoreScroll = true } = options;
  if (closeMenu) {
    toggleMenu(false);
  }

  if (chapterId === getHashChapterId()) {
    loadChapterById(chapterId, { restoreScroll });
    return;
  }

  updateHash(chapterId, replace);
  if (replace) {
    loadChapterById(chapterId, { restoreScroll });
  }
}

function updateHash(chapterId, replace = false) {
  const nextUrl = `${window.location.pathname}${window.location.search}#${chapterId}`;
  if (replace) {
    history.replaceState(null, '', nextUrl);
    return;
  }

  window.location.hash = chapterId;
}

function getHashChapterId() {
  return window.location.hash.replace(/^#/, '');
}

async function loadChapterById(chapterId, options = {}) {
  const nextIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
  if (nextIndex === -1) {
    return;
  }

  await loadChapter(nextIndex, options);
}

async function loadChapter(index, options = {}) {
  const chapter = chapters[index];
  if (!chapter) {
    return;
  }

  const { restoreScroll = true } = options;
  const loadToken = ++activeLoadToken;

  currentChapterIndex = index;
  currentChapter = chapter;
  readerState.lastChapterId = chapter.id;
  persistReaderState();

  updateChapterHeader();
  updateResumeCard();
  updateChapterActiveState();
  updateNavigationControls();
  renderLoadingState();

  try {
    const response = await fetch(`${BASE_PATH}/${chapter.path}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch chapter: ${chapter.id}`);
    }

    const markdown = await response.text();
    if (loadToken !== activeLoadToken) {
      return;
    }

    contentArea.innerHTML = marked.parse(markdown);
    document.title = `${chapter.title} - The Phoenix Project`;
    restoreChapterScroll(chapter.id, restoreScroll);
  } catch (error) {
    if (loadToken !== activeLoadToken) {
      return;
    }

    renderError('Unable to load this chapter right now.');
    console.error(error);
  }
}

function updateChapterHeader() {
  if (!currentChapter) {
    return;
  }

  if (currentChapter.type === 'story') {
    chapterKicker.textContent = `${currentChapter.partLabel} - Chapter ${currentChapter.number} of ${storyChapters.length}`;
    chapterHeading.textContent = currentChapter.title;
    chapterDescription.textContent =
      'Your place is saved automatically on this device, and the table of contents is grouped by book part.';
    topMeta.textContent = `${currentChapter.partLabel} - Chapter ${currentChapter.number}`;
  } else {
    chapterKicker.textContent = 'Reference guide';
    chapterHeading.textContent = currentChapter.title;
    chapterDescription.textContent =
      'Reference material lives outside the main reading lane so the numbered chapters stay focused.';
    topMeta.textContent = 'Reference guide';
  }

  updateProgressDisplay();
}

function updateProgressDisplay() {
  if (!currentChapter) {
    return;
  }

  const chapterProgress = getCurrentProgressRatio();
  progressBar.style.width = `${Math.round(chapterProgress * 100)}%`;
  chapterProgressLabel.textContent = `Chapter progress: ${Math.round(chapterProgress * 100)}%`;

  if (currentChapter.type === 'story') {
    const bookProgress = ((currentChapter.storyIndex - 1) + chapterProgress) / storyChapters.length;
    bookProgressLabel.textContent = `Book progress: ${Math.round(bookProgress * 100)}%`;
  } else {
    bookProgressLabel.textContent = 'Book progress: Story complete';
  }
}

function getCurrentProgressRatio() {
  const maxScroll = readerContainer.scrollHeight - readerContainer.clientHeight;
  if (maxScroll <= 0) {
    return 1;
  }

  return clamp(readerContainer.scrollTop / maxScroll);
}

function updateNavigationControls() {
  currentNavigation = getNavigationTargets(currentChapter);

  prevBtn.disabled = !currentNavigation.previous;
  nextBtn.disabled = !currentNavigation.next;

  prevLabel.textContent = currentNavigation.previous ? currentNavigation.previous.title : 'Start of story';
  nextLabel.textContent = currentNavigation.next ? currentNavigation.next.title : 'End of story';
}

function getNavigationTargets(chapter) {
  if (!chapter) {
    return { previous: null, next: null };
  }

  if (chapter.type === 'story') {
    const storyIndex = storyChapters.findIndex((item) => item.id === chapter.id);
    return {
      previous: storyChapters[storyIndex - 1] ?? null,
      next: storyChapters[storyIndex + 1] ?? null,
    };
  }

  const referenceIndex = referenceChapters.findIndex((item) => item.id === chapter.id);
  return {
    previous:
      referenceIndex > 0
        ? referenceChapters[referenceIndex - 1]
        : storyChapters[storyChapters.length - 1] ?? null,
    next: referenceChapters[referenceIndex + 1] ?? null,
  };
}

function updateChapterActiveState() {
  const items = document.querySelectorAll('.chapter-item');
  items.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.chapterId === currentChapter?.id);
  });
}

function updateResumeCard() {
  const savedChapter = getChapterById(readerState.lastChapterId);
  if (!savedChapter) {
    resumeCard.hidden = true;
    return;
  }

  const savedRatio = clamp(Number(readerState.positions[savedChapter.id] ?? 0));
  const savedPercent = Math.round(savedRatio * 100);

  resumeCard.hidden = false;
  resumeTitle.textContent = savedChapter.title;

  if (savedChapter.type === 'story') {
    resumeMeta.textContent = `${savedChapter.partLabel} - Chapter ${savedChapter.number} of ${storyChapters.length} - ${savedPercent}% saved`;
  } else {
    resumeMeta.textContent = `${savedPercent}% saved in the reference guide`;
  }
}

function restoreChapterScroll(chapterId, shouldRestore) {
  const targetRatio = shouldRestore ? clamp(Number(readerState.positions[chapterId] ?? 0)) : 0;
  isRestoringScroll = true;

  requestAnimationFrame(() => {
    const maxScroll = readerContainer.scrollHeight - readerContainer.clientHeight;
    const nextTop = maxScroll > 0 ? targetRatio * maxScroll : 0;

    readerContainer.scrollTo({ top: nextTop, behavior: 'auto' });

    requestAnimationFrame(() => {
      isRestoringScroll = false;
      updateProgressDisplay();
      saveCurrentPosition(true);
    });
  });
}

function queuePositionSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveCurrentPosition(), 150);
}

function saveCurrentPosition(force = false) {
  if (!currentChapter) {
    return;
  }

  if (isRestoringScroll && !force) {
    return;
  }

  readerState.lastChapterId = currentChapter.id;
  readerState.positions[currentChapter.id] = Number(getCurrentProgressRatio().toFixed(4));
  persistReaderState();
  updateResumeCard();
}

function toggleMenu(show) {
  const shouldShow = show && !desktopQuery.matches;
  sidebar.classList.toggle('active', shouldShow);
  overlay.classList.toggle('active', shouldShow);
  document.body.classList.toggle('menu-open', shouldShow);
  updateMenuToggleState();
}

function setDesktopSidebarHidden(hidden) {
  readerPreferences = {
    ...readerPreferences,
    desktopSidebarHidden: hidden,
  };

  applyPreferences();
  persistPreferences();
}

function applyPreferences() {
  document.body.dataset.theme = readerPreferences.theme;
  document.body.dataset.fontSize = readerPreferences.fontSize;
  document.body.dataset.lineWidth = readerPreferences.lineWidth;
  document.body.classList.toggle('desktop-nav-hidden', desktopQuery.matches && readerPreferences.desktopSidebarHidden);

  segmentedControls.forEach((control) => {
    const setting = control.dataset.setting;
    const currentValue = readerPreferences[setting];

    control.querySelectorAll('button[data-value]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.value === currentValue);
    });
  });

  updateMenuToggleState();
}

function updateMenuToggleState() {
  const isDesktop = desktopQuery.matches;
  const mobileMenuOpen = sidebar.classList.contains('active');
  const desktopSidebarVisible = !readerPreferences.desktopSidebarHidden;

  if (isDesktop) {
    menuToggle.setAttribute('aria-label', desktopSidebarVisible ? 'Hide table of contents' : 'Show table of contents');
    menuToggle.setAttribute('aria-expanded', String(desktopSidebarVisible));
    menuToggleLabel.textContent = desktopSidebarVisible ? 'Hide Menu' : 'Show Menu';
    closeBtn.setAttribute('aria-label', 'Hide table of contents');
    return;
  }

  menuToggle.setAttribute('aria-label', 'Open table of contents');
  menuToggle.setAttribute('aria-expanded', String(mobileMenuOpen));
  menuToggleLabel.textContent = 'Navigate';
  closeBtn.setAttribute('aria-label', 'Close table of contents');
}

function renderLoadingState() {
  contentArea.innerHTML = '<div id="loading" class="vibrant-loader">Loading chapter...</div>';
}

function renderError(message) {
  contentArea.innerHTML = `<div class="error-state">${message}</div>`;
}

function getChapterById(chapterId) {
  return chapters.find((chapter) => chapter.id === chapterId);
}

function loadReaderState() {
  const saved = readStorage(STORAGE_KEYS.state);
  const positions = {};

  if (saved.positions && typeof saved.positions === 'object') {
    Object.entries(saved.positions).forEach(([chapterId, ratio]) => {
      const nextRatio = Number(ratio);
      if (!Number.isNaN(nextRatio)) {
        positions[chapterId] = clamp(nextRatio);
      }
    });
  }

  return {
    lastChapterId: typeof saved.lastChapterId === 'string' ? saved.lastChapterId : DEFAULT_STATE.lastChapterId,
    positions,
  };
}

function loadReaderPreferences() {
  const saved = readStorage(STORAGE_KEYS.preferences);

  return {
    theme: sanitizePreference(saved.theme, ['night', 'paper'], DEFAULT_PREFERENCES.theme),
    fontSize: sanitizePreference(saved.fontSize, ['compact', 'comfortable', 'large'], DEFAULT_PREFERENCES.fontSize),
    lineWidth: sanitizePreference(saved.lineWidth, ['focused', 'wide'], DEFAULT_PREFERENCES.lineWidth),
    desktopSidebarHidden: saved.desktopSidebarHidden === true,
  };
}

function sanitizePreference(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function persistReaderState() {
  writeStorage(STORAGE_KEYS.state, readerState);
}

function persistPreferences() {
  writeStorage(STORAGE_KEYS.preferences, readerPreferences);
}

function readStorage(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? '{}');
  } catch {
    return {};
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors so reading still works in private modes.
  }
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

init();
