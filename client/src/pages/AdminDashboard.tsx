import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function AdminDashboard() {
  const { user } = useAuth();

  // Fetch data
  const { data: workers, isLoading: workersLoading } = trpc.workers.list.useQuery();

  const handleTestClick = (action: string, workerName: string) => {
    alert(`NATIVE BUTTON CLICKED: ${action} for ${workerName}`);
  };

  // Check if user is admin
  if (!user || user.role !== "admin") {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        Access Denied. You are logged in as: {user?.name || 'Unknown'} ({user?.role || 'No Role'})
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Admin Debug Dashboard</h1>
      <p style={{ marginBottom: '30px' }}>If you can see this, you are an admin. Try clicking the buttons below.</p>

      {workersLoading ? (
        <p>Loading workers...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {workers?.map((worker) => (
            <div key={worker.id} style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{worker.fullName}</strong> ({worker.role})
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleTestClick('View', worker.fullName)}
                  style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  TEST VIEW
                </button>
                <button 
                  onClick={() => handleTestClick('Edit', worker.fullName)}
                  style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  TEST EDIT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '50px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>System Info:</h3>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </div>
    </div>
  );
}
