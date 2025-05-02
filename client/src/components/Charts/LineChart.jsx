// Updated LineChart component to work with your existing appointment data structure
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../../services/firebase';

/**
 * LineChart component to display appointments by lawyer over time
 * Works with the existing Firebase appointments data structure
 */
const LineChart = ({ 
  chartData,
  lawyerColors,
  lawyers = [], 
  graphHeight = 200
}) => {
  const navigate = useNavigate();
  
  // Calculate graph dimensions
  const graphWidth = 320;
  
  // Find maximum value for y-axis based on actual data
  const maxValue = chartData && chartData.length > 0 
    ? Math.max(
        ...chartData.flatMap(dataPoint => 
          Object.entries(dataPoint)
            .filter(([key]) => key !== 'monthYear' && key !== 'sortDate')
            .map(([_, value]) => value || 0)
        ),
        2 // Minimum of 2 for better visualization
      )
    : 2;
  
  // Create y-axis values
  const yAxisValues = [];
  for (let i = maxValue; i >= 0; i--) {
    yAxisValues.push(i);
  }
  
  const handlePointClick = (lawyerId, monthYear) => {
    navigate(`/lawyer-appointments/${lawyerId}?month=${monthYear}`);
    if (analytics) {
      logEvent(analytics, "view_lawyer_appointments", { 
        lawyer_id: lawyerId,
        month: monthYear
      });
    }
  };
  
  // No data to display
  if (!chartData || chartData.length === 0 || !lawyers || lawyers.length === 0) {
    return (
      <div className="empty-state">
        <div className="analytics-empty-icon"></div>
        <h3>No appointment data available</h3>
        <p>Once appointments are scheduled, they will appear here</p>
      </div>
    );
  }
  
  return (
    <div className="line-graph-container">
      <div className="graph-labels" style={{ display: 'flex' }}>
        <div className="y-axis-labels" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          paddingRight: '10px',
          color: '#666',
          fontSize: '13px',
          fontWeight: 'normal',
          height: graphHeight
        }}>
          {yAxisValues.map((value, i) => (
            <div key={i} className="y-label" style={{ height: '20px', lineHeight: '20px' }}>
              {value}
            </div>
          ))}
        </div>
        
        <svg width={graphWidth} height={graphHeight} className="line-graph" style={{ borderLeft: '1px solid #eee' }}>
          {/* Horizontal grid lines */}
          {yAxisValues.map((_, i) => (
            <line 
              key={`grid-${i}`}
              x1="0" 
              y1={(graphHeight / yAxisValues.length) * i} 
              x2={graphWidth} 
              y2={(graphHeight / yAxisValues.length) * i}
              stroke="#f0f0f0" 
              strokeWidth="1"
            />
          ))}
          
          {/* Plot data points for each lawyer */}
          {chartData.map((dataPoint, dataIndex) => {
            // Calculate x position based on number of data points
            const xPosition = (graphWidth / (chartData.length + 1)) * (dataIndex + 1);
            
            return lawyers.map(lawyer => {
              // Skip if no data for this lawyer
              if (dataPoint[lawyer.id] === undefined) return null;
              
              // Get count for this lawyer
              const count = dataPoint[lawyer.id] || 0;
              if (count <= 0) return null;
              
              // Calculate y position (invert because SVG y-axis goes down)
              const yPosition = graphHeight - (count / maxValue) * graphHeight;
              
              // Get color for this lawyer or generate one
              const color = lawyerColors[lawyer.id] || `hsl(${(lawyers.indexOf(lawyer) * 137.5) % 360}, 70%, 50%)`;
              
              return (
                <circle 
                  key={`point-${dataIndex}-${lawyer.id}`}
                  cx={xPosition}
                  cy={yPosition}
                  r="5"
                  fill={color}
                  stroke="white"
                  strokeWidth="1"
                  className="data-point"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePointClick(lawyer.id, dataPoint.monthYear)}
                />
              );
            }).filter(Boolean); // Filter out null values
          })}
        </svg>
      </div>
      
      <div className="x-axis-labels" style={{ 
        marginLeft: '30px', 
        display: 'flex', 
        justifyContent: 'space-around',
        width: graphWidth,
        color: '#666',
        fontSize: '13px',
        paddingTop: '5px'
      }}>
        {chartData.map((data, i) => (
          <div key={i} className="x-label">{data.monthYear}</div>
        ))}
      </div>
      
      <div className="graph-legend" style={{ 
        marginTop: '15px', 
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #eee'
      }}>
        {lawyers.map(lawyer => {
          const color = lawyerColors[lawyer.id] || `hsl(${(lawyers.indexOf(lawyer) * 137.5) % 360}, 70%, 50%)`;
          return (
            <div key={`legend-${lawyer.id}`} className="legend-item" style={{ display: 'flex', alignItems: 'center' }}>
              <div className="color-swatch" style={{ 
                backgroundColor: color, 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%',
                marginRight: '8px'
              }}></div>
              <span style={{ color: '#333', fontSize: '14px' }}>{lawyer.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LineChart;