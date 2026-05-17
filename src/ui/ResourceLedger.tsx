import type { MainTabId, ResourceLedgerSection } from "../game/economy";

interface ResourceLedgerProps {
  sections: ResourceLedgerSection[];
  onOpenTab?: (tabId: MainTabId) => void;
}

/**
 * Shows every unlocked resource as always-visible notebook margin notes.
 */
export function ResourceLedger({ sections, onOpenTab }: ResourceLedgerProps) {
  return (
    <aside className="resource-ledger" aria-label="天气手账边注">
      <header className="resource-ledger__header">
        <div>
          <span>手账边注</span>
          <strong>已记录天气</strong>
        </div>
        {onOpenTab ? (
          <button type="button" onClick={() => onOpenTab("resources")}>翻开</button>
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
