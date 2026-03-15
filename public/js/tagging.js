/**
 * Intelligent Tagging System for Arte Digital Data
 * Supports @mentions for Users, Posts, and Events
 */

/**
 * Global helper to format text with @mentions
 * Converts @username to clickable blue links
 */
function formatMentions(text) {
  if (!text) return '';
  
  // Replace URLs with clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let formattedText = text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 underline hover:text-cyan-300 break-all">${url}</a>`;
  });

  // Regex to find @mentions (words starting with @ followed by alphanumeric)
  return formattedText.replace(/@(\w+)/g, (match, username) => {
    return `<a href="profile.html?user=${username}" class="text-cyan-400 font-bold hover:underline">@${username}</a>`;
  });
}

// Ensure it's available globally immediately
window.formatMentions = formatMentions;

class TaggingSystem {
  constructor(element, options = {}) {
    this.element = element;
    this.options = options;
    this.menu = null;
    this.active = false;
    this.query = '';
    this.selectedIndex = 0;
    this.results = [];

    this.init();
  }

  init() {
    this.element.addEventListener('input', (e) => this.handleInput(e));
    this.element.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.menu && !this.menu.contains(e.target) && e.target !== this.element) {
        this.closeMenu();
      }
    });
  }

  handleInput(e) {
    const text = this.element.value;
    const pos = this.element.selectionStart;
    const beforeCursor = text.slice(0, pos);
    const lastWord = beforeCursor.split(/\s/).pop();

    if (lastWord.startsWith('@')) {
      this.active = true;
      this.query = lastWord.slice(1);
      this.showMenu();
      this.fetchSuggestions();
    } else {
      this.closeMenu();
    }
  }

  handleKeyDown(e) {
    if (!this.active) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
      this.renderMenu();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
      this.renderMenu();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (this.results.length > 0) {
        e.preventDefault();
        this.selectItem(this.results[this.selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      this.closeMenu();
    }
  }

  async fetchSuggestions() {
    if (!this.active) return;
    
    this.menu.innerHTML = `<div class="p-4 text-xs text-gray-400 flex items-center gap-2">
      <i class="fas fa-spinner fa-spin text-cyan-500"></i> Buscando...
    </div>`;

    try {
      const res = await fetch(`${CONFIG.API_URL}/tagging?q=${encodeURIComponent(this.query)}`);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor devolvió HTML en vez de JSON. ¿Reiniciaste el server?");
      }

      this.results = await res.json();
      this.selectedIndex = 0;
      this.renderMenu();
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      this.menu.innerHTML = `<div class="p-4 text-xs text-red-100 bg-red-500/20 md:rounded-xl">
        <i class="fas fa-exclamation-circle mr-2"></i>
        ${err.message.includes('token') ? 'Error de conexión. Reiniciá el servidor.' : err.message}
      </div>`;
    }
  }

  showMenu() {
    if (!this.menu) {
      this.menu = document.createElement('div'); // Create menu element if it doesn't exist
      this.menu.className = 'tagging-menu fixed z-[999999] bg-[#0d0d12] border-2 border-cyan-500/50 rounded-xl shadow-[0_0_50px_rgba(0,245,255,0.3)] overflow-hidden min-w-[280px] backdrop-blur-xl block';
      document.body.appendChild(this.menu);
    }
    this.menu.style.display = 'block'; // Explicitly set display to block
    this.positionMenu();
  }

  positionMenu() {
    const rect = this.element.getBoundingClientRect();
    const menuHeight = 200; // estimated
    const spaceBelow = window.innerHeight - rect.bottom;
    
    // If not enough space below, show above
    if (spaceBelow < menuHeight) {
      this.menu.style.bottom = `${window.innerHeight - rect.top + 5}px`;
      this.menu.style.top = 'auto';
    } else {
      this.menu.style.top = `${rect.bottom + 5}px`;
      this.menu.style.bottom = 'auto';
    }
    
    this.menu.style.left = `${rect.left}px`;
  }

  renderMenu() {
    if (!this.active || this.results.length === 0) {
      if (this.results.length === 0 && this.query) {
         this.menu.innerHTML = `<div class="p-3 text-xs text-gray-500">No se encontraron resultados</div>`;
      } else {
         this.closeMenu();
         return;
      }
    }

    this.menu.innerHTML = this.results.map((item, index) => `
      <div onclick="window.taggingInstances.get('${this.element.id}').selectItemByIndex(${index})" 
           class="tagging-row p-3 cursor-pointer flex items-center gap-3 transition-colors ${index === this.selectedIndex ? 'selected bg-cyan-500/20 text-cyan-400' : 'text-gray-300 hover:bg-white/5'}">
        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
           <i class="fas ${this.getIcon(item.type)} text-xs"></i>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-bold">${item.label}</span>
          <span class="text-[10px] uppercase opacity-50">${item.type}</span>
        </div>
      </div>
    `).join('');
  }

  getIcon(type) {
    switch (type) {
      case 'user': return 'fa-user';
      case 'post': return 'fa-palette';
      case 'event': return 'fa-calendar-alt';
      default: return 'fa-tag';
    }
  }

  selectItemByIndex(index) {
     this.selectItem(this.results[index]);
  }

  selectItem(item) {
    const text = this.element.value;
    const pos = this.element.selectionStart;
    const beforeCursor = text.slice(0, pos);
    const afterCursor = text.slice(pos);
    
    const words = beforeCursor.split(/\s/);
    words.pop(); // Remove the typed @query
    
    // If it's a user, we use @username. If it's a post/event, we use @[Title]
    // Note: Backend might need to handle @[Id] or similar if we want robust linking,
    // but for now plain @username or @Title is what the user seems to want for mentions.
    const replacement = `@${item.label} `;
    
    const newText = words.join(' ') + (words.length > 0 ? ' ' : '') + replacement + afterCursor;
    this.element.value = newText;
    
    // Restore focus and cursor position
    const newPos = (words.join(' ') + (words.length > 0 ? ' ' : '') + replacement).length;
    this.element.setSelectionRange(newPos, newPos);
    this.element.focus();
    
    this.closeMenu();
  }

  closeMenu() {
    this.active = false;
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
  }
}

// Global helper to initialize tagging
window.taggingInstances = new Map();
function enableTagging(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    const instance = new TaggingSystem(el);
    window.taggingInstances.set(elementId, instance);
  }
}

console.log("Tagging system and formatMentions loaded correctly.");
