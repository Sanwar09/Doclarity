import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Copy,
  RefreshCw
} from 'lucide-react';

const importanceOrder = { high: 0, medium: 1, low: 2 };

const ClauseExplorer = ({ clauses = [], onAskClause }) => {
  const [expandedClauses, setExpandedClauses] = useState({});
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | high | medium | low
  const [sortBy, setSortBy] = useState('relevance'); // relevance | importance | section | title
  const [pinned, setPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('clauses:pins');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const searchRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(searchInput.trim()), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    try {
      localStorage.setItem('clauses:pins', JSON.stringify(pinned));
    } catch {}
  }, [pinned]);

  const toggleClause = (clauseId) => {
    setExpandedClauses(prev => ({ ...prev, [clauseId]: !prev[clauseId] }));
  };

  const togglePinned = (id) => {
    setPinned(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const getImportanceColor = (importance) => {
    switch (importance) {
      case 'high': return 'border-danger-500/60 bg-danger-50';
      case 'medium': return 'border-warning-500/60 bg-warning-50';
      case 'low': return 'border-emerald-500/60 bg-emerald-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getImportanceIcon = (importance) => {
    switch (importance) {
      case 'high': return <AlertCircle className="w-5 h-5 text-danger-600" />;
      case 'medium': return <AlertCircle className="w-5 h-5 text-warning-600" />;
      case 'low': return <HelpCircle className="w-5 h-5 text-emerald-600" />;
      default: return null;
    }
  };

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0 };
    clauses.forEach(cl => { if (c[cl.importance] !== undefined) c[cl.importance]++; });
    return c;
  }, [clauses]);

  const relevanceScore = (q, clause) => {
    if (!q) return 0;
    const t = (clause.title || '').toLowerCase();
    const s = (clause.section || '').toLowerCase();
    const o = (clause.originalText || '').toLowerCase();
    const e = (clause.explanation || '').toLowerCase();
    const ql = q.toLowerCase();
    let score = 0;
    if (t.includes(ql)) score += 6;
    if (s.includes(ql)) score += 3;
    if (e.includes(ql)) score += 2;
    if (o.includes(ql)) score += 1;
    return score + (3 - (importanceOrder[clause.importance] ?? 2)); // boost by importance
  };

  const filteredSortedClauses = useMemo(() => {
    const list = clauses
      .filter(c => (filterType === 'all' || c.importance === filterType))
      .filter(c => !showPinnedOnly || pinned[c.id])
      .filter(c => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          (c.title || '').toLowerCase().includes(q) ||
          (c.section || '').toLowerCase().includes(q) ||
          (c.explanation || '').toLowerCase().includes(q) ||
          (c.originalText || '').toLowerCase().includes(q)
        );
      });

    const sorted = [...list];
    if (sortBy === 'importance') {
      sorted.sort((a, b) => (importanceOrder[a.importance] ?? 9) - (importanceOrder[b.importance] ?? 9));
    } else if (sortBy === 'section') {
      sorted.sort((a, b) => (a.section || '').localeCompare(b.section || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'title') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
    } else {
      // relevance
      sorted.sort((a, b) => relevanceScore(searchTerm, b) - relevanceScore(searchTerm, a));
    }
    return sorted;
  }, [clauses, filterType, showPinnedOnly, pinned, searchTerm, sortBy]);

  const highlight = (text, q) => {
    if (!text) return null;
    if (!q) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-warning-200 text-slate-900 px-0.5 rounded">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // Escapes special RegExp characters in a string
  const escapeRegExp = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const expandAll = () => {
    const next = {};
    filteredSortedClauses.forEach(c => { next[c.id] = true; });
    setExpandedClauses(next);
  };

  const collapseAll = () => setExpandedClauses({});

  const copyRef = (c) => {
    const ref = [c.section, c.title].filter(Boolean).join(' — ');
    navigator.clipboard.writeText(ref || c.title || 'Clause');
  };

  // Keyboard: '/' focuses search, Esc clears
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') setSearchInput('');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Interactive Clause Explorer</h2>
        <div className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filteredSortedClauses.length}</span> of{' '}
          <span className="font-semibold text-slate-700">{clauses.length}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="flex-auto self-center relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search title, section, explanation..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Importance chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Filter:</span>
          {(['all', 'high', 'medium', 'low']).map(key => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={[
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                filterType === key ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-700 border-gray-300 hover:bg-slate-50'
              ].join(' ')}
            >
              {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)}
              {key !== 'all' && (
                <span className="ml-2 text-xs rounded-full px-2 py-0.5 bg-white/70 border border-white/50 text-slate-700">
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort + Pinned */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-5 h-5 text-slate-600" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="importance">Sort: Importance</option>
            <option value="section">Sort: Section</option>
            <option value="title">Sort: Title</option>
          </select>

          <button
            onClick={() => setShowPinnedOnly(v => !v)}
            className={`ml-2 inline-flex items-center gap-1 px-3 py-2 rounded-lg border transition-colors ${
              showPinnedOnly ? 'bg-warning-100 border-warning-300 text-warning-800' : 'bg-white text-slate-700 border-gray-300 hover:bg-slate-50'
            }`}
            title="Show pinned only"
          >
            <Bookmark className="w-4 h-4" />
            Pinned
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-slate-50"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-slate-50"
            >
              Collapse all
            </button>
          </div>
        </div>
      </div>

      {/* Clauses */}
      <div className="space-y-4">
        {filteredSortedClauses.length === 0 && (
          <div className="text-center text-slate-600 py-10 border rounded-lg">
            <p className="font-medium">No clauses match your filters.</p>
            <p className="text-sm">Try clearing search or selecting “All”.</p>
          </div>
        )}

        {filteredSortedClauses.map((clause) => {
          const isOpen = !!expandedClauses[clause.id];
          return (
            <div
              key={clause.id}
              className={`border-2 rounded-lg transition-all duration-200 ${getImportanceColor(clause.importance)}`}
            >
              {/* Clause Header */}
              <div className="w-full px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => toggleClause(clause.id)}
                  className="flex items-center gap-3 hover:opacity-90 focus:outline-none"
                  aria-expanded={isOpen}
                  aria-controls={`clause-panel-${clause.id}`}
                >
                  {isOpen
                    ? <ChevronDown className="w-5 h-5 text-slate-600" />
                    : <ChevronRight className="w-5 h-5 text-slate-600" />
                  }
                  {getImportanceIcon(clause.importance)}
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">
                      {highlight(clause.title, searchTerm)}
                    </h3>
                    {clause.section && (
                      <div className="text-xs text-slate-500">{highlight(clause.section, searchTerm)}</div>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyRef(clause)}
                    className="text-slate-600 hover:text-slate-800 p-1.5 rounded"
                    title="Copy reference"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => togglePinned(clause.id)}
                    className="text-warning-600 hover:text-warning-700 p-1.5 rounded"
                    title={pinned[clause.id] ? 'Unpin' : 'Pin'}
                  >
                    {pinned[clause.id] ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isOpen && (
                <div id={`clause-panel-${clause.id}`} className="px-4 pb-4 border-t border-gray-200 animate-fade-in">
                  {/* Original Text */}
                  <div className="mt-4">
                    <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Original Text
                    </h4>
                    <div className="bg-slate-100 p-3 rounded-lg text-sm text-slate-700 italic">
                      {clause.originalText
                        ? <>“{highlight(clause.originalText, searchTerm)}”</>
                        : <span className="text-slate-500 not-italic">No excerpt available</span>
                      }
                    </div>
                  </div>

                  {/* Plain English Explanation */}
                  {clause.explanation && (
                    <div className="mt-4">
                      <h4 className="font-medium text-slate-700 mb-2">Plain English Explanation</h4>
                      <p className="text-slate-700">{highlight(clause.explanation, searchTerm)}</p>
                    </div>
                  )}

                  {/* Key Implications */}
                  {!!(clause.implications?.length) && (
                    <div className="mt-4">
                      <h4 className="font-medium text-slate-700 mb-2">What This Means for You</h4>
                      <ul className="space-y-1">
                        {clause.implications.map((implication, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary-600 mt-1">•</span>
                            <span className="text-slate-700 text-sm">{implication}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Items */}
                  {!!(clause.actionItems?.length) && (
                    <div className="mt-4 bg-primary-50 p-3 rounded-lg">
                      <h4 className="font-medium text-primary-800 mb-2">Recommended Actions</h4>
                      <ul className="space-y-1">
                        {clause.actionItems.map((action, index) => (
                          <li key={index} className="text-sm text-primary-700">✓ {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ask About This Clause */}
                  <button
                    onClick={() => onAskClause?.(clause)}
                    className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Ask a question about this clause
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClauseExplorer;