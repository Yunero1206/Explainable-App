import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  MoreHorizontal,
  X,
  Edit2,
  Archive,
  Trash2,
  ShieldCheck,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { PresentationCaseData } from '../types.js';
import { useLanguage } from '../contexts/LanguageContext';
import { LOCALES, Locale } from '../lib/translations';

interface LeftSidebarProps {
  cases: PresentationCaseData[];
  currentCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  onNewCase: () => void;
  onRenameCase: (caseId: string, newNumber: string, newTitle: string) => void;
  onArchiveCase: (caseId: string) => void;
  onDeleteCase: (caseId: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  testModeNode?: React.ReactNode;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  cases,
  currentCaseId,
  onSelectCase,
  onNewCase,
  onRenameCase,
  onArchiveCase,
  onDeleteCase,
  isMobileOpen = false,
  onCloseMobile,
  testModeNode,
}) => {
  const { locale, setLocale, t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenuCaseId, setOpenMenuCaseId] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<{ id: string; caseNumber: string; title: string } | null>(null);
  const [deletingCase, setDeletingCase] = useState<PresentationCaseData | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter out archived cases for recent list
  const activeCases = cases.filter((c) => !c.is_archived);

  // Close popup menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuCaseId(null);
      }
    };
    if (openMenuCaseId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuCaseId]);

  const handleOpenRename = (c: PresentationCaseData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCase({
      id: c.id,
      caseNumber: c.case_number || 'C-0001',
      title: c.title || c.objective || '',
    });
    setOpenMenuCaseId(null);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;
    onRenameCase(editingCase.id, editingCase.caseNumber, editingCase.title);
    setEditingCase(null);
  };

  const handleArchive = (cId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onArchiveCase(cId);
    setOpenMenuCaseId(null);
  };

  const handleDelete = (c: PresentationCaseData, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuCaseId(null);
    setDeletingCase(c);
  };

  const content = (
    <div className="h-full flex flex-col bg-white text-slate-800 text-xs border-r border-slate-200 select-none overflow-hidden">
      {/* App Header & Collapse Toggle */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between shrink-0">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 shrink-0">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
              </div>
              <span className="font-semibold text-xs text-slate-900 tracking-tight truncate">
                Explainable Trust
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>

              {onCloseMobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="md:hidden p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                  title="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* New Case Button */}
      <div className="p-2 shrink-0">
        {!isCollapsed ? (
          <button
            type="button"
            onClick={() => {
              onNewCase();
              onCloseMobile?.();
            }}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg border border-slate-900 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-200" />
            <span>{t.newCase}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onNewCase();
              onCloseMobile?.();
            }}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg border border-slate-900 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            title={t.newCase}
          >
            <Plus className="w-4 h-4 text-slate-200" />
          </button>
        )}
      </div>

      {/* Recent Cases List (Two-Line Rows) */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {activeCases.length === 0 ? (
          !isCollapsed && (
            <p className="px-3 py-4 text-slate-400 italic text-[11px]">
              {t.noActiveCases}
            </p>
          )
        ) : (
          activeCases.map((c) => {
            const isSelected = c.id === currentCaseId;
            const caseNum = c.case_number || 'C-0001';
            const caseTitle = c.title || c.objective || 'Untitled Case';
            const isMenuOpen = openMenuCaseId === c.id;

            if (isCollapsed) {
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCase(c.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full py-2 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={`${caseNum}: ${caseTitle}`}
                >
                  <span className="text-[10px] font-mono leading-none">
                    {caseNum.replace('CASE-', '').replace('C-', '')}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={c.id}
                onClick={() => {
                  onSelectCase(c.id);
                  onCloseMobile?.();
                }}
                className={`relative group w-full rounded-lg px-3 py-2 transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                  isSelected
                    ? 'bg-slate-100 border-slate-200 text-slate-900 font-medium'
                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {/* 2-Line Row Content */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-[11px] font-mono text-slate-500 font-medium">
                    {caseNum}
                  </div>
                  <div className="text-xs font-medium text-slate-800 truncate group-hover:text-slate-900">
                    {caseTitle}
                  </div>
                </div>

                {/* Subtle Three-Dot Button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuCaseId(isMenuOpen ? null : c.id);
                    }}
                    className={`p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer ${
                      isMenuOpen ? 'text-slate-900 bg-slate-200' : 'text-slate-400 opacity-60 group-hover:opacity-100 hover:text-slate-800'
                    }`}
                    title="Case options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Contextual Menu Dropdown */}
                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-6 z-50 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs text-slate-700"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleOpenRename(c, e)}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t.rename}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleArchive(c.id, e)}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t.archive}</span>
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={(e) => handleDelete(c, e)}
                        className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>{t.delete}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Test Mode & Language Controls */}
      <div className="border-t border-slate-200 p-2 space-y-2 shrink-0 bg-slate-50/50">
        {/* Embedded Test Mode Control */}
        {testModeNode && (
          <div>
            {testModeNode}
          </div>
        )}

        {/* Language Selector */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-1 text-slate-600">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold tracking-wider uppercase">Language</span>
            </div>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs"
            >
              {LOCALES.map((loc) => (
                <option key={loc.code} value={loc.code} className="bg-white text-slate-800">
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const nextIdx = (LOCALES.findIndex((l) => l.code === locale) + 1) % LOCALES.length;
                setLocale(LOCALES[nextIdx].code);
              }}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded text-[10px] font-mono font-bold uppercase"
              title={`Current language: ${locale}. Click to cycle.`}
            >
              {locale}
            </button>
          </div>
        )}
      </div>

      {/* Small Rename Modal */}
      {editingCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-semibold text-sm text-slate-900">{t.renameCase}</h3>
              <button
                type="button"
                onClick={() => setEditingCase(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-mono text-[11px] mb-1">
                  {t.caseNumber}
                </label>
                <input
                  type="text"
                  value={editingCase.caseNumber}
                  onChange={(e) =>
                    setEditingCase({ ...editingCase, caseNumber: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">
                  {t.caseName}
                </label>
                <input
                  type="text"
                  value={editingCase.title}
                  onChange={(e) =>
                    setEditingCase({ ...editingCase, title: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-semibold text-sm text-slate-900">{t.deleteCase}</h3>
              <button
                type="button"
                onClick={() => setDeletingCase(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                {t.confirmDelete}{' '}
                <span className="font-semibold text-slate-900">
                  &ldquo;{deletingCase.case_number || deletingCase.title}&rdquo;
                </span>
                ?
              </p>
              <p className="text-slate-500 text-[11px]">
                {t.deleteWarning}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCase(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = deletingCase.id;
                  setDeletingCase(null);
                  onDeleteCase(idToDelete);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
              >
                {t.deleteCaseBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className={`hidden md:block shrink-0 h-full transition-all duration-200 ${isCollapsed ? 'w-14' : 'w-60 lg:w-64'}`}>
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-xs h-full bg-white shadow-2xl z-50">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
