'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const axisTick = {
  fontSize: 10,
  fontFamily: 'var(--font-dm-sans)',
  fill: '#6B5D54',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
}

const tooltipStyle = {
  background: '#FDFBF7',
  border: '1px solid #C9A961',
  borderRadius: '2px',
  fontSize: '12px',
  color: '#2A1F1A',
  padding: '8px 12px',
  boxShadow: '0 20px 40px -20px rgba(15,61,46,0.25)',
}

interface VuesLineChartProps {
  data: { jour: string; vues: number }[]
}

export function VuesAreaChart({ data }: VuesLineChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 10 }}>
          <defs>
            <linearGradient id="orGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9A961" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#C9A961" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#C9A961"
            strokeOpacity={0.15}
            vertical={false}
          />
          <XAxis
            dataKey="jour"
            tick={axisTick}
            axisLine={{ stroke: '#C9A961', strokeOpacity: 0.3 }}
            tickLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ stroke: '#C9A961', strokeOpacity: 0.4, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="vues"
            stroke="#C9A961"
            strokeWidth={2}
            fill="url(#orGradient)"
            activeDot={{ r: 5, fill: '#0F3D2E', stroke: '#C9A961', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface SourceBarChartProps {
  data: { source: string; clics: number }[]
}

const barColors = ['#0F3D2E', '#C9A961', '#B8924A', '#1a4a3a', '#D4C5B0']

export function SourceBarChart({ data }: SourceBarChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 60, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#C9A961"
            strokeOpacity={0.15}
            horizontal={false}
          />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="source"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: '#C9A961', fillOpacity: 0.08 }}
          />
          <Bar dataKey="clics" barSize={18} radius={[2, 2, 2, 2]}>
            {data.map((_, i) => (
              <Cell key={i} fill={barColors[i % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
