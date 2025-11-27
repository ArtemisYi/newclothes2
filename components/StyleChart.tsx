import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { StyleMetric } from '../types';

interface StyleChartProps {
  data: StyleMetric[];
}

const StyleChart: React.FC<StyleChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-500 mb-2 text-center">风格属性分析</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="attribute" tick={{ fill: '#64748b', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="风格指数"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            fill="#818cf8"
            fillOpacity={0.4}
          />
          <Tooltip 
             contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
             itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StyleChart;