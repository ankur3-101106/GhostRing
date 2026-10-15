#!/usr/bin/env python3
"""
GhostRing Documentation Generator
Converts docs/*.md into a fully integrated, beautifully formatted, modern HTML documentation site.
"""

import os
import re
import json
import shutil
import html
import markdown
from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer
from pygments.formatters import HtmlFormatter

# Base paths
DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT_DIR = os.path.abspath(os.path.join(DOCS_DIR, ".."))
ASSETS_DIR = os.path.join(DOCS_DIR, "assets")
SOURCES_DIR = os.path.join(os.path.dirname(__file__), "doc_sources")

# Documentation categories in canonical reading order
DOC_CATEGORIES = [
    {
        "category": "Foundational Architecture & Environment",
        "badge": "01 Architecture",
        "items": [
            ("architecture-overview.md", "architecture-overview.html", "Architecture Overview", "Comprehensive overview of the 3-crate workspace architecture, crate boundaries, and end-to-end telemetry pipeline."),
            ("development-environment.md", "development-environment.html", "Development Environment", "System requirements (Linux 5.8+, BTF), in-repository isolated toolchain (.build-env/), automated bootstrap script, and verification."),
            ("ebpf-fundamentals.md", "ebpf-fundamentals.html", "eBPF Fundamentals", "Core eBPF principles, execution model, probe types, memory safety, and kernel verifier requirements."),
            ("kernel-instrumentation.md", "kernel-instrumentation.html", "Kernel Instrumentation", "Ring 0 execution path interception, tracepoints, kprobes, context extraction, and kernel safety guarantees.")
        ]
    },
    {
        "category": "Kernel Space & eBPF Engineering",
        "badge": "02 Kernel Space",
        "items": [
            ("ebpf-internals.md", "ebpf-internals.html", "eBPF Internals & Bytecode", "eBPF instruction set architecture (ISA), register conventions, verifier static analysis, ELF layout, and JIT compilation."),
            ("aya-framework.md", "aya-framework.html", "Aya Framework", "Deep dive into the pure-Rust Aya ecosystem, ELF loading, map abstractions, and helper bindings."),
            ("btf-co-re-deep-dive.md", "btf-co-re-deep-dive.html", "BTF & CO-RE Deep Dive", "BPF Type Format (BTF) structure, Compile Once, Run Everywhere (CO-RE) field relocations, and kernel portability."),
            ("ghostring-common-structs.md", "ghostring-common-structs.html", "ghostring-common Structs", "C-compatible #[repr(C)] memory layouts, alignment constraints, scalar type mappings, and cross-boundary ABI stability.")
        ]
    },
    {
        "category": "Telemetry & User Space Pipeline",
        "badge": "03 Telemetry",
        "items": [
            ("event-transport.md", "event-transport.html", "Event Transport", "Telemetry transmission mechanics from Ring 0 to user space via PerfEventArray ring buffers."),
            ("perf-buffer-internals.md", "perf-buffer-internals.html", "Perf Buffer Internals", "Low-level ring buffer memory layout, mmap headers, head/tail pointer synchronization, per-CPU ring handling, and backpressure management."),
            ("ghostring-user-daemon.md", "ghostring-user-daemon.html", "ghostring User Daemon", "Asynchronous Tokio daemon architecture, per-CPU buffer polling loop, CLI options, event filtering, and structured logging.")
        ]
    },
    {
        "category": "Security, Compliance & Governance",
        "badge": "04 Security & Compliance",
        "items": [
            ("security-requirements.md", "security-requirements.html", "Security Requirements", "Ring 0 zero-trust observability advantages, tamper resistance, and kernel licensing requirements."),
            ("security-model-deep-dive.md", "security-model-deep-dive.html", "Security Model Deep Dive", "Threat model, evasion countermeasures, kernel rootkit resistance, and defense-in-depth principles."),
            ("license-compliance-deep.md", "license-compliance-deep.html", "License Compliance Deep Dive", "GNU General Public License v3.0 (GPLv3) compliance analysis, Linux kernel verifier license checking, and BPF helper access.")
        ]
    },
    {
        "category": "Quality Assurance, Operations & Roadmap",
        "badge": "05 Operations & QA",
        "items": [
            ("build-system-workspace.md", "build-system-workspace.html", "Build System & Workspace", "Root Cargo workspace configuration, compilation targets (bpfel-unknown-none), bpf-linker integration, and CI/CD pipelines."),
            ("testing-strategy.md", "testing-strategy.html", "Testing Strategy", "Four-layer testing pyramid (unit, struct layout, integration, and E2E testing), benchmark suites, and release quality gates."),
            ("troubleshooting-guide.md", "troubleshooting-guide.html", "Troubleshooting Guide", "Diagnostic workflows and solutions for 19 common build, verifier, permission, and runtime errors."),
            ("roadmap-features-deep.md", "roadmap-features-deep.html", "Roadmap Features Deep Dive", "Architectural blueprints for advanced path extraction, socket observability, and File Integrity Monitoring.")
        ]
    }
]

# Sequential list of all articles
ALL_ARTICLES = [
    {
        "src_file": "README.md",
        "target_file": "index.html",
        "title": "Documentation Overview",
        "nav_title": "Overview & Hub",
        "category": "Overview",
        "desc": "Technical documentation suite and architecture reference for the GhostRing eBPF telemetry engine."
    }
]

for cat in DOC_CATEGORIES:
    for src_file, target_file, nav_title, desc in cat["items"]:
        ALL_ARTICLES.append({
            "src_file": src_file,
            "target_file": target_file,
            "title": nav_title,
            "nav_title": nav_title,
            "category": cat["category"],
            "desc": desc
        })

CALLOUT_ICONS = {
    "NOTE": '<svg class="callout-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    "TIP": '<svg class="callout-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7v1.3h8v-1.3A7 7 0 0 0 12 2z"></path></svg>',
    "IMPORTANT": '<svg class="callout-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    "WARNING": '<svg class="callout-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    "CAUTION": '<svg class="callout-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
}

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text.strip('-')

def highlight_code_block(code, lang):
    lang_clean = lang.strip().lower() if lang else ""
    alias_map = {
        "rs": "rust",
        "sh": "bash",
        "shell": "bash",
        "zsh": "bash",
        "yml": "yaml",
        "txt": "text",
        "asm": "nasm",
        "assembly": "nasm",
        "c": "c",
        "toml": "toml",
        "json": "json",
        "docker": "dockerfile"
    }
    lexer_name = alias_map.get(lang_clean, lang_clean)
    try:
        if lexer_name:
            lexer = get_lexer_by_name(lexer_name)
        else:
            lexer = TextLexer()
    except Exception:
        lexer = TextLexer()

    formatter = HtmlFormatter(nowrap=True)
    highlighted = highlight(code, lexer, formatter)
    return highlighted

def preprocess_markdown(text):
    """
    Handle GitHub callouts (> [!NOTE]), checklists, and relative link conversions.
    """
    # 1. Transform GitHub-style blockquote alerts:
    def replace_alert(match):
        alert_type = match.group(1).upper()
        content = match.group(2)
        lines = [re.sub(r'^>\s?', '', line) for line in content.splitlines()]
        clean_content = '\n'.join(lines).strip()
        type_lower = alert_type.lower()
        title_map = {
            "NOTE": "Note",
            "TIP": "Tip",
            "IMPORTANT": "Important",
            "WARNING": "Warning",
            "CAUTION": "Caution"
        }
        title = title_map.get(alert_type, alert_type.capitalize())
        icon_svg = CALLOUT_ICONS.get(alert_type, CALLOUT_ICONS["NOTE"])
        
        # Render markdown inside callout
        inner_html = markdown.markdown(clean_content, extensions=['extra', 'sane_lists'])

        return f'''<div class="callout callout-{type_lower}">
  <div class="callout-header">
    {icon_svg}
    <span class="callout-title">{title}</span>
  </div>
  <div class="callout-body">
    {inner_html}
  </div>
</div>\n'''

    alert_pattern = re.compile(r'^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\r\n]*\r?\n((?:>.*(?:\r?\n|$))+)', re.MULTILINE)
    text = alert_pattern.sub(replace_alert, text)

    # 2. Checkboxes in lists
    text = re.sub(r'^- \[x\]\s+(.+)$', r'- <span class="task-item checked"><span class="task-box">✓</span> \1</span>', text, flags=re.MULTILINE)
    text = re.sub(r'^- \[ \]\s+(.+)$', r'- <span class="task-item unchecked"><span class="task-box"></span> \1</span>', text, flags=re.MULTILINE)

    # 3. Transform relative markdown links:
    def replace_md_link(match):
        label = match.group(1)
        url = match.group(2)
        anchor = ""
        if "#" in url:
            url, anchor = url.split("#", 1)
            anchor = "#" + anchor
        
        url_clean = os.path.basename(url)
        if url_clean == "README.md":
            new_url = "index.html" + anchor
        elif url_clean.endswith(".md"):
            new_url = url_clean[:-3] + ".html" + anchor
        else:
            new_url = url + anchor
        return f"[{label}]({new_url})"

    text = re.sub(r'\[([^\]]+)\]\(([^)]+\.md(?:#[^)]*)?)\)', replace_md_link, text)

    return text

def postprocess_html(rendered_html, is_index=False):
    """
    Wrap tables in responsive wrappers, style code blocks with headers and copy buttons,
    generate heading permalinks, and inject hero cards on the index page.
    """
    # Wrap tables
    rendered_html = re.sub(r'(<table>.*?</table>)', r'<div class="table-responsive">\1</div>', rendered_html, flags=re.DOTALL)

    # Process code blocks
    def process_code_block(match):
        code_tag_attrs = match.group(1)
        code_content = match.group(2)
        lang_match = re.search(r'class="[^"]*language-([^"\s]+)', code_tag_attrs)
        raw_lang = lang_match.group(1) if lang_match else ""
        
        unescaped_code = html.unescape(code_content)
        highlighted = highlight_code_block(unescaped_code, raw_lang)
        display_lang = raw_lang.upper() if raw_lang else "CODE"

        return f'''<div class="code-block-container" data-lang="{html.escape(display_lang)}">
  <div class="code-block-header">
    <div class="code-lang-tag">
      <span class="code-icon"></span>
      <span class="code-lang-name">{html.escape(display_lang)}</span>
    </div>
    <button class="copy-code-button" type="button" aria-label="Copy code">
      <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      <span class="copy-feedback">Copied!</span>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <pre class="highlight-pre"><code>{highlighted}</code></pre>
</div>'''

    code_block_pattern = re.compile(r'<pre><code([^>]*)>(.*?)</code></pre>', re.DOTALL)
    rendered_html = code_block_pattern.sub(process_code_block, rendered_html)

    # Extract headings and insert anchor permalinks
    headings = []
    def process_heading(match):
        level = int(match.group(1))
        attrs = match.group(2)
        content = match.group(3)
        
        id_match = re.search(r'id="([^"]+)"', attrs)
        if id_match:
            heading_id = id_match.group(1)
        else:
            clean_text = re.sub(r'<[^>]+>', '', content)
            heading_id = slugify(clean_text)
            attrs = f'{attrs} id="{heading_id}"'
        
        clean_title = re.sub(r'<[^>]+>', '', content).strip()
        if level in (2, 3):
            headings.append({
                "level": level,
                "id": heading_id,
                "title": clean_title
            })
        
        anchor_link = f'<a href="#{heading_id}" class="heading-anchor" aria-label="Permalink to {clean_title}">#</a>'
        return f'<h{level}{attrs}>{content} {anchor_link}</h{level}>'

    heading_pattern = re.compile(r'<h([1-6])([^>]*)>(.*?)</h\1>', re.DOTALL)
    rendered_html = heading_pattern.sub(process_heading, rendered_html)

    # If this is the index page, prepend a beautiful Hero and quick cards
    if is_index:
        hero_html = '''
        <div class="docs-hero">
          <div class="hero-badge">
            <span class="hero-badge-dot"></span>
            <span>GhostRing v0.1.0 • Technical Documentation Suite</span>
          </div>
          <h1 class="hero-title">Ring 0 eBPF Telemetry Engine</h1>
          <p class="hero-subtitle">
            GhostRing is a modern, high-performance security observability subsystem written in pure Rust with Aya. 
            Engineered with a strict 3-crate workspace architecture to deliver non-blocking, zero-trust system event auditing with kernel verifier safety.
          </p>
          <div class="hero-actions">
            <a href="architecture-overview.html" class="hero-btn primary-btn">
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </a>
            <a href="development-environment.html" class="hero-btn secondary-btn">
              Setup Build Env
            </a>
            <a href="https://github.com/ankur/ghostring" target="_blank" rel="noopener noreferrer" class="hero-btn outline-btn">
              View on GitHub
            </a>
          </div>

          <div class="quick-nav-grid">
            <a href="architecture-overview.html" class="quick-card">
              <div class="quick-card-badge">01</div>
              <h3 class="quick-card-title">Architecture</h3>
              <p class="quick-card-desc">3-crate segregation, boundary validation, and end-to-end telemetry pipeline.</p>
            </a>
            <a href="aya-framework.html" class="quick-card">
              <div class="quick-card-badge">02</div>
              <h3 class="quick-card-title">Kernel & Aya</h3>
              <p class="quick-card-desc">Pure Rust eBPF ISA, CO-RE relocations, BTF types, and Aya framework bindings.</p>
            </a>
            <a href="perf-buffer-internals.html" class="quick-card">
              <div class="quick-card-badge">03</div>
              <h3 class="quick-card-title">Perf Ring Buffers</h3>
              <p class="quick-card-desc">Mmap header layouts, per-CPU lock-free queues, and Tokio polling daemon.</p>
            </a>
            <a href="security-model-deep-dive.html" class="quick-card">
              <div class="quick-card-badge">04</div>
              <h3 class="quick-card-title">Security & License</h3>
              <p class="quick-card-desc">Ring 0 tamper resistance, threat modeling, and GPLv3 verifier compliance.</p>
            </a>
            <a href="testing-strategy.html" class="quick-card">
              <div class="quick-card-badge">05</div>
              <h3 class="quick-card-title">QA & Troubleshooting</h3>
              <p class="quick-card-desc">4-tier test pyramid, benchmarks, and 19 diagnostic workflows.</p>
            </a>
          </div>
        </div>
        <hr />
        '''
        rendered_html = hero_html + rendered_html

    return rendered_html, headings

def build_sidebar_html(current_target):
    html_out = []
    html_out.append('<nav class="sidebar-nav" aria-label="Main Navigation">')

    overview_active = ' active' if current_target == 'index.html' else ''
    html_out.append(f'''
    <div class="sidebar-group">
      <div class="sidebar-group-header">Documentation Suite</div>
      <ul class="sidebar-links">
        <li>
          <a href="index.html" class="sidebar-link{overview_active}">
            <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Documentation Hub</span>
          </a>
        </li>
      </ul>
    </div>''')

    for cat in DOC_CATEGORIES:
        badge = cat["badge"]
        cat_name = cat["category"]
        html_out.append(f'''
    <div class="sidebar-group">
      <div class="sidebar-group-header">
        <span class="group-badge">{badge.split()[0]}</span>
        <span class="group-title">{cat_name}</span>
      </div>
      <ul class="sidebar-links">''')

        for src_file, target_file, nav_title, desc in cat["items"]:
            is_active = ' active' if target_file == current_target else ''
            html_out.append(f'''
        <li>
          <a href="{target_file}" class="sidebar-link{is_active}" title="{html.escape(nav_title)}">
            <span class="link-bullet"></span>
            <span class="link-text">{html.escape(nav_title)}</span>
          </a>
        </li>''')

        html_out.append('''      </ul>
    </div>''')

    html_out.append('</nav>')
    return '\n'.join(html_out)

def build_toc_html(headings):
    if not headings:
        return '<p class="toc-empty">No section headers on this page.</p>'

    html_out = ['<ul class="toc-list">']
    for h in headings:
        indent_class = "toc-item-h2" if h["level"] == 2 else "toc-item-h3"
        html_out.append(f'''
      <li class="toc-item {indent_class}">
        <a href="#{h["id"]}" class="toc-link" data-heading="{h["id"]}">{html.escape(h["title"])}</a>
      </li>''')
    html_out.append('</ul>')
    return '\n'.join(html_out)

def build_pagination_html(current_target):
    try:
        idx = next(i for i, a in enumerate(ALL_ARTICLES) if a["target_file"] == current_target)
    except StopIteration:
        return ""

    prev_article = ALL_ARTICLES[idx - 1] if idx > 0 else None
    next_article = ALL_ARTICLES[idx + 1] if idx < len(ALL_ARTICLES) - 1 else None

    html_out = ['<div class="doc-pagination">']
    
    if prev_article:
        html_out.append(f'''
      <a href="{prev_article["target_file"]}" class="pagination-card prev-card">
        <span class="pagination-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Previous
        </span>
        <span class="pagination-title">{html.escape(prev_article["title"])}</span>
      </a>''')
    else:
        html_out.append('<div class="pagination-spacer"></div>')

    if next_article:
        html_out.append(f'''
      <a href="{next_article["target_file"]}" class="pagination-card next-card">
        <span class="pagination-label">
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </span>
        <span class="pagination-title">{html.escape(next_article["title"])}</span>
      </a>''')
    else:
        html_out.append('<div class="pagination-spacer"></div>')

    html_out.append('</div>')
    return '\n'.join(html_out)

def render_html_page(article, content_html, headings):
    current_target = article["target_file"]
    title = article["title"]
    category = article["category"]
    sidebar_html = build_sidebar_html(current_target)
    toc_html = build_toc_html(headings)
    pagination_html = build_pagination_html(current_target)

    breadcrumbs = f'''
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="index.html" class="crumb-link">Docs</a>
      <span class="crumb-sep">/</span>
      <span class="crumb-cat">{html.escape(category)}</span>
      <span class="crumb-sep">/</span>
      <span class="crumb-active">{html.escape(title)}</span>
    </nav>
    '''

    page_html = f'''<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)} | GhostRing Documentation</title>
  <meta name="description" content="{html.escape(article.get("desc", ""))} - GhostRing Ring 0 eBPF Telemetry Engine">
  <link rel="icon" type="image/svg+xml" href="assets/logo.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/docs.css">
  <script>
    (function() {{
      const stored = localStorage.getItem('ghostring_docs_theme');
      if (stored) {{
        document.documentElement.setAttribute('data-theme', stored);
      }} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {{
        document.documentElement.setAttribute('data-theme', 'light');
      }} else {{
        document.documentElement.setAttribute('data-theme', 'dark');
      }}
    }})();
  </script>
</head>
<body class="docs-body">

  <!-- Top Navigation Bar -->
  <header class="top-nav">
    <div class="top-nav-inner">
      <div class="nav-left">
        <button id="mobile-sidebar-toggle" class="nav-icon-btn mobile-only" aria-label="Open Sidebar Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <a href="index.html" class="brand-link">
          <img src="assets/logo.svg" alt="GhostRing Logo" class="brand-logo" width="32" height="32">
          <div class="brand-info">
            <span class="brand-name">GhostRing</span>
            <span class="brand-tag">Ring 0 Telemetry</span>
          </div>
        </a>
        <span class="version-pill">v0.1.0</span>
      </div>

      <div class="nav-center">
        <button id="search-trigger-btn" class="search-trigger" type="button" aria-label="Search documentation">
          <svg class="search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span class="search-placeholder">Search documentation...</span>
          <span class="search-shortcut"><kbd>Ctrl</kbd><kbd>K</kbd></span>
        </button>
      </div>

      <div class="nav-right">
        <button id="theme-toggle" class="nav-icon-btn" type="button" aria-label="Toggle light/dark theme" title="Toggle theme">
          <svg class="theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <svg class="theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        </button>
        <a href="https://github.com/ankur/ghostring" target="_blank" rel="noopener noreferrer" class="nav-icon-btn github-btn" aria-label="GitHub Repository" title="GitHub">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
        </a>
      </div>
    </div>
  </header>

  <!-- Main Documentation Container -->
  <div class="docs-layout">
    
    <!-- Left Navigation Sidebar -->
    <aside id="docs-sidebar" class="docs-sidebar">
      <div class="sidebar-scroller">
        {sidebar_html}
      </div>
    </aside>
    <div id="sidebar-backdrop" class="sidebar-backdrop"></div>

    <!-- Center Content Article -->
    <main class="docs-main">
      <div class="content-wrapper">
        {breadcrumbs}
        
        <article class="markdown-body">
          {content_html}
        </article>

        {pagination_html}

        <footer class="docs-footer">
          <div class="footer-left">
            <span>GhostRing eBPF Security Subsystem • Licensed under GPLv3</span>
          </div>
          <div class="footer-right">
            <a href="#top" class="back-to-top-btn">Back to top ↑</a>
          </div>
        </footer>
      </div>
    </main>

    <!-- Right "On This Page" Sidebar -->
    <aside class="docs-toc-aside">
      <div class="toc-sticky-container">
        <div class="toc-heading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          <span>On this page</span>
        </div>
        {toc_html}
      </div>
    </aside>

  </div>

  <!-- Interactive Search Modal -->
  <div id="search-modal" class="search-modal" aria-hidden="true" role="dialog">
    <div class="search-modal-backdrop"></div>
    <div class="search-modal-box">
      <div class="search-input-wrapper">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="search-input" class="search-input" placeholder="Search documentation, topics, APIs, CLI flags..." autocomplete="off">
        <button id="search-clear-btn" class="search-clear-btn" aria-label="Clear query">&times;</button>
      </div>
      <div id="search-results" class="search-results">
        <div class="search-initial-state">Type a keyword to search docs...</div>
      </div>
      <div class="search-modal-footer">
        <span class="search-hint"><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
        <span class="search-hint"><kbd>Enter</kbd> to select</span>
        <span class="search-hint"><kbd>Esc</kbd> to close</span>
      </div>
    </div>
  </div>

  <script src="assets/search-index.js"></script>
  <script src="assets/docs.js"></script>
</body>
</html>'''
    return page_html

def generate_redirect_readme():
    return '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=index.html">
  <title>Redirecting to GhostRing Documentation...</title>
  <script>window.location.href = "index.html";</script>
</head>
<body>
  <p>Redirecting to <a href="index.html">GhostRing Documentation Hub</a>...</p>
</body>
</html>'''

def main():
    print(f"Building GhostRing HTML documentation site in {DOCS_DIR}...")
    os.makedirs(ASSETS_DIR, exist_ok=True)

    # Copy logo
    logo_src = os.path.join(ROOT_DIR, "assets", "logo.svg")
    logo_dst = os.path.join(ASSETS_DIR, "logo.svg")
    if os.path.exists(logo_src):
        shutil.copyfile(logo_src, logo_dst)
        print("Copied assets/logo.svg to docs/assets/logo.svg")

    search_records = []

    md = markdown.Markdown(
        extensions=[
            'extra',
            'sane_lists',
            'toc'
        ]
    )

    for article in ALL_ARTICLES:
        # Search for source file in SOURCES_DIR first, then DOCS_DIR
        src_path = os.path.join(SOURCES_DIR, article["src_file"])
        if not os.path.exists(src_path):
            src_path = os.path.join(DOCS_DIR, article["src_file"])
        
        if not os.path.exists(src_path):
            print(f"Warning: {src_path} not found, skipping.")
            continue

        with open(src_path, "r", encoding="utf-8") as f:
            raw_text = f.read()

        h1_match = re.search(r'^#\s+(.+)$', raw_text, re.MULTILINE)
        if h1_match:
            article["title"] = h1_match.group(1).strip()

        preprocessed = preprocess_markdown(raw_text)

        md.reset()
        rendered = md.convert(preprocessed)

        is_index = (article["target_file"] == "index.html")
        final_content_html, headings = postprocess_html(rendered, is_index=is_index)

        plain_text = re.sub(r'<[^>]+>', ' ', final_content_html)
        plain_text = re.sub(r'\s+', ' ', plain_text).strip()
        search_records.append({
            "title": article["title"],
            "url": article["target_file"],
            "category": article["category"],
            "headings": [{"title": h["title"], "id": h["id"]} for h in headings],
            "excerpt": plain_text[:400]
        })

        full_page_html = render_html_page(article, final_content_html, headings)

        target_path = os.path.join(DOCS_DIR, article["target_file"])
        with open(target_path, "w", encoding="utf-8") as out:
            out.write(full_page_html)

        print(f"Rendered: {article['src_file']} -> {article['target_file']} ({len(headings)} headings)")

    # Write README.html redirect
    readme_html_path = os.path.join(DOCS_DIR, "README.html")
    with open(readme_html_path, "w", encoding="utf-8") as f:
        f.write(generate_redirect_readme())
    print("Generated README.html redirect")

    # Write search index
    search_index_path = os.path.join(ASSETS_DIR, "search-index.js")
    with open(search_index_path, "w", encoding="utf-8") as f:
        f.write(f"window.GHOSTRING_SEARCH_INDEX = {json.dumps(search_records, indent=2)};\n")
    print(f"Generated search index with {len(search_records)} documents")

    # Verify all internal links
    verify_site_links()

def verify_site_links():
    import glob
    html_files = glob.glob(os.path.join(DOCS_DIR, "*.html"))
    total_links = 0
    broken_links = 0
    print(f"Verifying internal links across {len(html_files)} HTML pages...")

    for fpath in html_files:
        fname = os.path.basename(fpath)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        # Match href="..."
        matches = re.findall(r'href=[\'"]([^\'"#:]+)(#[^\'"]*)?[\'"]', content)
        for target, anchor in matches:
            if target.startswith("http") or target.startswith("//") or target.startswith("mailto:"):
                continue
            total_links += 1
            resolved = os.path.normpath(os.path.join(DOCS_DIR, target))
            if not os.path.exists(resolved):
                print(f"  [BROKEN LINK] in {fname}: target '{target}' does not exist!")
                broken_links += 1

    if broken_links == 0:
        print(f"SUCCESS: All {total_links} internal links resolved successfully with zero broken links!")
    else:
        print(f"WARNING: Found {broken_links} broken links out of {total_links} links checked.")

if __name__ == "__main__":
    main()
