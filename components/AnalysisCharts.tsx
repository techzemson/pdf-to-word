import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { DocumentStats, Entity } from '../types';

interface AnalysisChartsProps {
  stats: DocumentStats;
  entities: Entity[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ stats, entities }) => {
  
  const contentData = [
    { name: 'Text', value: stats.wordCount },
    { name: 'Structure', value: stats.paragraphCount * 15 },
    { name: 'Visuals', value: stats.imageCount * 100 },
  ];

  const radarData = [
    { subject: 'Sentiment', A: stats.sentimentScore, fullMark: 100 },
    { subject: 'Complexity', A: stats.complexityScore, fullMark: 100 },
    { subject: 'Clarity', A: Math.max(100 - stats.complexityScore + 20, 0), fullMark: 100 },
    { subject: 'Density', A: Math.min((stats.wordCount / (stats.pageCount || 1)) / 5, 100), fullMark: 100 },
    { subject: 'Visuals', A: Math.min(stats.imageCount * 10, 100), fullMark: 100 },
  ];

  // Process top 5 entities for bar chart
  const entityData = entities
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(e => ({
      name: e.name.length > 10 ? e.name.substring(0, 10) + '...' : e.name,
      count: e.count,
      type: e.type
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      
      {/* 1. Content Composition Donut */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Content Mix</h3>
        <div className="h-56 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={contentData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {contentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-3xl font-bold text-slate-800">{stats.pageCount}</span>
             <span className="text-xs text-slate-500 uppercase font-medium">Pages</span>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          {contentData.map((d, i) => (
             <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i]}}></span>
                {d.name}
             </div>
          ))}
        </div>
      </div>

      {/* 2. Top Entities Bar Chart */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Top Entities Mentions</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={entityData} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Metrics Radar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document DNA</h3>
          <span className={`px-2 py-1 rounded-md text-xs font-bold ${stats.sentimentScore > 60 ? 'bg-green-100 text-green-700' : stats.sentimentScore < 40 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
            Tone: {stats.tone}
          </span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar
                name="Score"
                dataKey="A"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="#8b5cf6"
                fillOpacity={0.2}
              />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};