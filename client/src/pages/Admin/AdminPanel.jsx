import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { logEvent } from "firebase/analytics";
import { db, analytics } from "../../services/firebase";

// Components
import Header from "../../components/Layout/Header";
import LineChart from "../../components/Charts/LineChart";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Loading from "../../components/UI/Loading";

const AdminPanel = ({ user, onLogout }) => {
  const [lawyers, setLawyers] = useState([]);
  const [adminLawFirm, setAdminLawFirm] = useState("");
  const [appointmentData, setAppointmentData] = useState({
    chartData: [],
    lawyerColors: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLawyers: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0
  });
  const navigate = useNavigate();

  // Fetch admin law firm name
  useEffect(() => {
    const adminRef = ref(db, "law_firm_admin/" + user.uid);
    onValue(adminRef, (snapshot) => {
      if (snapshot.exists()) {
        setAdminLawFirm(snapshot.val().lawFirm);
        if (analytics) {
          logEvent(analytics, "admin_dashboard_view", { admin_id: user.uid });
        }
      }
    });
  }, [user]);

  // Fetch lawyers for this admin
  useEffect(() => {
    if (user.uid) {
      setIsLoading(true);
      const lawyersRef = ref(db, "lawyers");
      onValue(lawyersRef, (snapshot) => {
        if (snapshot.exists()) {
          // Filter lawyers by adminUID instead of lawFirm
          const filteredLawyers = Object.entries(snapshot.val())
            .map(([id, lawyer]) => ({
              id,
              ...lawyer
            }))
            .filter((lawyer) => lawyer.adminUID === user.uid);
          
          setLawyers(filteredLawyers);
          setStats(prev => ({
            ...prev,
            totalLawyers: filteredLawyers.length
          }));
          
          if (analytics) {
            logEvent(analytics, "lawyers_list_loaded", { 
              admin_id: user.uid, 
              count: filteredLawyers.length 
            });
          }
        } else {
          setLawyers([]);
          setStats(prev => ({
            ...prev,
            totalLawyers: 0
          }));
        }
        setIsLoading(false);
      });
    }
  }, [user.uid]);

  // Helper function to parse date string in MM/DD/YYYY format
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Parse date in MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const month = parseInt(parts[0], 10) - 1; // 0-indexed months
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    return new Date(year, month, day);
  };

  // Fetch appointments data and process it for the chart
  useEffect(() => {
    if (lawyers.length > 0) {
      const appointmentsRef = ref(db, "appointments");
      
      // Listen for changes to appointments data
      onValue(appointmentsRef, (snapshot) => {
        // Reset counters
        let totalCount = 0;
        let pendingCount = 0;
        let completedCount = 0;
        
        // Create data structure for monthly appointments
        const appointmentsByMonth = {};
        const lawyerColors = {};
        
        // Assign unique colors to each lawyer
        lawyers.forEach((lawyer, index) => {
          // Generate different colors using golden ratio for better distribution
          const hue = (index * 137.5) % 360;
          lawyerColors[lawyer.id] = `hsl(${hue}, 70%, 50%)`;
        });
        
        if (snapshot.exists()) {
          const appointmentsData = snapshot.val();
          
          // Process each appointment
          Object.entries(appointmentsData).forEach(([id, appointment]) => {
            // Make sure the appointment has a lawyerId and it belongs to one of our lawyers
            if (!appointment.lawyerId) return;
            
            const lawyerExists = lawyers.some(lawyer => lawyer.id === appointment.lawyerId);
            if (!lawyerExists) return;
            
            // Count total appointments
            totalCount++;
            
            // Count by status (note: checking for both lowercase and capitalized status)
            if (appointment.status === 'pending' || appointment.status === 'Pending') {
              pendingCount++;
            } else if (appointment.status === 'completed' || appointment.status === 'Completed') {
              completedCount++;
            }
            
            // Group by month for the chart
            if (appointment.date) {
              // Parse date from string format MM/DD/YYYY
              const appointmentDate = parseDate(appointment.date);
              if (!appointmentDate) return; // Skip if date parsing failed
              
              const monthYear = `${appointmentDate.getMonth() + 1}/${appointmentDate.getFullYear()}`;
              
              // Initialize the month if it doesn't exist
              if (!appointmentsByMonth[monthYear]) {
                appointmentsByMonth[monthYear] = {
                  monthYear,
                  sortDate: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), 1)
                };
                
                // Initialize count for each lawyer
                lawyers.forEach(lawyer => {
                  appointmentsByMonth[monthYear][lawyer.id] = 0;
                });
              }
              
              // Increment the count for this lawyer in this month
              appointmentsByMonth[monthYear][appointment.lawyerId]++;
            }
          });
        }
        
        // Update appointment statistics
        setStats(prev => ({
          ...prev,
          totalAppointments: totalCount,
          pendingAppointments: pendingCount,
          completedAppointments: completedCount
        }));
        
        // Sort appointments by date for chart display
        const chartData = Object.values(appointmentsByMonth)
          .sort((a, b) => a.sortDate - b.sortDate);
        
        // Update appointment data for the chart
        setAppointmentData({
          chartData,
          lawyerColors
        });
        
        // Log analytics event
        if (analytics) {
          logEvent(analytics, "appointment_data_loaded", {
            total_appointments: totalCount
          });
        }
      });
    } else {
      // Reset data if no lawyers
      setAppointmentData({
        chartData: [],
        lawyerColors: {}
      });
      
      setStats(prev => ({
        ...prev,
        totalAppointments: 0,
        pendingAppointments: 0,
        completedAppointments: 0
      }));
    }
  }, [lawyers]);

  const handleAddLawyer = () => {
    navigate("/lawyers/add");
    if (analytics) logEvent(analytics, "navigate", { destination: "Add Lawyer" });
  };

  const handleEditLawyer = (lawyerId) => {
    navigate(`/lawyers/edit/${lawyerId}`);
    if (analytics) logEvent(analytics, "edit_lawyer", { lawyer_id: lawyerId });
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <Header user={user} onLogout={onLogout} />
        <div className="app-content">
          <Loading message="Loading dashboard data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header user={user} onLogout={onLogout} />
      
      <main className="app-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
          <Button 
            variant="primary" 
            icon="add"
            onClick={handleAddLawyer}
          >
            Add New Lawyer
          </Button>
        </div>
        
        <div className="stats-cards">
          <Card className="stat-card lawyers-icon">
            <div className="stat-content">
              <h3 className="stat-title">TOTAL LAWYERS</h3>
              <p className="stat-value">{stats.totalLawyers}</p>
            </div>
          </Card>
          
          <Card className="stat-card appointments-icon">
            <div className="stat-content">
              <h3 className="stat-title">TOTAL APPOINTMENTS</h3>
              <p className="stat-value">{stats.totalAppointments}</p>
            </div>
          </Card>
          
          <Card className="stat-card pending-icon">
            <div className="stat-content">
              <h3 className="stat-title">PENDING APPOINTMENTS</h3>
              <p className="stat-value">{stats.pendingAppointments}</p>
            </div>
          </Card>
          
          <Card className="stat-card completed-icon">
            <div className="stat-content">
              <h3 className="stat-title">COMPLETED APPOINTMENTS</h3>
              <p className="stat-value">{stats.completedCount}</p>
            </div>
          </Card>
        </div>
        
        <div className="dashboard-grid">
          <Card 
            title="Lawyers" 
            className="lawyers-card"
          >
            <div className="lawyers-list">
              {lawyers.length > 0 ? (
                <ul>
                  {lawyers.map((lawyer) => (
                    <li key={lawyer.id} className="lawyer-item">
                      <div className="lawyer-info">
                        <div className="lawyer-avatar">
                          {lawyer.profileImage ? (
                            <img src={lawyer.profileImage} alt={lawyer.name} />
                          ) : (
                            <span>{lawyer.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="lawyer-details">
                          <h3 className="lawyer-name">{lawyer.name}</h3>
                          <p className="lawyer-specialization">{lawyer.specialization || "No specialization"}</p>
                        </div>
                      </div>
                      
                      <Button 
                        variant="secondary"
                        onClick={() => handleEditLawyer(lawyer.id)}
                        icon="edit"
                      >
                        Manage
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon lawyer-empty-icon"></div>
                  <p>No lawyers found for this admin.</p>
                  <Button 
                    variant="primary" 
                    icon="add"
                    onClick={handleAddLawyer}
                  >
                    Add Your First Lawyer
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card 
            title="Appointments & Analytics" 
            className="analytics-card"
          >
            <div className="appointment-analytics">
              {lawyers.length > 0 ? (
                appointmentData.chartData && appointmentData.chartData.length > 0 ? (
                  <LineChart 
                    chartData={appointmentData.chartData} 
                    lawyerColors={appointmentData.lawyerColors}
                    lawyers={lawyers}
                  />
                ) : (
                  <div className="empty-state">
                    <div className="analytics-empty-icon"></div>
                    <p>No appointment data available yet.</p>
                  </div>
                )
              ) : (
                <div className="empty-state">
                  <div className="analytics-empty-icon"></div>
                  <p>Add lawyers to view appointment analytics.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;