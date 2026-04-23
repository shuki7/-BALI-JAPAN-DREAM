import { useState, useEffect } from 'react';
import { activityService } from '../lib/activityService';
import { Loader2 } from 'lucide-react';

const ActivityChart = () => {
  const [data, setData] = useState<{ day: string, count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const activities = await activityService.getActivitiesInDateRange(sevenDaysAgo, now);

      // 日ごとの集計
      const counts: Record<string, number> = {};
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        const key = `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})`;
        counts[key] = 0;
      }

      activities.forEach(activity => {
        const d = new Date(activity.timestamp);
        const key = `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})`;
        if (counts[key] !== undefined) {
          counts[key]++;
        }
      });

      const chartData = Object.entries(counts).map(([day, count]) => ({ day, count }));
      setData(chartData);
    } catch (error) {
      console.error("Failed to load chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-primary/20" size={32} />
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 5); // 最小スケールを5に

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-grow flex items-end justify-between gap-2 px-4 pb-8">
        {data.map((d, i) => {
          const height = (d.count / maxCount) * 100;
          return (
            <div key={i} className="flex-grow flex flex-col items-center gap-2 group relative">
              <div 
                className="w-full bg-primary/10 group-hover:bg-primary/30 rounded-t-lg transition-all duration-500 ease-out relative"
                style={{ height: `${Math.max(height, 5)}%` }} // 最小でも少し表示
              >
                {d.count > 0 && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityChart;
