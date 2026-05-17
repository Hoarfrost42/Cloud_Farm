import type { CSSProperties } from "react";
import type { GoalViewModel } from "../game/economy";

interface MilestoneFooterProps {
  goal: GoalViewModel;
}

/**
 * Renders the thin recovery route bar.
 */
export function MilestoneFooter({ goal }: MilestoneFooterProps) {
  return (
    <footer className="milestone-footer">
      <span>回晴航迹：{goal.title}</span>
      <div className="milestone-footer__meter" aria-hidden="true">
        <i style={{ "--progress": goal.progress } as CSSProperties} />
      </div>
      <strong>{Math.floor(goal.progress * 100)}%</strong>
    </footer>
  );
}
