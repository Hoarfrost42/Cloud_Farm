import type { MainTabDefinition, MainTabId } from "./uiTypes";

interface MainTabsProps {
  tabs: MainTabDefinition[];
  activeTab: MainTabId;
  onChangeTab: (tabId: MainTabId) => void;
}

/**
 * Renders the primary classic incremental navigation tabs.
 */
export function MainTabs({ tabs, activeTab, onChangeTab }: MainTabsProps) {
  return (
    <nav className="main-tabs" aria-label="主要系统">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === activeTab ? "main-tab main-tab--active" : "main-tab"}
          aria-current={tab.id === activeTab ? "page" : undefined}
          onClick={() => onChangeTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

