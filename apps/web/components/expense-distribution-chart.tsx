interface ExpenseDistributionChartProps {
  rows: Array<[string, string]>;
}

const chartColors = [
  '#0f766e',
  '#2563eb',
  '#7c3aed',
  '#dc2626',
  '#ca8a04',
  '#64748b'
];

export function ExpenseDistributionChart({
  rows
}: ExpenseDistributionChartProps) {
  const items = rows
    .map(([label, amount]) => ({
      amount,
      color:
        chartColors[
          rows.findIndex(([rowLabel]) => rowLabel === label) %
            chartColors.length
        ],
      label,
      value: toNumber(amount)
    }))
    .filter((item) => item.value > 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const gradient = buildConicGradient(items, total);

  if (total <= 0) {
    return (
      <div className="expense-distribution-chart empty">
        <div className="expense-donut empty" aria-hidden="true" />
        <div>
          <strong>Gider dagilimi yok</strong>
          <span>Bu donem icin maliyet kalemi hesaplanmadi.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-distribution-chart">
      <div
        aria-label="Gider dagilim grafigi"
        className="expense-donut"
        role="img"
        style={{ background: gradient }}
      >
        <div>
          <span>Toplam</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>

      <div className="expense-distribution-legend">
        {items.map((item) => {
          const percentage = (item.value / total) * 100;

          return (
            <div className="expense-distribution-item" key={item.label}>
              <span style={{ background: item.color }} />
              <div>
                <strong>{item.label}</strong>
                <small>
                  {formatMoney(item.value)} / %{formatNumber(percentage, 1)}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildConicGradient(
  items: Array<{ color: string; value: number }>,
  total: number
) {
  let cursor = 0;
  const segments = items.map((item) => {
    const start = cursor;
    const end = cursor + (item.value / total) * 360;
    cursor = end;

    return `${item.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    currency: 'TRY',
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

function toNumber(value: string | number | null | undefined) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
