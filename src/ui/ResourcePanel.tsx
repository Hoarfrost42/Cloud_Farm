import {
  getResourceLedgerSections,
  type WeatherReactorState,
} from "../game/economy";

interface ResourcePanelProps {
  state: WeatherReactorState;
  exact: boolean;
}

/**
 * Renders detailed unlocked resources inside the resources tab.
 */
export function ResourcePanel({ state, exact }: ResourcePanelProps) {
  const sections = getResourceLedgerSections(state, exact);

  return (
    <div className="resource-panel">
      {sections.map((section) => (
        <section key={section.id} className="workbench-section">
          <span className="section-kicker">{section.title}</span>
          <div className="classic-resource-grid">
            {section.items.map((resource) => (
              <div key={resource.id} className="classic-resource-card">
                <span>{resource.label}</span>
                <strong>{resource.value}</strong>
                {resource.rate ? <small>{resource.rate}</small> : null}
                {resource.detail ? <em>{resource.detail}</em> : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
