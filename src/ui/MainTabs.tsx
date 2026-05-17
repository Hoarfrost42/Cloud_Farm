import type { MainTabDefinition, MainTabId } from "./uiTypes";
import { getUiRegionProps } from "./uiRegions";

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
    <nav {...getUiRegionProps("systemTabs", "main-tabs")}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === activeTab ? "main-tab main-tab--active" : "main-tab"}
          aria-current={tab.id === activeTab ? "page" : undefined}
          aria-label={`${tab.label}，${tab.ariaDescription}`}
          data-ui-tier={tab.tier}
          onClick={() => onChangeTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
