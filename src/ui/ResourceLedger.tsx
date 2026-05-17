import type { MainTabId, ResourceLedgerSection } from "../game/economy";

interface ResourceLedgerProps {
  sections: ResourceLedgerSection[];
  onOpenTab?: (tabId: MainTabId) => void;
}

/**
 * Shows every unlocked resource in a compact always-visible ledger.
 */
export function ResourceLedger({ sections, onOpenTab }: ResourceLedgerProps) {
  return (
    <aside className="resource-ledger" aria-label="已解锁资源观察区">
      <header className="resource-ledger__header">
        <div>
          <span>资源观察</span>
          <strong>已解锁资源</strong>
        </div>
        {onOpenTab ? (
          <button type="button" onClick={() => onOpenTab("resources")}>详情</button>
        ) : null}
      </header>

      <div className="resource-ledger__body">
        {sections.map((section) => (
          <section key={section.id} className="resource-ledger__section">
            <strong>{section.title}</strong>
            <div className="resource-ledger__items">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={[
                    "resource-ledger-row",
                    `resource-ledger-row--${item.id}`,
                    item.emphasis === "primary" ? "resource-ledger-row--primary" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <i className="resource-ledger-row__icon" aria-hidden="true" />
                  <span>{item.label}</span>
                  <b>{item.value}</b>
                  {item.rate ? <small>{item.rate}</small> : null}
                  {item.detail ? <em>{item.detail}</em> : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
