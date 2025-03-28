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
  const [appointmentData, setAppointmentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLawyers: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0
  });
  const navigate = useNavigate();

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

  useEffect(() => {
    if (adminLawFirm) {
      setIsLoading(true);
      const lawyersRef = ref(db, "lawyers");
      onValue(lawyersRef, (snapshot) => {
        if (snapshot.exists()) {
          const filteredLawyers = Object.entries(snapshot.val())
            .map(([id, lawyer]) => ({
              id,
              ...lawyer
            }))
            .filter((lawyer) => lawyer.lawFirm === adminLawFirm);
          
          setLawyers(filteredLawyers);
          setStats(prev => ({
            ...prev,
            totalLawyers: filteredLawyers.length
          }));
          
          if (analytics) {
            logEvent(analytics, "lawyers_list_loaded", { 
              law_firm: adminLawFirm, 
              count: filteredLawyers.length 
            });
          }
        }
        setIsLoading(false);
      });
    }
  }, [adminLawFirm]);

  // Fetch appointments data
  useEffect(() => {
    if (lawyers.length > 0) {
      const appointmentsRef = ref(db, "appointments");
      onValue(appointmentsRef, (snapshot) => {
        if (snapshot.exists()) {
          const allAppointments = snapshot.val();
          let totalCount = 0;
          let pendingCount = 0;
          let completedCount = 0;
          
          // Process appointments for the line graph
          const appointmentsByMonth = {};
          const lawyerColors = {};
          
          // Assign colors to lawyers
          lawyers.forEach((lawyer, index) => {
            // Generate different colors for each lawyer
            const hue = (index * 137.5) % 360; // Golden ratio to distribute colors
            lawyerColors[lawyer.id] = `hsl(${hue}, 70%, 50%)`;
          });
          
          // Structure the data for a line graph by month
          Object.entries(allAppointments).forEach(([id, appointment]) => {
            totalCount++;
            
            if (appointment.status === 'pending') {
              pendingCount++;
            } else if (appointment.status === 'completed') {
              completedCount++;
            }
            
            if (appointment.lawyerId && appointment.date) {
              const date = new Date(appointment.date);
              const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
              
              if (!appointmentsByMonth[monthYear]) {
                appointmentsByMonth[monthYear] = {};
                lawyers.forEach(lawyer => {
                  appointmentsByMonth[monthYear][lawyer.id] = 0;
                });
              }
              
              appointmentsByMonth[monthYear][appointment.lawyerId]++;
            }
          });
          
          // Update stats
          setStats(prev => ({
            ...prev,
            totalAppointments: totalCount,
            pendingAppointments: pendingCount,
            completedAppointments: completedCount
          }));
          
          // Convert to array and sort by date
          const chartData = Object.entries(appointmentsByMonth)
            .map(([monthYear, counts]) => {
              const [month, year] = monthYear.split('/');
              return {
                monthYear,
                sortDate: new Date(parseInt(year), parseInt(month) - 1, 1),
                ...counts
              };
            })
            .sort((a, b) => a.sortDate - b.sortDate);
          
          setAppointmentData({
            chartData,
            lawyerColors
          });
          
          if (analytics) {
            logEvent(analytics, "appointment_data_loaded");
          }
        }
      });
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
            <div className="stat-icon lawyers-icon"></div>
            <div className="stat-content">
              <h3 className="stat-title">Total Lawyers</h3>
              <p className="stat-value">{stats.totalLawyers}</p>
            </div>
          </Card>
          
          <Card className="stat-card">
            <div className="stat-icon appointments-icon"></div>
            <div className="stat-content">
              <h3 className="stat-title">Total Appointments</h3>
              <p className="stat-value">{stats.totalAppointments}</p>
            </div>
          </Card>
          
          <Card className="stat-card">
            <div className="stat-icon pending-icon"></div>
            <div className="stat-content">
              <h3 className="stat-title">Pending</h3>
              <p className="stat-value">{stats.pendingAppointments}</p>
            </div>
          </Card>
          
          <Card className="stat-card">
            <div className="stat-icon completed-icon"></div>
            <div className="stat-content">
              <h3 className="stat-title">Completed</h3>
              <p className="stat-value">{stats.completedAppointments}</p>
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
                          <p className="lawyer-specialization">{lawyer.specialization}</p>
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
                  <p>No lawyers found in your law firm.</p>
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
                    <div className="empty-icon analytics-empty-icon"></div>
                    <p>No appointment data available yet.</p>
                  </div>
                )
              ) : (
                <div className="empty-state">
                  <div className="empty-icon analytics-empty-icon"></div>
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