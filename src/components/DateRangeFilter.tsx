interface Props {
  startDate: string;
  endDate: string;
  onStartChange: (d: string) => void;
  onEndChange: (d: string) => void;
  min?: string;
  max?: string;
}

export default function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange, min, max }: Props) {
  return (
    <div className="date-range-filter">
      <label>From</label>
      <input
        type="date"
        value={startDate}
        min={min}
        max={endDate || max}
        onChange={e => onStartChange(e.target.value)}
      />
      <label>To</label>
      <input
        type="date"
        value={endDate}
        min={startDate || min}
        max={max}
        onChange={e => onEndChange(e.target.value)}
      />
      {(startDate !== (min || '') || endDate !== (max || '')) && (
        <button
          className="mode-btn"
          style={{ fontSize: 11, padding: '3px 8px' }}
          onClick={() => { onStartChange(min || ''); onEndChange(max || ''); }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
