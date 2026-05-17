interface UpgradeRowProps {
  title: string;
  levelText?: string;
  effectText: string;
  detailText?: string;
  costText: string;
  actionText?: string;
  ready?: boolean;
  owned?: boolean;
  disabled?: boolean;
  recommended?: boolean;
  onClick?: () => void;
}

/**
 * Renders one dense upgrade or layer row for the workbench.
 */
export function UpgradeRow({
  title,
  levelText,
  effectText,
  detailText,
  costText,
  actionText = "培育",
  ready = false,
  owned = false,
  disabled = false,
  recommended = false,
  onClick,
}: UpgradeRowProps) {
  const actionLabel = owned ? "已拥有" : costText === "MAX" || costText === "已满级" ? "MAX" : disabled ? "等待" : actionText;
  const stateLabel = owned
    ? "已收录"
    : ready
      ? "可培育"
      : recommended
        ? "推荐记"
        : disabled
          ? "需静候"
          : "摘记";
  const stateKind = owned
    ? "owned"
    : ready && recommended
      ? "recommended-ready"
      : ready
        ? "ready"
        : recommended
          ? "recommended"
          : disabled
            ? "disabled"
            : "idle";

  return (
    <button
      type="button"
      className={[
        "classic-upgrade-row",
        ready ? "classic-upgrade-row--ready" : "",
        owned ? "classic-upgrade-row--owned" : "",
        recommended ? "classic-upgrade-row--recommended" : "",
      ].filter(Boolean).join(" ")}
      data-ui-state={stateKind}
      data-state-label={stateLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="classic-upgrade-row__state-mark" aria-hidden="true">{stateLabel}</span>
      <span className="classic-upgrade-row__name">
        <strong>{title}</strong>
        {levelText ? <small>{levelText}</small> : null}
      </span>
      <span className="classic-upgrade-row__effect">
        <strong>{effectText}</strong>
        {detailText ? <small>{detailText}</small> : null}
      </span>
      <span className="classic-upgrade-row__cost">{costText}</span>
      <span className="classic-upgrade-row__action">{actionLabel}</span>
    </button>
  );
}
