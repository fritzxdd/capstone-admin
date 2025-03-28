import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import { ref, onValue } from "firebase/database";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

// Components
import Header from "../../components/Layout/Header";
import LineChart from "../../components/Charts/LineChart";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Button from "../../components/UI/Button";

const AdminPanel = ({ onLogout }) => {
  const [lawyers, setLawyers] = useState([]);
  const [adminLawFirm, setAdminLawFirm] = useState("");
  const [appointmentData, setAppointmentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const adminRef = ref(db, "law_firm_admin/" + currentUser.uid);
    onValue(adminRef, (snapshot) => {
      if (snapshot.exists()) {
        setAdminLawFirm(snapshot.val().lawFirm);
        if (analytics) {
          logEvent(analytics, "admin_dashboard_view", { admin_id: currentUser.uid });
        }
      }
    });
  }, [currentUser]);

  useEffect(() => {
    if (adminLawFirm) {
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
          if (analytics) {
            logEvent(analytics, "lawyers_list_loaded", { law_firm: adminLawFirm, count: filteredLawyers.length });
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

  const handleEditLawyer = (lawyerId) => {
    navigate(`/lawyers/edit/${lawyerId}`);
    if (analytics) logEvent(analytics, "edit_lawyer", { lawyer_id: lawyerId });
  };

  if (isLoading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <div className="admin-dashboard">
      <Header user={currentUser} onLogout={onLogout} />

      <div className="admin-content">
        <Card 
          title="View Lawyers" 
          className="view-lawyers"
          contentClassName="lawyer-list-container"
        >
          {lawyers.length > 0 ? (
            <ul>
              {lawyers.map((lawyer) => (
                <li key={lawyer.id}>
                  <Button 
                    variant="primary"
                    className="lawyer-button" 
                    onClick={() => handleEditLawyer(lawyer.id)}
                  >
                    {lawyer.name} - {lawyer.specialization}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No lawyers found in your law firm.</p>
          )}
        </Card>

        <Card title="Appointments & Analytics" className="analytics">
          <div className="lawyer-appointments">
            {lawyers.length > 0 ? (
              appointmentData.chartData ? (
                <LineChart 
                  chartData={appointmentData.chartData} 
                  lawyerColors={appointmentData.lawyerColors}
                  lawyers={lawyers}
                />
              ) : (
                <p>Loading appointment data...</p>
              )
            ) : (
              <p>No lawyers found in your law firm.</p>
            )}
          </div>
          
          <div className="analytics-actions">
            <Button 
              variant="primary"
              onClick={() => navigate('/lawyers/add')}
              icon="add"
            >
              Add New Lawyer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;