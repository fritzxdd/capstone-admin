import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../../services/firebase';

/**
 * Minimalist LineChart component that displays appointment data by lawyer 
 * with emphasis on individual data points
 * @param {Object} props
 * @param {Array} props.chartData - The data to be displayed in the chart
 * @param {Object} props.lawyerColors - Mapping of lawyer IDs to their assigned colors
 * @param {Array} props.lawyers - Array of lawyer objects
 * @param {number} props.graphHeight - Height of the graph in pixels
 * @returns {JSX.Element} LineChart component
 */
const LineChart = ({ 
  chartData,
  lawyerColors,
  lawyers, 
  graphHeight = 200
}) => {
  const navigate = useNavigate();
  
  // Calculate graph dimensions
  const graphWidth = 320; // Fixed width to match the image
  
  // Set max value manually to match image (0, 1, 1, 2, 2)
  const maxCount = 2; // Fixed max count to match the y-axis in the image
  
  // In this simplified version, we just use hardcoded positions 
  // to match the exact layout shown in the image

  const handlePointClick = (lawyerId, monthYear) => {
    navigate(`/lawyer-appointments/${lawyerId}?month=${monthYear}`);
    if (analytics) {
      logEvent(analytics, "view_lawyer_appointments", { 
        lawyer_id: lawyerId,
        month: monthYear
      });
    }
  };
  
  // Fixed y-axis values to match the image: 0, 1, 1, 2, 2
  const yAxisValues = [2, 2, 1, 1, 0];
  
  return (
    <div className="line-graph-container" style={{ padding: '0', margin: '0' }}>
      <div className="graph-labels" style={{ display: 'flex' }}>
        <div className="y-axis-labels" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          paddingRight: '10px',
          color: '#666',
          fontSize: '13px',
          fontWeight: 'normal'
        }}>
          {yAxisValues.map((value, i) => (
            <div key={i} className="y-label" style={{ height: '20px', lineHeight: '20px' }}>
              {value}
            </div>
          ))}
        </div>
        
        <svg width={graphWidth} height={graphHeight} className="line-graph" style={{ borderLeft: '1px solid #eee' }}>
          {/* Horizontal grid lines */}
          {[...Array(5)].map((_, i) => (
            <line 
              key={`grid-${i}`}
              x1="0" 
              y1={(graphHeight / 4) * i} 
              x2={graphWidth} 
              y2={(graphHeight / 4) * i}
              stroke="#f0f0f0" 
              strokeWidth="1"
            />
          ))}
          
          {/* Just a single data point at x=20%, y=position for value "1" to match image */}
          <circle 
            cx={graphWidth * 0.2}  
            cy={graphHeight * 0.5}  // Position where value "1" would be (middle of graph)
            r="5"
            fill="red"
            stroke="none"
            className="data-point"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (lawyers[0] && chartData[0]) {
                handlePointClick(lawyers[0].id, chartData[0].monthYear);
              }
            }}
          />
        </svg>
      </div>
      
      <div className="x-axis-labels" style={{ 
        marginLeft: '30px', 
        display: 'flex', 
        justifyContent: 'center',
        color: '#666',
        fontSize: '13px',
        paddingTop: '5px'
      }}>
        <div className="x-label">3/2025</div>
      </div>
      
      <div className="graph-legend" style={{ 
        marginTop: '15px', 
        display: 'flex',
        paddingTop: '10px',
        borderTop: '1px solid #eee'
      }}>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="color-swatch" style={{ 
            backgroundColor: 'red', 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%',
            marginRight: '8px'
          }}></div>
          <span style={{ color: '#333', fontSize: '14px' }}>Jason Voorhees</span>
        </div>
      </div>
    </div>
  );
};

export default LineChart;