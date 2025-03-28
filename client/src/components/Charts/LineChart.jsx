import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../../services/firebase';

const LineChart = ({ chartData, lawyerColors, lawyers, graphHeight = 200 }) => {
  const navigate = useNavigate();
  const graphWidth = chartData.length > 1 ? chartData.length * 80 : 320;
  
  // Find max appointment count for scaling
  let maxCount = 0;
  chartData.forEach(monthData => {
    lawyers.forEach(lawyer => {
      if (monthData[lawyer.id] > maxCount) {
        maxCount = monthData[lawyer.id];
      }
    });
  });
  
  // Add padding to max count
  maxCount = Math.ceil(maxCount * 1.2);
  
  // Create points for each lawyer's line
  const lawyerLines = {};
  lawyers.forEach(lawyer => {
    lawyerLines[lawyer.id] = chartData.map((monthData, index) => {
      const x = (index / (chartData.length - 1 || 1)) * graphWidth;
      const y = graphHeight - ((monthData[lawyer.id] || 0) / maxCount) * graphHeight;
      return { x, y };
    });
  });
  
  // Generate SVG path strings
  const paths = {};
  lawyers.forEach(lawyer => {
    const points = lawyerLines[lawyer.id];
    let pathString = '';
    
    if (points.length > 0) {
      pathString = `M ${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathString += ` L ${points[i].x},${points[i].y}`;
      }
    }
    
    paths[lawyer.id] = pathString;
  });

  const handlePointClick = (lawyerId, monthYear) => {
    navigate(`/lawyer-appointments/${lawyerId}?month=${monthYear}`);
    if (analytics) {
      logEvent(analytics, "view_lawyer_appointments", { 
        lawyer_id: lawyerId,
        month: monthYear
      });
    }
  };
  
  return (
    <div className="line-graph-container">
      <div className="graph-labels">
        <div className="y-axis-labels">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="y-label">
              {Math.round((maxCount / 4) * (4 - i))}
            </div>
          ))}
        </div>
        
        <svg width={graphWidth} height={graphHeight} className="line-graph">
          {/* Horizontal grid lines */}
          {[...Array(5)].map((_, i) => (
            <line 
              key={`grid-${i}`}
              x1="0" 
              y1={(graphHeight / 4) * i} 
              x2={graphWidth} 
              y2={(graphHeight / 4) * i}
              stroke="#e0e0e0" 
              strokeWidth="1"
            />
          ))}
          
          {/* Lines for each lawyer */}
          {lawyers.map(lawyer => (
            <g key={lawyer.id}>
              <path
                d={paths[lawyer.id]}
                fill="none"
                stroke={lawyerColors[lawyer.id]}
                strokeWidth="2"
              />
              
              {/* Points for each month */}
              {lawyerLines[lawyer.id].map((point, i) => (
                <circle 
                  key={`${lawyer.id}-${i}`}
                  cx={point.x} 
                  cy={point.y} 
                  r="4"
                  fill={lawyerColors[lawyer.id]}
                  onClick={() => handlePointClick(lawyer.id, chartData[i].monthYear)}
                  className="data-point"
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
      
      <div className="x-axis-labels">
        {chartData.map((monthData, i) => (
          <div key={i} className="x-label">
            {monthData.monthYear}
          </div>
        ))}
      </div>
      
      <div className="graph-legend">
        {lawyers.map(lawyer => (
          <div key={lawyer.id} className="legend-item">
            <div className="color-swatch" style={{ backgroundColor: lawyerColors[lawyer.id] }}></div>
            <span style={{ color: 'black' }}>{lawyer.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LineChart;