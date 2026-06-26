import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

const axisStyle = { fontSize: 11, fill: 'currentColor' }

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: 'none',
    background: 'rgba(28,42,58,0.95)',
    color: '#fff',
    fontSize: 12,
  },
  labelStyle: { color: '#cbd5e1' },
}

export function BarChartCard({
  data,
  unit,
}: {
  data: { label: string; value: number }[]
  unit?: string
}) {
  return (
    <div className="h-48 w-full text-slate-400">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number) => [`${Math.round(v * 10) / 10}${unit ? ' ' + unit : ''}`, '']}
            cursor={{ fill: 'rgba(54,103,173,0.1)' }}
          />
          <Bar dataKey="value" fill="#3667ad" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function LineChartCard({
  data,
  unit,
}: {
  data: { label: string; value: number }[]
  unit?: string
}) {
  return (
    <div className="h-48 w-full text-slate-400">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} domain={['auto', 'auto']} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number) => [`${Math.round(v * 10) / 10}${unit ? ' ' + unit : ''}`, '']}
          />
          <Line type="monotone" dataKey="value" stroke="#5685c6" strokeWidth={2.5} dot={{ r: 3, fill: '#5685c6' }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
