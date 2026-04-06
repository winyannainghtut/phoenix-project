import { marked } from 'marked';

let chapters = [];
let currentChapterIndex = 0;

const chapterList = document.getElementById('chapter-list');
const contentArea = document.getElementById('content-area');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeBtn = document.getElementById('close-menu');
const prevBtn = document.getElementById('prev-chapter');
const nextBtn = document.getElementById('next-chapter');
const topTitle = document.getElementById('top-title');

// Initialize App
async function init() {
  try {
    const response = await fetch('/phoenix-project/chapters.json');
    if (!response.ok) throw new Error('Failed to load chapters');
    chapters = await response.json();
    renderSidebar();
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
  } catch (err) {
    contentArea.innerHTML = `<div class="error">အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့ပါသည်။ ကျေးဇူးပြု၍ ပြန်လည် ကြိုးစားကြည့်ပါ။</div>`;
    console.error(err);
  }
}

function handleRouting() {
  const hash = window.location.hash.slice(1);
  const foundIndex = chapters.findIndex(c => c.id === hash);
  loadChapter(foundIndex !== -1 ? foundIndex : 0);
}

function renderSidebar() {
  chapterList.innerHTML = '';
  chapters.forEach((chapter, index) => {
    const li = document.createElement('li');
    li.className = 'chapter-item';
    li.textContent = chapter.title;
    li.onclick = () => {
      window.location.hash = chapter.id;
      toggleMenu(false);
    };
    chapterList.appendChild(li);
  });
}

function updateChapterActiveState() {
  const items = document.querySelectorAll('.chapter-item');
  items.forEach((item, index) => {
    item.classList.toggle('active', index === currentChapterIndex);
  });
}

async function loadChapter(index) {
  currentChapterIndex = index;
  const chapter = chapters[index];
  
  if (!chapter) return;

  updateChapterActiveState();
  topTitle.textContent = chapter.title;
  contentArea.innerHTML = `<div id="loading" class="vibrant-loader">ဆောဖ်ဝဲလ် အခန်းများကို ဖတ်ရှုနေပါသည်...</div>`;

  try {
    const response = await fetch(`/phoenix-project/${chapter.path}`);
    if (!response.ok) throw new Error('Failed to fetch chapter content');
    const markdown = await response.json(); // Wait, the copy task puts it in public/content
    // Actually, Vite serves /content/chapter1_mm.md as text but fetch might need .text()
  } catch (err) {
      // Re-try with .text() if json() fails below
  }

  // Refined fetch logic
  try {
    const response = await fetch(`/phoenix-project/${chapter.path}`);
    const markdown = await response.text();
    contentArea.innerHTML = marked.parse(markdown);
    contentArea.scrollTop = 0;
    
    // Update Navigation Buttons
    prevBtn.disabled = currentChapterIndex === 0;
    nextBtn.disabled = currentChapterIndex === chapters.length - 1;
    
    // Auto-scroll reader to top
    document.getElementById('reader-container').scrollTop = 0;

  } catch (err) {
    contentArea.innerHTML = `<div class="error">အကြောင်းအရာ ပြသရန် အမှားတစ်ခု ရှိနေပါသည်။</div>`;
    console.error(err);
  }
}

// Menu Toggle
function toggleMenu(show) {
  sidebar.classList.toggle('active', show);
  overlay.classList.toggle('active', show);
}

menuToggle.addEventListener('click', () => toggleMenu(true));
closeBtn.addEventListener('click', () => toggleMenu(false));
overlay.addEventListener('click', () => toggleMenu(false));

// Nav Controls
prevBtn.addEventListener('click', () => {
  if (currentChapterIndex > 0) {
    window.location.hash = chapters[currentChapterIndex - 1].id;
  }
});

nextBtn.addEventListener('click', () => {
  if (currentChapterIndex < chapters.length - 1) {
    window.location.hash = chapters[currentChapterIndex + 1].id;
  }
});

init();
