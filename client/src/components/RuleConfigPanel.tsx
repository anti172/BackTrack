import type { CodeRules } from '../api';

interface Props {
  rules: CodeRules;
  onChange: (rules: CodeRules) => void;
  disabled?: boolean;
}

export default function RuleConfigPanel({ rules, onChange, disabled }: Props) {
  function update(patch: Partial<CodeRules>) {
    onChange({ ...rules, ...patch });
  }

  return (
    <div className="rules-config">
      <div className="rules-title">Szabályok (2. szint)</div>

      <label className="rule-toggle">
        <input
          type="checkbox"
          checked={rules.maxOccurrenceEnabled}
          disabled={disabled}
          onChange={(e) => update({ maxOccurrenceEnabled: e.target.checked })}
        />
        <span>Max előfordulás:</span>
        <input
          type="number"
          min={1}
          max={5}
          value={rules.maxOccurrence}
          disabled={disabled || !rules.maxOccurrenceEnabled}
          onChange={(e) => update({ maxOccurrence: Math.max(1, Number(e.target.value)) })}
        />
        <span>× ugyanaz a számjegy</span>
      </label>

      <label className="rule-toggle">
        <input
          type="checkbox"
          checked={rules.sumEqualsEnabled}
          disabled={disabled}
          onChange={(e) => update({ sumEqualsEnabled: e.target.checked })}
        />
        <span>Összeg =</span>
        <input
          type="number"
          min={0}
          max={45}
          value={rules.sumEquals}
          disabled={disabled || !rules.sumEqualsEnabled}
          onChange={(e) => update({ sumEquals: Number(e.target.value) })}
        />
      </label>

      <label className="rule-toggle">
        <input
          type="checkbox"
          checked={rules.allUniqueEnabled}
          disabled={disabled}
          onChange={(e) => update({ allUniqueEnabled: e.target.checked })}
        />
        <span>Minden számjegy különböző</span>
      </label>

      <label className="rule-toggle">
        <input
          type="checkbox"
          checked={rules.noZeroEnabled}
          disabled={disabled}
          onChange={(e) => update({ noZeroEnabled: e.target.checked })}
        />
        <span>Nincs benne 0</span>
      </label>

      <label className="rule-toggle">
        <input
          type="checkbox"
          checked={rules.minEvenEnabled}
          disabled={disabled}
          onChange={(e) => update({ minEvenEnabled: e.target.checked })}
        />
        <span>Min. páros:</span>
        <input
          type="number"
          min={0}
          max={5}
          value={rules.minEvenCount}
          disabled={disabled || !rules.minEvenEnabled}
          onChange={(e) => update({ minEvenCount: Math.max(0, Number(e.target.value)) })}
        />
      </label>
    </div>
  );
}
