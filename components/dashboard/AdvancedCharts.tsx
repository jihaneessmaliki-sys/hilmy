'use client'

import {
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

const orPalette = ['#C9A961', '#B8924A', '#0F3D2E', '#1a4a3a', '#D4C5B0']

/**
 * Carte des villes : barres horizontales.
 * Top N villes (default 8) avec compteur vues sur la fenêtre fournie.
 */
export function VillesBarChart({
  data,
}: {
  data: { ville: string; vues: number }[]
}) {
  if (data.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-[13px] italic text-texte-sec">
        Pas encore assez de données géo. Reviens d&apos;ici une semaine ou deux.
      </p>
    )
  }
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
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
            dataKey="ville"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: '#C9A961', fillOpacity: 0.08 }}
            formatter={(v: number) => [`${v} vues`, 'Vues']}
          />
          <Bar dataKey="vues" barSize={20} radius={[2, 2, 2, 2]}>
            {data.map((_, i) => (
              <Cell key={i} fill={orPalette[i % orPalette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Pics horaires : barres verticales 24h.
 */
export function HeuresBarChart({
  data,
}: {
  data: { heure: string; vues: number }[]
}) {
  if (data.every((d) => d.vues === 0)) {
    return (
      <p className="px-4 py-12 text-center text-[13px] italic text-texte-sec">
        Aucune visite enregistrée sur cette fenêtre. Patience, ça vient.
      </p>
    )
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#C9A961"
            strokeOpacity={0.15}
            vertical={false}
          />
          <XAxis
            dataKey="heure"
            tick={axisTick}
            axisLine={{ stroke: '#C9A961', strokeOpacity: 0.3 }}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: '#C9A961', fillOpacity: 0.08 }}
            formatter={(v: number) => [`${v} vues`, 'Vues']}
          />
          <Bar dataKey="vues" barSize={14} radius={[3, 3, 0, 0]} fill="#C9A961" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
